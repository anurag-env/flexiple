'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  AlertCircle,
  ExternalLink,
  Loader2,
  Info,
  Sparkles,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  Bot,
  User,
} from 'lucide-react';
import { ChatMessage, EvidenceSource } from '@/types';
import { evidenceSources } from '@/data';

// Global lookup map of all verified evidence sources in the GCC Atlas dataset
const GLOBAL_SOURCE_MAP = new Map<string, EvidenceSource>(
  evidenceSources.map(s => [s.id, s])
);

const starterQuestions = [
  'What government incentives should I investigate before setting up a GCC in Bengaluru or Hyderabad?',
  'What evidence supports choosing Hyderabad over Pune for an engineering hub?',
  'Which companies operate engineering centres in Bengaluru?',
  'Compare the GCC ecosystems of Bengaluru and Hyderabad with citations',
  'What industries are well-represented among GCCs in Pune?',
  'What are the tax breaks and GCC policies in Chennai?', // Intentionally unrepresented city to test gap handling
];

/**
 * Pre-processes assistant markdown to convert internal citation references [src-xxx]
 * into custom Markdown links or flags for unavailable references.
 * Preserves standard markdown links like [Title](url).
 */
function processCitationsInMarkdown(text: string, sourceMap: Map<string, EvidenceSource>): string {
  return text.replace(
    /\[((?:src-[a-zA-Z0-9_-]+)(?:\s*[,;]\s*src-[a-zA-Z0-9_-]+)*)\](?!\()/g,
    (_match, idsStr) => {
      const ids = idsStr.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
      return ids
        .map((id: string) => {
          if (sourceMap.has(id)) {
            return `[${id}](citation:${id})`;
          } else {
            return `[${id}](citation-unavailable:${id})`;
          }
        })
        .join(' ');
    }
  );
}

/**
 * Extracts all source IDs mentioned in a response and separates them into
 * verified vs unavailable IDs.
 */
function extractReferencedSourceIds(
  text: string,
  sourceMap: Map<string, EvidenceSource>
): { citedIds: string[]; unavailableIds: string[] } {
  const allMatches = text.match(/src-[a-zA-Z0-9_-]+/g) || [];
  const uniqueIds = Array.from(new Set(allMatches));
  const citedIds: string[] = [];
  const unavailableIds: string[] = [];

  for (const id of uniqueIds) {
    if (sourceMap.has(id)) {
      citedIds.push(id);
    } else {
      unavailableIds.push(id);
    }
  }

  return { citedIds, unavailableIds };
}

/**
 * Custom Markdown Renderer for assistant messages
 * Renders headings, lists, bold text, and safe external links.
 * Converts [src-xxx] citations into clickable badges opening verified sources.
 * Flags unresolvable sources as unavailable.
 * Never renders raw model-generated HTML directly.
 */
function AssistantMarkdown({
  content,
  sourceMap,
}: {
  content: string;
  sourceMap: Map<string, EvidenceSource>;
}) {
  const processedContent = useMemo(() => {
    return processCitationsInMarkdown(content, sourceMap);
  }, [content, sourceMap]);

  return (
    <div className="chat-markdown text-sm text-navy-800 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="text-xl font-bold text-navy-950 mt-4 mb-2 pb-1 border-b border-navy-150 first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="text-lg font-bold text-navy-900 mt-4 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-base font-semibold text-navy-900 mt-3 mb-1.5 first:mt-0">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5 className="text-sm font-semibold text-navy-900 mt-2 mb-1 first:mt-0">
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="text-sm text-navy-800 leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 mb-3 text-sm text-navy-800">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-3 text-sm text-navy-800">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-navy-950">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-navy-850">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent-500 pl-3.5 my-2.5 text-navy-700 italic bg-navy-50/60 py-1.5 rounded-r">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-4 border-navy-150" />
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-navy-100 text-navy-900 border border-navy-200">
                {children}
              </code>
            ) : (
              <code className="block p-3 rounded-lg bg-navy-950 text-navy-100 text-xs font-mono overflow-x-auto my-2.5">
                {children}
              </code>
            );
          },
          a: ({ href, children }) => {
            // Internal verified citation link
            if (href?.startsWith('citation:')) {
              const sourceId = href.replace('citation:', '');
              const source = sourceMap.get(sourceId);
              if (source) {
                return (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${source.title} (${source.publisher}) — Click to view verified source`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-accent-50 text-accent-700 hover:bg-accent-100 hover:text-accent-800 border border-accent-200 transition-colors align-baseline no-underline font-mono"
                  >
                    <span>[{source.id}]</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                  </a>
                );
              }
            }

            // Unresolved / unavailable source reference
            if (href?.startsWith('citation-unavailable:')) {
              const sourceId = href.replace('citation-unavailable:', '');
              return (
                <span
                  title={`Source [${sourceId}] is unavailable in the GCC Atlas dataset`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 align-baseline cursor-help font-mono"
                >
                  <span>[{sourceId}: Source unavailable]</span>
                </span>
              );
            }

            // Safe external Markdown link
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-600 hover:text-accent-700 underline underline-offset-2 font-medium inline-flex items-center gap-1 break-all"
              >
                <span>{children}</span>
                <ExternalLink className="w-3 h-3 shrink-0 inline opacity-70" />
              </a>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Compact Sources Section below each assistant response.
 * Displays title, publisher, and verified links for cited and retrieved sources.
 * Flags any unresolved references clearly. Never fabricates metadata.
 */
function AssistantSourcesSection({
  sources,
  referencedIds,
  unavailableIds,
  sourceMap,
}: {
  sources?: EvidenceSource[];
  referencedIds: string[];
  unavailableIds: string[];
  sourceMap: Map<string, EvidenceSource>;
}) {
  const displayedSources: EvidenceSource[] = useMemo(() => {
    const list: EvidenceSource[] = [];
    const seen = new Set<string>();

    // 1. First include sources cited directly in the answer text
    for (const id of referencedIds) {
      const src = sourceMap.get(id);
      if (src && !seen.has(src.id)) {
        list.push(src);
        seen.add(src.id);
      }
    }

    // 2. Then include any additional sources retrieved from the database
    if (sources) {
      for (const src of sources) {
        if (!seen.has(src.id)) {
          list.push(src);
          seen.add(src.id);
        }
      }
    }

    return list;
  }, [sources, referencedIds, sourceMap]);

  if (displayedSources.length === 0 && unavailableIds.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-3.5 border-t border-navy-150">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-600 uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-navy-500" />
          <span>Evidence Sources ({displayedSources.length})</span>
        </div>
        <span className="text-[11px] text-navy-400">Verified links from GCC Atlas dataset</span>
      </div>

      {displayedSources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {displayedSources.map((src) => {
            const isDirectlyCited = referencedIds.includes(src.id);
            return (
              <a
                key={src.id}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open verified source: ${src.url}`}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-all group ${
                  isDirectlyCited
                    ? 'bg-accent-50/40 border-accent-200 hover:bg-accent-50 hover:border-accent-300 shadow-xs'
                    : 'bg-white border-navy-100 hover:border-navy-200 hover:bg-warm-50/70'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isDirectlyCited
                        ? 'bg-accent-100 text-accent-800'
                        : 'bg-navy-100 text-navy-700'
                    }`}
                  >
                    {src.id}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-navy-900 group-hover:text-accent-700 transition-colors line-clamp-1 flex items-center gap-1">
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="mt-0.5 text-navy-500 text-[11px] truncate flex items-center gap-1.5">
                    <span>{src.publisher}</span>
                    {src.publicationDate && (
                      <>
                        <span className="text-navy-300">•</span>
                        <span>{src.publicationDate.slice(0, 7)}</span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Flag any unresolvable citations */}
      {unavailableIds.length > 0 && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Unresolved Source References: </span>
            {unavailableIds.map(id => `[${id}]`).join(', ')} — these citation IDs were referenced by the assistant but do not exist in the GCC Atlas curated dataset.
          </div>
        </div>
      )}
    </div>
  );
}

function CopilotContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSent = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim();
      if (!trimmed || isLoading) return;

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setLastFailedQuery(null);

      try {
        const conversationHistory = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setLastFailedQuery(trimmed);
          if (data.type === 'missing_api_key') {
            setError(
              'The Gemini API key is not configured. Please set GEMINI_API_KEY in your .env.local file. The rest of GCC Atlas works without it — only the AI Copilot requires an API key.'
            );
          } else if (data.type === 'invalid_api_key') {
            setError(
              'The Gemini API key appears to be invalid. Please check your GEMINI_API_KEY environment variable.'
            );
          } else if (data.type === 'high_demand') {
            setError(
              'Google Gemini servers are currently experiencing high demand. Please wait a few moments and try your question again.'
            );
          } else {
            setError(data.message || 'The AI copilot encountered an error. Please try again.');
          }
          return;
        }

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-reply`,
          role: 'assistant',
          content: data.response,
          sources: data.sources,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        setLastFailedQuery(trimmed);
        setError('Failed to connect to the AI copilot. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  // Auto-send initial query from URL params (e.g. ?q=...)
  useEffect(() => {
    if (initialQuery && !hasAutoSent.current && messages.length === 0) {
      hasAutoSent.current = true;
      sendMessage(initialQuery);
      setInput('');
    }
  }, [initialQuery, messages.length, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    setInput('');
    sendMessage(currentInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStarterQuestionClick = (q: string) => {
    setInput('');
    sendMessage(q);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-4.5rem)] max-w-5xl mx-auto">
      {/* Copilot Header */}
      <header className="shrink-0 pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-950">AI Research Copilot</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-navy-600">
              Evidence-grounded GCC intelligence for India • Grounded in the GCC Atlas dataset
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setError(null);
                setLastFailedQuery(null);
              }}
              className="text-xs text-navy-600 hover:text-navy-900 font-medium px-3 py-1.5 rounded-lg border border-navy-200 hover:bg-white hover:border-navy-300 transition-colors shadow-2xs"
              title="Start a fresh conversation"
            >
              New Chat
            </button>
          )}
        </div>
      </header>

      {/* Dataset Notice & Evidence Scope Banner */}
      <div className="shrink-0 bg-navy-50/80 border border-navy-150 rounded-xl px-3.5 py-2.5 mb-3 flex items-center justify-between gap-3 text-xs text-navy-600">
        <div className="flex items-center gap-2 min-w-0">
          <Info className="w-4 h-4 text-navy-400 shrink-0" />
          <p className="truncate">
            Answers are strictly grounded in GCC Atlas&apos;s curated evidence dataset ({evidenceSources.length} sources). No live web search.
          </p>
        </div>
        <Link
          href="/evidence"
          className="shrink-0 font-medium text-accent-600 hover:text-accent-700 hover:underline flex items-center gap-1"
        >
          <span>Evidence Library</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Independently Scrollable Conversation Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 py-2 space-y-4 scroll-smooth"
      >
        {/* Empty State */}
        {messages.length === 0 && !error && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[380px] h-full py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent-100 flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-6 h-6 text-accent-600" />
            </div>
            <h2 className="text-lg font-bold text-navy-900 mb-1">Ask a Research Question</h2>
            <p className="text-sm text-navy-500 max-w-md mb-6 leading-relaxed">
              Get evidence-backed answers on GCC locations, talent pools, costs, policies, and companies in India.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl w-full text-left">
              {starterQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleStarterQuestionClick(q)}
                  className="p-3 bg-white border border-navy-150 rounded-xl text-xs sm:text-sm text-navy-750 hover:border-accent-300 hover:bg-accent-50/30 hover:text-accent-800 transition-all text-left shadow-2xs group flex items-start justify-between gap-2"
                >
                  <span className="leading-snug">{q}</span>
                  <Send className="w-3.5 h-3.5 text-navy-300 group-hover:text-accent-600 shrink-0 mt-0.5 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] bg-accent-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-xs flex items-start gap-2.5">
                  <div className="flex-1 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <User className="w-4 h-4 shrink-0 text-accent-200 mt-0.5" />
                </div>
              </div>
            );
          }

          // Build message-specific sourceMap
          const messageSourceMap = new Map(GLOBAL_SOURCE_MAP);
          if (msg.sources) {
            for (const s of msg.sources) {
              messageSourceMap.set(s.id, s);
            }
          }

          const { citedIds, unavailableIds } = extractReferencedSourceIds(
            msg.content,
            messageSourceMap
          );

          return (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[98%] sm:max-w-[92%] lg:max-w-[88%] bg-white border border-navy-150 rounded-2xl rounded-bl-sm p-4 sm:p-5 shadow-xs">
                {/* Assistant message header */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-navy-100">
                  <div className="w-6 h-6 rounded-lg bg-accent-100 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-accent-600" />
                  </div>
                  <span className="text-xs font-semibold text-navy-800">GCC Atlas Copilot</span>
                  <span className="text-[10px] text-navy-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Markdown content */}
                <AssistantMarkdown content={msg.content} sourceMap={messageSourceMap} />

                {/* Verified sources section */}
                <AssistantSourcesSection
                  sources={msg.sources}
                  referencedIds={citedIds}
                  unavailableIds={unavailableIds}
                  sourceMap={messageSourceMap}
                />
              </div>
            </div>
          );
        })}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-navy-150 rounded-2xl rounded-bl-sm p-4 sm:p-5 shadow-xs max-w-[90%] sm:max-w-[80%] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-50 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-accent-600 animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy-800">
                  Synthesizing evidence-backed response…
                </p>
                <p className="text-xs text-navy-500 mt-0.5 truncate">
                  Retrieving policy records, metrics, and citations from GCC Atlas dataset
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State Banner in conversation */}
        {error && (
          <div className="flex justify-start">
            <div className="bg-red-50/90 border border-red-200 rounded-2xl rounded-bl-sm p-4 max-w-[90%] sm:max-w-[80%] shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Research Copilot Error</p>
                  <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{error}</p>
                  {lastFailedQuery && (
                    <button
                      onClick={() => {
                        const q = lastFailedQuery;
                        setError(null);
                        setLastFailedQuery(null);
                        sendMessage(q);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry query</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pinned Message Composer Container */}
      <div className="shrink-0 pt-3 pb-1 border-t border-navy-150 bg-warm-50/95 backdrop-blur-xs">
        <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about GCCs in India (e.g., government incentives, Bengaluru vs Hyderabad)..."
              rows={2}
              className="w-full px-4 py-2.5 bg-white border border-navy-200 rounded-xl text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 resize-none shadow-2xs leading-relaxed"
              id="copilot-input"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 h-[62px] bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center shrink-0"
            id="copilot-send"
            aria-label="Send research question"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-navy-400 px-1">
          <span>Press Enter to send • Shift + Enter for new line</span>
          <span>Grounded in GCC Atlas Curated Dataset</span>
        </div>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px] text-navy-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-accent-500" />
          <span>Loading GCC Atlas Copilot…</span>
        </div>
      }
    >
      <CopilotContent />
    </Suspense>
  );
}
