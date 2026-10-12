'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Library,
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  Info,
  Filter,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { evidenceSources, gccCompanies, cityProfiles } from '@/data';


const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  government: {
    label: 'Government Policy / Official',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  'industry-report': {
    label: 'Industry Research & Report',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  'company-announcement': {
    label: 'Company Announcement / Careers',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
  },
  research: {
    label: 'Academic / Market Research',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  directory: {
    label: 'Aggregated Directory',
    color: 'text-slate-700',
    bg: 'bg-slate-100 border-slate-300',
  },
  news: {
    label: 'News / Media Report',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200',
  },
};

export default function EvidencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'publisher' | 'citations'>('date');

  // Pre-calculate reference map for sources -> companies and cities
  const sourceReferenceMap = useMemo(() => {
    const map = new Map<string, { companies: string[]; cities: string[] }>();
    
    evidenceSources.forEach((source) => {
      map.set(source.id, { companies: [], cities: [] });
    });

    // Check companies
    gccCompanies.forEach((company) => {
      company.evidenceSourceIds?.forEach((sourceId) => {
        const entry = map.get(sourceId);
        if (entry && !entry.companies.includes(company.companyName)) {
          entry.companies.push(company.companyName);
        }
      });
    });

    // Check cities
    cityProfiles.forEach((city) => {
      const citySources = new Set<string>();
      city.evidenceSourceIds?.forEach((id) => citySources.add(id));
      city.metrics?.forEach((m) => m.evidenceSourceIds?.forEach((id) => citySources.add(id)));

      citySources.forEach((sourceId) => {
        const entry = map.get(sourceId);
        if (entry && !entry.cities.includes(city.name)) {
          entry.cities.push(city.name);
        }
      });
    });

    return map;
  }, []);

  // Filtered & Sorted sources
  const filteredSources = useMemo(() => {
    return evidenceSources
      .filter((source) => {
        // Category filter
        if (selectedCategory !== 'all' && source.category !== selectedCategory) {
          return false;
        }

        // Query search
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchesTitle = source.title.toLowerCase().includes(q);
        const matchesPublisher = source.publisher.toLowerCase().includes(q);
        const matchesNotes = source.confidenceNotes?.toLowerCase().includes(q) ?? false;
        const matchesClaims = source.claimsSupported.some((claim) => claim.toLowerCase().includes(q));
        const refs = sourceReferenceMap.get(source.id);
        const matchesCompanies = refs?.companies.some((c) => c.toLowerCase().includes(q)) ?? false;
        const matchesCities = refs?.cities.some((c) => c.toLowerCase().includes(q)) ?? false;

        return matchesTitle || matchesPublisher || matchesNotes || matchesClaims || matchesCompanies || matchesCities;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'publisher') {
          return a.publisher.localeCompare(b.publisher);
        }
        if (sortBy === 'citations') {
          const countA = (sourceReferenceMap.get(a.id)?.companies.length || 0) + (sourceReferenceMap.get(a.id)?.cities.length || 0);
          const countB = (sourceReferenceMap.get(b.id)?.companies.length || 0) + (sourceReferenceMap.get(b.id)?.cities.length || 0);
          return countB - countA;
        }
        // default: date (newest first)
        const dateA = a.publicationDate || a.lastCheckedDate || '1970-01-01';
        const dateB = b.publicationDate || b.lastCheckedDate || '1970-01-01';
        return dateB.localeCompare(dateA);
      });
  }, [searchQuery, selectedCategory, sortBy, sourceReferenceMap]);

  // Statistics for top summary
  const stats = useMemo(() => {
    const total = evidenceSources.length;
    const govCount = evidenceSources.filter((s) => s.category === 'government').length;
    const reportCount = evidenceSources.filter((s) => s.category === 'industry-report').length;
    const announcementCount = evidenceSources.filter((s) => s.category === 'company-announcement').length;
    const otherCount = total - govCount - reportCount - announcementCount;
    return { total, govCount, reportCount, announcementCount, otherCount };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-700">
          <Library className="w-4 h-4" />
          <span>Evidence Provenance</span>
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mt-1">Evidence Library</h1>
        <p className="text-sm text-navy-600 mt-1 max-w-3xl">
          Every assertion, city metric, and GCC corporate profile in GCC Atlas is anchored in verified primary sources,
          official state policies, and company disclosures. No estimates are fabricated without provenance.
        </p>
      </div>

      {/* Provenance Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-xl p-5 border border-navy-700 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-navy-200">
                Ground-Truth Integrity Standard
              </h2>
            </div>
            <p className="text-xs text-navy-300 max-w-2xl">
              GCC Atlas distinguishes between primary government statutes, audited industry surveys, and direct corporate announcements.
              If an indicator cannot be verified from a cited source, it remains explicitly labeled as <span className="text-amber-300 font-mono">unknown</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/copilot?q=What%20government%20incentives%20should%20I%20investigate%20before%20setting%20up%20a%20GCC?"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium transition-colors"
            >
              Ask Copilot with Sources <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Coverage counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-navy-700/60 text-xs">
          <div>
            <div className="text-navy-400">Total Curated Sources</div>
            <div className="text-lg font-bold text-white mt-0.5">{stats.total}</div>
          </div>
          <div>
            <div className="text-navy-400">Government Policies</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.govCount}</div>
          </div>
          <div>
            <div className="text-navy-400">Industry Reports</div>
            <div className="text-lg font-bold text-blue-400 mt-0.5">{stats.reportCount}</div>
          </div>
          <div>
            <div className="text-navy-400">Corporate Disclosures</div>
            <div className="text-lg font-bold text-purple-400 mt-0.5">{stats.announcementCount}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-navy-100 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-navy-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, publisher, claim, company (e.g. Karnataka, NASSCOM, Microsoft)..."
              className="w-full pl-9 pr-4 py-2 bg-warm-50 border border-navy-200 rounded-lg text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-400 hover:text-navy-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-navy-500" />
            <label htmlFor="sort-by" className="text-xs font-medium text-navy-600">Sort by:</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'title' | 'date' | 'publisher' | 'citations')}
              className="px-3 py-2 bg-warm-50 border border-navy-200 rounded-lg text-xs font-medium text-navy-800 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            >
              <option value="date">Most Recent</option>
              <option value="citations">Most Cited Records</option>
              <option value="title">Source Title (A–Z)</option>
              <option value="publisher">Publisher (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-navy-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-navy-900 text-white'
                : 'bg-warm-100 text-navy-700 hover:bg-warm-200'
            }`}
          >
            All Categories ({evidenceSources.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, meta]) => {
            const count = evidenceSources.filter((s) => s.category === key).length;
            if (count === 0) return null;
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors border ${
                  isSelected
                    ? `${meta.bg} ${meta.color} font-semibold ring-1 ring-current`
                    : 'bg-white border-navy-200 text-navy-700 hover:bg-warm-50'
                }`}
              >
                {meta.label.split(' / ')[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Sources List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-navy-500 px-1">
          <span>Showing {filteredSources.length} of {evidenceSources.length} curated sources</span>
          {searchQuery && (
            <span>Filtered by: &ldquo;{searchQuery}&rdquo;</span>
          )}
        </div>

        {filteredSources.length === 0 ? (
          <div className="bg-white border border-navy-100 rounded-xl p-12 text-center">
            <Library className="w-10 h-10 text-navy-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-navy-800">No sources match your criteria</h3>
            <p className="text-xs text-navy-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search terms or clearing the category filter to view all verified GCC documents.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-3 py-1.5 text-xs font-medium text-accent-700 bg-accent-50 rounded-lg hover:bg-accent-100"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredSources.map((source) => {
            const categoryMeta = CATEGORY_LABELS[source.category] || {
              label: source.category,
              color: 'text-navy-700',
              bg: 'bg-warm-100 border-navy-200',
            };
            const refs = sourceReferenceMap.get(source.id);
            const citingCompanies = refs?.companies || [];
            const citingCities = refs?.cities || [];

            return (
              <div
                key={source.id}
                id={source.id}
                className="bg-white border border-navy-200 rounded-xl p-5 hover:border-accent-300 transition-colors shadow-xs"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${categoryMeta.bg} ${categoryMeta.color}`}>
                        {categoryMeta.label}
                      </span>
                      <span className="text-[11px] font-mono text-navy-500 bg-warm-100 px-1.5 py-0.5 rounded">
                        {source.id}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-navy-900 leading-snug">
                      {source.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-navy-600 flex-wrap">
                      <span className="font-semibold text-navy-800">{source.publisher}</span>
                      {source.publicationDate && (
                        <span className="flex items-center gap-1 text-navy-500">
                          <Calendar className="w-3.5 h-3.5" /> Published: {source.publicationDate}
                        </span>
                      )}
                      {source.lastCheckedDate && (
                        <span className="text-navy-500">
                          Checked: {source.lastCheckedDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-800 text-xs font-medium border border-navy-200 transition-colors shrink-0 self-start"
                  >
                    <span>Inspect Source</span>
                    <ExternalLink className="w-3.5 h-3.5 text-navy-500" />
                  </a>
                </div>

                {/* Claims supported */}
                <div className="mt-4 pt-4 border-t border-navy-100">
                  <h4 className="text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Claims Established By This Source:
                  </h4>
                  <ul className="space-y-1.5">
                    {source.claimsSupported.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-navy-800">
                        <span className="text-emerald-600 font-bold leading-tight mt-0.5">•</span>
                        <span>{claim}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Confidence notes if present */}
                {source.confidenceNotes && (
                  <div className="mt-3 bg-warm-50 border border-warm-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-navy-700">
                    <Info className="w-3.5 h-3.5 text-accent-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-navy-800">Methodology & Confidence Notes: </span>
                      <span className="text-navy-600">{source.confidenceNotes}</span>
                    </div>
                  </div>
                )}

                {/* Cross References in GCC Atlas */}
                {(citingCompanies.length > 0 || citingCities.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-navy-100/70 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-navy-500 font-medium">Referenced in GCC Atlas:</span>
                    {citingCities.map((cityName) => (
                      <Link
                        key={cityName}
                        href="/cities"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium hover:bg-emerald-100 transition-colors"
                      >
                        <MapPin className="w-3 h-3 text-emerald-600" /> {cityName} Assessment
                      </Link>
                    ))}
                    {citingCompanies.map((cName) => (
                      <Link
                        key={cName}
                        href={`/explorer?q=${encodeURIComponent(cName)}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Building2 className="w-3 h-3 text-blue-600" /> {cName} Profile
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
