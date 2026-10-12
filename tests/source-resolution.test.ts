import { describe, it, expect } from 'vitest';
import { gccCompanies, evidenceSources, cityProfiles, cityMetrics } from '@/data';
import { EvidenceSource } from '@/types';

const SOURCE_MAP = new Map<string, EvidenceSource>(
  evidenceSources.map(s => [s.id, s])
);

function processCitationsInMarkdown(text: string, sourceMap: Map<string, EvidenceSource>): {
  resolved: string[];
  unavailable: string[];
} {
  const allMatches = text.match(/src-[a-zA-Z0-9_-]+/g) || [];
  const uniqueIds = Array.from(new Set(allMatches));
  const resolved: string[] = [];
  const unavailable: string[] = [];

  for (const id of uniqueIds) {
    if (sourceMap.has(id)) {
      resolved.push(id);
    } else {
      unavailable.push(id);
    }
  }

  return { resolved, unavailable };
}

describe('Evidence Source Provenance & Resolution', () => {
  it('ensures all company evidenceSourceIds reference valid sources in the evidence catalog', () => {
    const danglingRefs: { company: string; sourceId: string }[] = [];

    for (const company of gccCompanies) {
      for (const sid of company.evidenceSourceIds) {
        if (!SOURCE_MAP.has(sid)) {
          danglingRefs.push({ company: company.companyName, sourceId: sid });
        }
      }
    }

    expect(danglingRefs).toEqual([]);
  });

  it('ensures all city metric evidenceSourceIds reference valid sources in the evidence catalog', () => {
    const danglingRefs: { metric: string; sourceId: string }[] = [];

    for (const metric of cityMetrics) {
      if (metric.evidenceSourceIds) {
        for (const sid of metric.evidenceSourceIds) {
          if (!SOURCE_MAP.has(sid)) {
            danglingRefs.push({ metric: `${metric.cityName}-${metric.criterionKey}`, sourceId: sid });
          }
        }
      }
    }

    expect(danglingRefs).toEqual([]);
  });

  it('ensures all city profile evidenceSourceIds reference valid sources', () => {
    const danglingRefs: { city: string; sourceId: string }[] = [];

    for (const city of cityProfiles) {
      if (city.evidenceSourceIds) {
        for (const sid of city.evidenceSourceIds) {
          if (!SOURCE_MAP.has(sid)) {
            danglingRefs.push({ city: city.name, sourceId: sid });
          }
        }
      }
    }

    expect(danglingRefs).toEqual([]);
  });

  it('verifies every evidence source has required non-empty metadata fields and valid URL', () => {
    expect(evidenceSources.length).toBeGreaterThan(0);

    for (const source of evidenceSources) {
      expect(source.id).toMatch(/^src-\d+$/);
      expect(source.title.trim().length).toBeGreaterThan(0);
      expect(source.publisher.trim().length).toBeGreaterThan(0);
      expect(source.category).toBeDefined();
      expect(source.url).toMatch(/^https?:\/\//);
      expect(Array.isArray(source.claimsSupported)).toBe(true);
      expect(source.claimsSupported.length).toBeGreaterThan(0);
    }
  });

  it('correctly resolves verified citations vs unresolvable citations in assistant markdown', () => {
    const sampleAssistantResponse = `
    According to the Karnataka GCC Policy [src-005], employment-linked subsidies are offered.
    Additionally, the Telangana framework [src-006] provides power tariff subsidies.
    However, speculative claim citing [src-999] cannot be verified.
    `;

    const { resolved, unavailable } = processCitationsInMarkdown(sampleAssistantResponse, SOURCE_MAP);

    expect(resolved).toContain('src-005');
    expect(resolved).toContain('src-006');
    expect(unavailable).toContain('src-999');
    expect(unavailable.length).toBe(1);
  });
});
