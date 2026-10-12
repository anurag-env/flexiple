/**
 * Lightweight lexical retrieval over curated GCC records.
 * Designed to be replaced with embeddings/vector DB later.
 */

import { GCCCompany, EvidenceSource, CityMetric, RetrievedContext } from '@/types';
import { gccCompanies, evidenceSources, cityMetrics } from '@/data';

export const DOMAIN_ACRONYMS = new Set(['ai', 'ml', 'it', 'rd', 'hr', 'qa', 'ip', 'ev', 'ui', 'ux']);

export const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'what', 'which', 'where',
  'when', 'who', 'how', 'have', 'has', 'had', 'been', 'were', 'was', 'are',
  'should', 'could', 'would', 'can', 'will', 'about', 'some', 'any', 'all',
  'into', 'over', 'than', 'more', 'most', 'very', 'does', 'tell', 'show', 'give'
]);

export function tokenize(text: string): string[] {
  // Normalize "r&d" -> "rd" before stripping non-alphanumeric characters
  const normalized = text.toLowerCase().replace(/r\s*&\s*d/g, 'rd');
  return normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => (t.length > 2 && !STOP_WORDS.has(t)) || DOMAIN_ACRONYMS.has(t));
}

export function computeRelevance(tokens: string[], target: string): number {
  if (tokens.length === 0 || !target) return 0;
  const targetLower = target.toLowerCase().replace(/r\s*&\s*d/g, 'rd');
  const targetWords = new Set(
    targetLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );

  let score = 0;
  for (const token of tokens) {
    if (targetWords.has(token)) {
      // Exact word match gets highest weight
      score += 3;
    } else if (targetLower.includes(token)) {
      // Substring match gets baseline weight
      score += 1;
    }
  }
  return score;
}

export function scoreCompany(tokens: string[], company: GCCCompany): number {
  const nameScore = computeRelevance(tokens, company.companyName) * 3;
  const cityScore = computeRelevance(tokens, company.indianCities.join(' ')) * 2;
  const industryScore = computeRelevance(tokens, company.industry) * 2;
  const functionsScore = computeRelevance(tokens, company.functions.join(' ')) * 2;
  const notesScore = computeRelevance(tokens, `${company.parentHQ} ${company.notes || ''}`);
  return nameScore + cityScore + industryScore + functionsScore + notesScore;
}

export function scoreSource(tokens: string[], source: EvidenceSource): number {
  const titleScore = computeRelevance(tokens, source.title) * 3;
  const claimsScore = computeRelevance(tokens, source.claimsSupported.join(' ')) * 2;
  const otherScore = computeRelevance(tokens, `${source.publisher} ${source.category} ${source.confidenceNotes || ''}`);
  return titleScore + claimsScore + otherScore;
}

export function scoreCityMetric(tokens: string[], metric: CityMetric): number {
  const cityScore = computeRelevance(tokens, metric.cityName) * 2;
  const labelScore = computeRelevance(tokens, metric.criterionLabel) * 2;
  const valueScore = computeRelevance(tokens, `${String(metric.value)} ${metric.notes || ''}`);
  return cityScore + labelScore + valueScore;
}

export function retrieveContext(query: string, maxResults: number = 10): RetrievedContext {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return {
      companies: [],
      sources: [],
      cityMetrics: [],
      relevanceNotes: 'No search terms found in query.',
    };
  }

  const companiesScored = gccCompanies
    .map(c => ({ company: c, score: scoreCompany(tokens, c) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  const sourcesScored = evidenceSources
    .map(s => ({ source: s, score: scoreSource(tokens, s) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  const metricsScored = cityMetrics
    .map(m => ({ metric: m, score: scoreCityMetric(tokens, m) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  // Retrieve sources referenced by both matched companies and matched city metrics
  const referencedSourceIds = new Set<string>();
  for (const { company } of companiesScored) {
    for (const sid of company.evidenceSourceIds) {
      referencedSourceIds.add(sid);
    }
  }
  for (const { metric } of metricsScored) {
    for (const sid of metric.evidenceSourceIds) {
      referencedSourceIds.add(sid);
    }
  }
  const referencedSources = evidenceSources.filter(s => referencedSourceIds.has(s.id));
  
  // Merge sources while avoiding duplicates
  const allSourceIds = new Set(sourcesScored.map(s => s.source.id));
  const mergedSources = [...sourcesScored.map(s => s.source)];
  for (const s of referencedSources) {
    if (!allSourceIds.has(s.id)) {
      mergedSources.push(s);
      allSourceIds.add(s.id);
    }
  }

  return {
    companies: companiesScored.map(c => c.company),
    sources: mergedSources,
    cityMetrics: metricsScored.map(m => m.metric),
    relevanceNotes: `Retrieved ${companiesScored.length} companies, ${mergedSources.length} sources, and ${metricsScored.length} city metrics from GCC Atlas dataset. No live web searches performed.`,
  };
}

export function formatContextForPrompt(context: RetrievedContext): string {
  let result = '=== RETRIEVED EVIDENCE FROM GCC ATLAS DATABASE ===\n\n';

  if (context.companies.length > 0) {
    result += '--- COMPANIES ---\n';
    for (const c of context.companies) {
      result += `• ${c.companyName} (${c.parentHQ})\n`;
      result += `  Cities: ${c.indianCities.join(', ')}\n`;
      result += `  Industry: ${c.industry}\n`;
      result += `  Functions: ${c.functions.join(', ')}\n`;
      result += `  Confidence: ${c.confidence}\n`;
      if (c.evidenceSourceIds && c.evidenceSourceIds.length > 0) {
        result += `  Evidence Source IDs: ${c.evidenceSourceIds.map(id => `[${id}]`).join(', ')}\n`;
      }
      if (c.notes) result += `  Evidence notes: ${c.notes}\n`;
      if (c.evidenceUrl) result += `  Source URL: ${c.evidenceUrl}\n`;
      result += '\n';
    }
  }

  if (context.cityMetrics.length > 0) {
    result += '--- CITY METRICS ---\n';
    for (const m of context.cityMetrics) {
      result += `• ${m.cityName} — ${m.criterionLabel}\n`;
      result += `  Assessment / Value: ${m.value}\n`;
      if (m.score !== undefined) result += `  Score (1–10): ${m.score}\n`;
      if (m.notes) result += `  Notes: ${m.notes}\n`;
      if (m.evidenceSourceIds && m.evidenceSourceIds.length > 0) {
        result += `  Evidence Source IDs: ${m.evidenceSourceIds.map(id => `[${id}]`).join(', ')}\n`;
      }
      result += '\n';
    }
  }

  if (context.sources.length > 0) {
    result += '--- EVIDENCE SOURCES ---\n';
    for (const s of context.sources) {
      result += `• [${s.id}] "${s.title}" — ${s.publisher}\n`;
      result += `  URL: ${s.url}\n`;
      if (s.publicationDate) result += `  Published: ${s.publicationDate}\n`;
      result += `  Category: ${s.category}\n`;
      result += `  Claims supported: ${s.claimsSupported.join('; ')}\n`;
      if (s.confidenceNotes) result += `  Confidence: ${s.confidenceNotes}\n`;
      result += '\n';
    }
  }

  result += `\n${context.relevanceNotes}\n`;
  return result;
}
