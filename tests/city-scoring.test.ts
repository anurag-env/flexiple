import { describe, it, expect } from 'vitest';
import { cityProfiles, comparisonCriteria } from '@/data';

function calculateCityScores(
  weights: Record<string, number>,
  selectedCityNames: string[] = ['Bengaluru', 'Hyderabad', 'Pune']
) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return {};

  const scores: Record<string, { total: number; breakdown: { criterion: string; score: number; weight: number; weighted: number; hasData: boolean }[] }> = {};

  for (const city of cityProfiles) {
    if (!selectedCityNames.includes(city.name)) continue;

    const breakdown: { criterion: string; score: number; weight: number; weighted: number; hasData: boolean }[] = [];
    let total = 0;
    let validWeightSum = 0;

    for (const criterion of comparisonCriteria) {
      const metric = city.metrics.find(m => m.criterionKey === criterion.key);
      const weight = weights[criterion.key] ?? 50;
      const hasScore = metric?.score !== undefined;

      if (hasScore && metric?.score !== undefined) {
        const weighted = (metric.score / 10) * weight;
        total += weighted;
        validWeightSum += weight;
        breakdown.push({
          criterion: criterion.label,
          score: metric.score,
          weight,
          weighted,
          hasData: true,
        });
      } else {
        breakdown.push({
          criterion: criterion.label,
          score: 0,
          weight,
          weighted: 0,
          hasData: false,
        });
      }
    }

    scores[city.name] = {
      total: validWeightSum > 0 ? (total / validWeightSum) * 100 : 0,
      breakdown,
    };
  }

  return scores;
}

describe('City Weighted Scoring Algorithm', () => {
  it('calculates expected equal-weight baseline scores for all 3 primary cities', () => {
    const defaultWeights: Record<string, number> = {};
    comparisonCriteria.forEach(c => {
      defaultWeights[c.key] = 50;
    });

    const scores = calculateCityScores(defaultWeights);

    expect(scores).toHaveProperty('Bengaluru');
    expect(scores).toHaveProperty('Hyderabad');
    expect(scores).toHaveProperty('Pune');

    // All scores must fall between 0 and 100
    for (const cityName of ['Bengaluru', 'Hyderabad', 'Pune']) {
      expect(scores[cityName].total).toBeGreaterThan(0);
      expect(scores[cityName].total).toBeLessThanOrEqual(100);
      expect(scores[cityName].breakdown.length).toBe(comparisonCriteria.length);
    }
  });

  it('reflects priority shifts when cost is prioritized over talent availability', () => {
    // Heavy talent preference: talent-tech = 100, others = 0
    const talentHeavyWeights: Record<string, number> = {
      'talent-tech': 100,
      'cost-office': 0,
      'ecosystem-gcc': 0,
      'gov-incentives': 0,
      'industry-peers': 0,
    };
    const talentScores = calculateCityScores(talentHeavyWeights);

    // Heavy cost preference: cost-office = 100, others = 0
    const costHeavyWeights: Record<string, number> = {
      'talent-tech': 0,
      'cost-office': 100,
      'ecosystem-gcc': 0,
      'gov-incentives': 0,
      'industry-peers': 0,
    };
    const costScores = calculateCityScores(costHeavyWeights);

    // Bengaluru has the top tech talent pool score
    expect(talentScores['Bengaluru'].total).toBeGreaterThanOrEqual(talentScores['Pune'].total);

    // Pune has lower real estate / operations costs than Bengaluru
    expect(costScores['Pune'].total).toBeGreaterThan(costScores['Bengaluru'].total);
  });

  it('handles zero total weight without division by zero or NaN', () => {
    const zeroWeights: Record<string, number> = {};
    comparisonCriteria.forEach(c => {
      zeroWeights[c.key] = 0;
    });

    const scores = calculateCityScores(zeroWeights);
    expect(scores).toEqual({});
  });

  it('filters out deselected cities accurately', () => {
    const weights: Record<string, number> = {};
    comparisonCriteria.forEach(c => {
      weights[c.key] = 50;
    });

    const scores = calculateCityScores(weights, ['Hyderabad']);
    expect(Object.keys(scores)).toEqual(['Hyderabad']);
    expect(scores['Bengaluru']).toBeUndefined();
    expect(scores['Pune']).toBeUndefined();
  });

  it('verifies every criteria metric score is bounded within 1 to 10', () => {
    for (const city of cityProfiles) {
      for (const m of city.metrics) {
        if (m.score !== undefined) {
          expect(m.score).toBeGreaterThanOrEqual(1);
          expect(m.score).toBeLessThanOrEqual(10);
        }
      }
    }
  });
});
