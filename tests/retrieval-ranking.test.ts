import { describe, it, expect } from 'vitest';
import {
  tokenize,
  computeRelevance,
  retrieveContext,
  formatContextForPrompt,
} from '@/lib/retrieval';

describe('Lexical Retrieval & Ranking Engine', () => {
  it('correctly tokenizes queries preserving key GCC acronyms (AI, ML, IT, R&D)', () => {
    const tokens = tokenize('Which GCCs in Bengaluru focus on AI, ML, and R&D?');
    expect(tokens).toContain('ai');
    expect(tokens).toContain('ml');
    expect(tokens).toContain('rd');
    expect(tokens).toContain('bengaluru');
    expect(tokens).toContain('gccs');
    expect(tokens).toContain('focus');
    // Stop words like 'which', 'in', 'on', 'and' must be filtered
    expect(tokens).not.toContain('which');
    expect(tokens).not.toContain('and');
    expect(tokens).not.toContain('in');
  });

  it('assigns higher relevance to exact word matches over partial substring matches', () => {
    const exactTarget = 'Google operates engineering offices in Bengaluru';
    const substringTarget = 'Googlesphere operates engine repairs in Bengalururural';

    const tokens = ['google', 'engineering'];
    const exactScore = computeRelevance(tokens, exactTarget);
    const substringScore = computeRelevance(tokens, substringTarget);

    expect(exactScore).toBeGreaterThan(substringScore);
  });

  it('retrieves relevant company records for targeted technology queries', () => {
    const context = retrieveContext('Microsoft cloud software development in Hyderabad', 5);
    expect(context.companies.length).toBeGreaterThan(0);
    const foundMicrosoft = context.companies.some(c => c.companyName === 'Microsoft');
    expect(foundMicrosoft).toBe(true);
  });

  it('retrieves relevant government policy sources for state incentive questions', () => {
    const context = retrieveContext('Karnataka GCC Policy subsidies and incentives', 5);
    expect(context.sources.length).toBeGreaterThan(0);
    const foundKarnatakaPolicy = context.sources.some(s => s.id === 'src-005');
    expect(foundKarnatakaPolicy).toBe(true);
  });

  it('resolves cross-referenced evidence sources for matched companies and metrics', () => {
    const context = retrieveContext('Google engineering', 3);
    const google = context.companies.find(c => c.companyName === 'Google');
    expect(google).toBeDefined();

    // Any source ID cited by Google must be in the merged sources
    for (const sid of google!.evidenceSourceIds) {
      const sourcePresent = context.sources.some(s => s.id === sid);
      expect(sourcePresent).toBe(true);
    }
  });

  it('formats retrieved context cleanly without HTML or invalid syntax', () => {
    const context = retrieveContext('Pune automotive and technology hubs', 3);
    const formatted = formatContextForPrompt(context);

    expect(formatted).toContain('--- COMPANIES ---');
    expect(formatted).toContain('--- CITY METRICS ---');
    expect(formatted).toContain('--- EVIDENCE SOURCES ---');
    expect(formatted).not.toContain('<script>');
    expect(formatted).not.toContain('<div');
    expect(formatted).toContain('Retrieved');
  });

  it('gracefully handles empty queries with an informative empty state', () => {
    const context = retrieveContext('   ', 5);
    expect(context.companies).toEqual([]);
    expect(context.sources).toEqual([]);
    expect(context.cityMetrics).toEqual([]);
    expect(context.relevanceNotes).toBe('No search terms found in query.');
  });
});
