'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Info,
  BarChart3,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { cityProfiles, comparisonCriteria } from '@/data';
import { evidenceSources } from '@/data/sources';
import { saveCity, removeCity, isCitySaved } from '@/lib/shortlist';

const CITY_COLORS: Record<string, string> = {
  Bengaluru: '#2563eb',
  Hyderabad: '#059669',
  Pune: '#d97706',
};

export default function CitiesPage() {
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    comparisonCriteria.forEach(c => { initial[c.key] = 50; });
    return initial;
  });

  const [selectedCities, setSelectedCities] = useState<string[]>(['Bengaluru', 'Hyderabad', 'Pune']);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const handleWeightChange = useCallback((key: string, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleCity = useCallback((cityName: string) => {
    setSelectedCities(prev =>
      prev.includes(cityName)
        ? prev.filter(c => c !== cityName)
        : [...prev, cityName]
    );
  }, []);

  // Calculate weighted scores
  const cityScores = useMemo(() => {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return {};

    const scores: Record<string, { total: number; breakdown: { criterion: string; score: number; weight: number; weighted: number; hasData: boolean }[] }> = {};

    for (const city of cityProfiles) {
      if (!selectedCities.includes(city.name)) continue;

      const breakdown: { criterion: string; score: number; weight: number; weighted: number; hasData: boolean }[] = [];
      let total = 0;
      let validWeightSum = 0;

      for (const criterion of comparisonCriteria) {
        const metric = city.metrics.find(m => m.criterionKey === criterion.key);
        const weight = weights[criterion.key];
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
  }, [weights, selectedCities]);

  // Radar chart data
  const radarData = useMemo(() => {
    return comparisonCriteria.map(criterion => {
      const point: Record<string, string | number> = { criterion: criterion.label };
      for (const city of cityProfiles) {
        if (!selectedCities.includes(city.name)) continue;
        const metric = city.metrics.find(m => m.criterionKey === criterion.key);
        point[city.name] = metric?.score ?? 0;
      }
      return point;
    });
  }, [selectedCities]);

  // Sort cities by score
  const rankedCities = useMemo(() => {
    return Object.entries(cityScores)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([name, data]) => ({ name, ...data }));
  }, [cityScores]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-navy-900">City Decision Workspace</h1>
        <p className="mt-1 text-sm text-navy-600">
          Compare GCC destination cities based on your priorities. Adjust weights to see how rankings change.
        </p>
      </header>

      {/* City Selection */}
      <section>
        <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">Select Cities to Compare</h2>
        <div className="flex flex-wrap gap-3">
          {cityProfiles.map(city => {
            const isSelected = selectedCities.includes(city.name);
            return (
              <button
                key={city.name}
                onClick={() => toggleCity(city.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  isSelected
                    ? 'bg-white border-accent-300 text-navy-900 shadow-sm'
                    : 'bg-navy-50 border-navy-100 text-navy-500 hover:border-navy-200'
                }`}
                id={`toggle-city-${city.name.toLowerCase()}`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CITY_COLORS[city.name] || '#627d98' }}
                />
                {city.name}
                <span className="text-xs text-navy-400">{city.state}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Priority Weights */}
      <section className="bg-white border border-navy-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-navy-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Your Priorities
        </h2>
        <p className="text-xs text-navy-500 mb-4">
          Adjust the importance of each criterion. Higher values mean more influence on the final score.
        </p>
        <div className="space-y-4">
          {comparisonCriteria.map(criterion => (
            <div key={criterion.key} className="flex items-center gap-4">
              <div className="w-48 shrink-0">
                <p className="text-sm font-medium text-navy-800">{criterion.label}</p>
                <p className="text-xs text-navy-400">{criterion.description}</p>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[criterion.key]}
                onChange={(e) => handleWeightChange(criterion.key, Number(e.target.value))}
                className="flex-1 h-2 bg-navy-100 rounded-lg appearance-none cursor-pointer accent-accent-600"
                id={`weight-${criterion.key}`}
              />
              <span className="w-10 text-right text-sm font-medium text-navy-700">
                {weights[criterion.key]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {selectedCities.length >= 2 && (
        <>
          {/* Radar Chart */}
          <section className="bg-white border border-navy-100 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-navy-700 mb-4">City Comparison Radar</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: '#334e68' }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#627d98' }} />
                  {selectedCities.map(city => (
                    <Radar
                      key={city}
                      name={city}
                      dataKey={city}
                      stroke={CITY_COLORS[city] || '#627d98'}
                      fill={CITY_COLORS[city] || '#627d98'}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-navy-400 mt-2">
              Scores are relative assessments (1–10) based on available evidence. Higher is better.
            </p>
          </section>

          {/* Weighted Rankings */}
          <section>
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">
              Weighted Ranking (Based on Your Priorities)
            </h2>
            <div className="space-y-3">
              {rankedCities.map((city, index) => {
                const profile = cityProfiles.find(p => p.name === city.name);
                const saved = isCitySaved(city.name);

                return (
                  <div key={city.name} className="bg-white border border-navy-100 rounded-xl overflow-hidden">
                    <div
                      className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-navy-50/30 transition-colors"
                      onClick={() => setExpandedCity(expandedCity === city.name ? null : city.name)}
                    >
                      <span className="text-lg font-bold text-navy-300 w-8">#{index + 1}</span>
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: CITY_COLORS[city.name] || '#627d98' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-navy-900">{city.name}</h3>
                          <span className="text-xs text-navy-400">{profile?.state}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-navy-900">{city.total.toFixed(1)}</p>
                        <p className="text-xs text-navy-400">weighted score</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (saved) removeCity(city.name);
                          else saveCity(city.name);
                          // Force re-render
                          setWeights(prev => ({ ...prev }));
                        }}
                        className={`p-2 rounded-lg transition-colors ${saved ? 'text-accent-600 bg-accent-50' : 'text-navy-400 hover:bg-navy-50'}`}
                        aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}
                      >
                        {saved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                      </button>
                      {expandedCity === city.name ? (
                        <ChevronUp className="w-5 h-5 text-navy-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-navy-400" />
                      )}
                    </div>

                    {expandedCity === city.name && profile && (
                      <div className="px-5 pb-5 border-t border-navy-100 pt-4 space-y-4">
                        <p className="text-sm text-navy-600">{profile.description}</p>

                        {/* Score Breakdown */}
                        <div>
                          <h4 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Score Breakdown</h4>
                          <div className="space-y-2">
                            {city.breakdown.map(b => (
                              <div key={b.criterion} className="flex items-center gap-3 text-sm">
                                <span className="w-44 text-navy-600 shrink-0">{b.criterion}</span>
                                <div className="flex-1 h-2 bg-navy-100 rounded-full overflow-hidden">
                                  {b.hasData ? (
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${(b.score / 10) * 100}%`,
                                        backgroundColor: CITY_COLORS[city.name] || '#627d98',
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-navy-100 flex items-center justify-center">
                                    </div>
                                  )}
                                </div>
                                <span className="w-8 text-right text-navy-700 font-medium">
                                  {b.hasData ? b.score : '—'}
                                </span>
                                <span className="w-16 text-right text-xs text-navy-400">
                                  wt: {b.weight}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Strengths and Limitations */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Strengths</h4>
                            <ul className="space-y-1.5">
                              {profile.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-navy-600 flex items-start gap-2">
                                  <span className="text-success mt-0.5 shrink-0">✓</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Limitations</h4>
                            <ul className="space-y-1.5">
                              {profile.limitations.map((l, i) => (
                                <li key={i} className="text-sm text-navy-600 flex items-start gap-2">
                                  <span className="text-warning mt-0.5 shrink-0">!</span>
                                  <span>{l}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Sources */}
                        <div>
                          <h4 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Evidence Sources</h4>
                          <div className="space-y-2">
                            {evidenceSources
                              .filter(s => profile.evidenceSourceIds.includes(s.id))
                              .map(src => (
                                <a
                                  key={src.id}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  {src.title} — {src.publisher}
                                </a>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {selectedCities.length < 2 && (
        <div className="bg-navy-50 border border-navy-100 rounded-xl p-8 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-3 text-navy-300" />
          <p className="text-sm text-navy-500 font-medium">Select at least 2 cities to compare</p>
        </div>
      )}

      {/* Methodology */}
      <section className="bg-navy-50 border border-navy-100 rounded-xl p-5">
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="flex items-center gap-2 text-sm font-medium text-navy-700 w-full"
          id="toggle-methodology"
        >
          <Info className="w-4 h-4" />
          Scoring Methodology & Limitations
          {showMethodology ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
        {showMethodology && (
          <div className="mt-3 text-sm text-navy-600 space-y-2">
            <p>
              <strong>How scores are calculated:</strong> Each city receives a score of 1–10 for each criterion,
              based on available evidence. The weighted score multiplies each criterion score by your assigned
              weight, then normalizes to a 0–100 scale.
            </p>
            <p>
              <strong>Limitations:</strong> Scores are relative assessments, not precise measurements.
              They are based on publicly available evidence from government reports, industry publications,
              and company announcements. They do not include real-time rental prices, salary benchmarks,
              or talent counts — these would require proprietary market data.
            </p>
            <p>
              <strong>Unknown data:</strong> When a metric cannot be scored due to insufficient evidence,
              it is excluded from the weighted calculation (not scored as zero). This prevents penalizing
              cities for missing data.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
