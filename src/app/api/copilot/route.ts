import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveContext, formatContextForPrompt } from '@/lib/retrieval';

const SYSTEM_PROMPT = `You are the GCC Atlas Research Copilot — an evidence-grounded AI research assistant helping international companies research, evaluate, and plan Global Capability Centres (GCCs) in India.

CRITICAL OPERATIONAL RULES:
1. STRICT CURATED DATASET GROUNDING:
   - You ONLY answer based on the retrieved evidence provided from the GCC Atlas curated dataset.
   - You DO NOT search the live internet or browse live websites. NEVER claim or imply you performed live web searches or real-time verification.
2. SCOPE:
   - You only answer questions related to GCCs in India, city evaluation (Bengaluru, Hyderabad, Pune), engineering talent, real estate, costs, and state government policies.
   - If a question is outside this domain, politely state that it is beyond GCC Atlas's scope.
3. EVIDENCE REQUIREMENTS FOR POLICIES, INCENTIVES & METRICS:
   - Specific policy claims, incentive amounts, tax exemptions, subsidies, targets, dates, and deadlines REQUIRE evidence.
   - You MUST cite the supporting source ID for every claim (e.g., [src-005] for Karnataka GCC Policy, [src-006] for Telangana IT Policy).
   - NEVER invent or extrapolate incentive amounts, subsidies, or tax figures that are not explicitly documented in the retrieved evidence.
4. RIGOROUS INFORMATION CLASSIFICATION:
   Every comprehensive answer must explicitly distinguish between:
   - VERIFIED FACTS: Information directly established and confirmed by the provided evidence sources (cite source IDs, e.g., [src-005]).
   - ESTIMATES: Directional metrics, scores, or approximate figures derived from reports.
   - ASSUMPTIONS: Plausible conclusions that lack direct empirical evidence in the dataset.
   - UNKNOWNS / GAPS: Relevant information that is NOT present in the dataset.
5. EXPLICIT ACKNOWLEDGEMENT OF GAPS:
   - When the available dataset does not support a claim, or lacks data for a city, company, metric, or policy, you MUST EXPLICITLY state that the GCC Atlas dataset does not contain this information.
   - NEVER invent or extrapolate facts to fill gaps. State what is known versus unknown, and suggest what specific investigation the user should perform independently.
6. INDEPENDENT VERIFICATION HONESTY:
   - Do NOT claim that information was independently verified unless the provided evidence source notes explicitly state that independent verification was conducted.
7. CITATION INTEGRITY:
   - ONLY cite source IDs that exist in the provided evidence context (e.g., [src-001], [src-005]).
   - NEVER invent imaginary source IDs.
   - Use clean inline citations like [src-005].
8. FORMATTING:
   - Format responses using clean Markdown with headings (##, ###), bullet points, and bold text.
   - Do NOT output raw HTML tags.`;

// Practical in-memory sliding-window rate limiter for single-instance protection.
// NOTE: For multi-instance / serverless production (e.g. Vercel Serverless / Edge),
// use an external distributed store like Upstash Redis (@upstash/ratelimit) or
// Vercel Edge Middleware / WAF rate limiting rules.
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1-minute window
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute per IP

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
        .slice(-10) // Limit to last 10 messages
        .filter((msg): msg is { role: string; content: string } =>
          typeof msg === 'object' &&
          msg !== null &&
          typeof msg.role === 'string' &&
          typeof msg.content === 'string' &&
          (msg.role === 'user' || msg.role === 'assistant')
        )
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content.slice(0, 4000) }],
        }));
    }

    // 3. Retrieve relevant context from curated dataset
    const context = retrieveContext(trimmedMessage, 8);
    const contextText = formatContextForPrompt(context);

    // 4. Candidate models with valid model identifiers
    const candidateModels = Array.from(
      new Set(
        [
          process.env.GEMINI_MODEL,
          'gemini-flash-latest',
          'gemini-flash-lite-latest',
          'gemini-2.0-flash',
          'gemini-1.5-flash',
        ].filter(Boolean) as string[]
      )
    );

    const prompt = `${contextText}\n\n--- USER QUESTION ---\n${trimmedMessage}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError: unknown = null;
    let text: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
        });

        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: 'You are the GCC Atlas Research Copilot. Acknowledge and follow these instructions.' }] },
            { role: 'model', parts: [{ text: 'I understand. I am the GCC Atlas Research Copilot. I will follow all rules about citing sources, distinguishing verified facts from estimates and unknowns, and never inventing information.' }] },
            ...sanitizedHistory,
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        });

        const result = await withTimeout(
          chat.sendMessage(prompt),
          25000,
          `Gemini request timed out after 25s for model ${modelName}`
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

        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
          throw err;
        }
      }
    }

    if (!text) {
      throw lastError || new Error('All available Gemini models are currently busy. Please try again.');
    }

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
