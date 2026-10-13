import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveContext, formatContextForPrompt } from '@/lib/retrieval';

const SYSTEM_PROMPT = `You are the GCC Atlas Research Copilot for evaluating Global Capability Centres (GCCs) in India.

Answer only from the retrieved GCC Atlas evidence. Never claim live browsing or independent real-time verification. Keep answers concise and decision-useful. Cite every factual policy, incentive, metric, date, or company claim using only source IDs present in the supplied context (for example, [src-005]). Do not invent figures, sources, or details. When the dataset is incomplete, say what is unknown and suggest the next validation step. If useful, distinguish verified facts from directional estimates or assumptions. Stay within Indian GCCs, city evaluation, talent, real estate, costs, and state policies. Use clean Markdown; never raw HTML.`;

// Practical in-memory sliding-window rate limiter for single-instance protection.
// NOTE: For multi-instance / serverless production (e.g. Vercel Serverless / Edge),
// use an external distributed store like Upstash Redis (@upstash/ratelimit) or
// Vercel Edge Middleware / WAF rate limiting rules.
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const responseCache = new Map<string, { expiresAt: number; response: string }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1-minute window
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute per IP
const RESPONSE_CACHE_TTL_MS = 3 * 60 * 1000;
const MODEL_CACHE_TTL_MS = 30 * 60 * 1000;
let availableModelCache: { expiresAt: number; models: string[] } | null = null;

const STATIC_MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

