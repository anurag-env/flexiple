import { describe, it, expect } from 'vitest';
import { gccCompanies } from '@/data';
import { GCCCompany } from '@/types';

function filterAndSortCompanies(
  companies: GCCCompany[],
  options: {
    query?: string;
    city?: string;
    industry?: string;
    sortField?: 'companyName' | 'industry' | 'confidence';
    sortDirection?: 'asc' | 'desc';
  }
): GCCCompany[] {
  let result = [...companies];

  if (options.city && options.city !== 'all') {
    result = result.filter(c => c.indianCities.includes(options.city!));
  }

  if (options.industry && options.industry !== 'all') {
    result = result.filter(c => c.industry === options.industry);
  }

  if (options.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    result = result.filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      c.parentHQ.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.indianCities.some(city => city.toLowerCase().includes(q)) ||
      c.functions.some(f => f.toLowerCase().includes(q))
    );
  }

  const field = options.sortField || 'companyName';
  const dir = options.sortDirection || 'asc';
  result.sort((a, b) => {
    const aVal = String(a[field] ?? '').toLowerCase();
    const bVal = String(b[field] ?? '').toLowerCase();
    return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  return result;
}

describe('GCC Explorer Search & Filtering Logic', () => {
  it('returns all 30 companies with no filters applied', () => {
    const results = filterAndSortCompanies(gccCompanies, {});
    expect(results.length).toBe(30);
  });

  it('filters accurately by city (e.g. Pune)', () => {
    const results = filterAndSortCompanies(gccCompanies, { city: 'Pune' });
    expect(results.length).toBeGreaterThan(0);
    for (const c of results) {
      expect(c.indianCities).toContain('Pune');
    }
  });

  it('filters accurately by industry (e.g. Technology)', () => {
    const results = filterAndSortCompanies(gccCompanies, { industry: 'Technology' });
    expect(results.length).toBeGreaterThan(0);
    for (const c of results) {
      expect(c.industry).toBe('Technology');
    }
  });

  it('correctly combines city filter and industry filter', () => {
    const results = filterAndSortCompanies(gccCompanies, {
      city: 'Bengaluru',
      industry: 'Financial Services',
    });
    for (const c of results) {
      expect(c.indianCities).toContain('Bengaluru');
      expect(c.industry).toBe('Financial Services');
    }
  });

  it('supports case-insensitive company name search', () => {
    const resultsLower = filterAndSortCompanies(gccCompanies, { query: 'google' });
    const resultsUpper = filterAndSortCompanies(gccCompanies, { query: 'GOOGLE' });
    expect(resultsLower.length).toBe(1);
    expect(resultsLower[0].companyName).toBe('Google');
    expect(resultsUpper.length).toBe(1);
    expect(resultsUpper[0].companyName).toBe('Google');
  });

  it('supports search by functions (e.g. "Cloud" or "AI/ML")', () => {
    const results = filterAndSortCompanies(gccCompanies, { query: 'Cloud' });
    expect(results.length).toBeGreaterThan(0);
    const hasCloud = results.every(c =>
      c.functions.some(f => f.toLowerCase().includes('cloud')) ||
      c.companyName.toLowerCase().includes('cloud') ||
      c.industry.toLowerCase().includes('cloud')
    );
    expect(hasCloud).toBe(true);
  });

  it('returns empty list when search query matches nothing', () => {
    const results = filterAndSortCompanies(gccCompanies, { query: 'NonExistentEnterprise999' });
    expect(results.length).toBe(0);
  });

  it('sorts alphabetically by companyName in both ascending and descending order', () => {
    const asc = filterAndSortCompanies(gccCompanies, { sortField: 'companyName', sortDirection: 'asc' });
    const desc = filterAndSortCompanies(gccCompanies, { sortField: 'companyName', sortDirection: 'desc' });

    expect(asc[0].companyName.localeCompare(asc[asc.length - 1].companyName)).toBeLessThan(0);
    expect(desc[0].companyName).toBe(asc[asc.length - 1].companyName);
  });
});