function normalizeModelName(name: string): string {
  return name.replace(/^models\//, '');
}

function isTextGenerationModel(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes('flash') && !/(image|audio|tts|live|embedding)/.test(normalized);
}

function modelPreference(name: string): number {
  if (name.includes('2.5-flash-lite')) return 0;
  if (name.includes('flash-lite')) return 1;
  if (name.includes('2.5-flash')) return 2;
  return 3;
}

async function getAvailableModels(apiKey: string): Promise<string[]> {
  if (availableModelCache && availableModelCache.expiresAt > Date.now()) {
    return availableModelCache.models;
  }

  try {
    const response = await withTimeout(
      fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': apiKey },
      }),
      5000,
      'Gemini model discovery timed out'
    );
    if (!response.ok) throw new Error(`Gemini model discovery returned ${response.status}`);

    const payload = await response.json() as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const models = (payload.models ?? [])
      .filter(model => model.name && model.supportedGenerationMethods?.includes('generateContent'))
      .map(model => normalizeModelName(model.name!))
      .filter(isTextGenerationModel)
      .sort((a, b) => modelPreference(a) - modelPreference(b));

    if (models.length > 0) {
      availableModelCache = { models, expiresAt: Date.now() + MODEL_CACHE_TTL_MS };
    }
    return models;
  } catch (error) {
    console.warn('Gemini model discovery was unavailable:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

function checkRateLimit(clientIp: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
} {
  const now = Date.now();
  if (rateLimitStore.size > 10000) {
    for (const [ip, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(ip);
      }
    }
  }

  const record = rateLimitStore.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return {
      allowed: true,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      allowed: false,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: 0,
      resetSeconds,
    };
  }

  record.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
  return {
    allowed: true,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetSeconds,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function POST(request: NextRequest) {
  // 1. Client IP & Rate Limiting
  const forwardedHeader = request.headers.get('x-forwarded-for');
  const clientIp = forwardedHeader
    ? forwardedHeader.split(',')[0].trim()
    : request.headers.get('x-real-ip') || '127.0.0.1';

  const rateLimit = checkRateLimit(clientIp);
  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetSeconds),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please wait ${rateLimit.resetSeconds} seconds before submitting more research queries.`,
        type: 'rate_limit_exceeded',
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(rateLimit.resetSeconds),
        },
      }
    );
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'API key not configured',
          message: 'The Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable. The rest of GCC Atlas works without it — only the AI Copilot requires an API key.',
          type: 'missing_api_key',
        },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    // 2. Request body parsing & validation
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Request body must be an object.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const { message, conversationHistory } = body as {
      message?: unknown;
      conversationHistory?: unknown;
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Message is required and must be a string.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json(
        { error: 'Empty message', message: 'Message cannot be empty or solely whitespace.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (trimmedMessage.length > 2000) {
      return NextResponse.json(
        {
          error: 'Message too long',
          message: 'Message exceeds the maximum limit of 2,000 characters. Please condense your query.',
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Validate and sanitize conversation history (protect token window)
    let sanitizedHistory: { role: 'user' | 'model'; parts: [{ text: string }] }[] = [];
    if (Array.isArray(conversationHistory)) {
      sanitizedHistory = conversationHistory
        .slice(-6) // Keep enough conversational continuity without excess prompt latency
        .filter((msg): msg is { role: string; content: string } =>
          typeof msg === 'object' &&
          msg !== null &&
          typeof msg.role === 'string' &&
          typeof msg.content === 'string' &&
          (msg.role === 'user' || msg.role === 'assistant')
        )
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content.slice(0, 1200) }],
        }));
    }

    // 3. Retrieve relevant context from curated dataset
    const context = retrieveContext(trimmedMessage, 5);
    const contextText = formatContextForPrompt(context);

    const cacheKey = JSON.stringify({
      message: trimmedMessage.toLowerCase(),
      history: sanitizedHistory.map(({ role, parts }) => [role, parts[0].text]),
    });
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(
        { response: cached.response, sources: context.sources, retrievalNotes: context.relevanceNotes, cached: true },
        { headers: rateLimitHeaders }
      );
    }

    // 4. Discover models available to this key, then prefer a fast text model.
    // This prevents a retired hard-coded fallback from breaking the Copilot.
    const discoveredModels = await getAvailableModels(apiKey);
    const preferredModels = [process.env.GEMINI_MODEL, ...STATIC_MODEL_FALLBACKS]
      .filter(Boolean)
      .map(model => normalizeModelName(model!));
    const candidateModels = discoveredModels.length > 0
      ? Array.from(new Set([
          ...preferredModels.filter(model => discoveredModels.includes(model)),
          ...discoveredModels,
        ]))
      : Array.from(new Set(preferredModels));

    const prompt = `${contextText}\n\n--- USER QUESTION ---\n${trimmedMessage}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError: unknown = null;
    let text: string | null = null;
    let allModelsUnavailable = candidateModels.length > 0;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
        });

        const chat = model.startChat({
          history: sanitizedHistory,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 900,
          },
        });

        const result = await withTimeout(
          chat.sendMessage(prompt),
          18000,
          `Gemini request timed out after 18s for model ${modelName}`
        );
        const response = result.response;
        text = response.text();
        if (text) {
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : '';
        console.warn(`Gemini model ${modelName} encountered error:`, errMsg);

        if (!/(404|not found|not supported)/i.test(errMsg)) {
          allModelsUnavailable = false;
        }

        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
          throw err;
        }
      }
    }

    if (!text) {
      if (allModelsUnavailable) {
        throw new Error('No compatible Gemini text model is available for this API key. Set GEMINI_MODEL to a currently available model from Google AI Studio.');
      }
      throw lastError || new Error('All available Gemini models are currently busy. Please try again.');
    }

    if (responseCache.size > 200) {
      for (const [key, value] of responseCache) {
        if (value.expiresAt <= Date.now()) responseCache.delete(key);
      }
    }
    responseCache.set(cacheKey, { response: text, expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS });

    return NextResponse.json(
      {
        response: text,
        sources: context.sources,
        retrievalNotes: context.relevanceNotes,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error: unknown) {
    console.error('Copilot API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        {
          error: 'Invalid API key',
          message: 'The Gemini API key appears to be invalid. Please check your GEMINI_API_KEY environment variable.',
          type: 'invalid_api_key',
        },
        { status: 401, headers: rateLimitHeaders }
      );
    }

    if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('timed out')) {
      return NextResponse.json(
        {
          error: 'Model busy',
          message: 'Google Gemini is currently experiencing a temporary demand spike or latency. Please try your question again in a moment.',
          type: 'high_demand',
        },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      {
        error: 'Copilot error',
        message: `The AI copilot encountered an error: ${errorMessage}. Please try again.`,
        type: 'provider_error',
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
