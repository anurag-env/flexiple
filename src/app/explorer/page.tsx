'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  ExternalLink,
  Building2,
  MapPin,
  Bookmark,
  BookmarkCheck,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { gccCompanies, evidenceSources } from '@/data';
import { GCCCompany, ConfidenceLevel } from '@/types';
import { saveCompany, removeCompany, isCompanySaved } from '@/lib/shortlist';

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium confidence-${level}`}>
      {label}
    </span>
  );
}

function CompanyDetail({ company, onClose }: { company: GCCCompany; onClose: () => void }) {
  const [saved, setSaved] = useState(() => isCompanySaved(company.id));
  const sources = evidenceSources.filter(s => company.evidenceSourceIds.includes(s.id));

  const toggleSave = () => {
    if (saved) {
      removeCompany(company.id);
    } else {
      saveCompany(company.id);
    }
    setSaved(!saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-900/30" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-navy-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-navy-900">{company.companyName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSave}
              className={`p-2 rounded-lg transition-colors ${saved ? 'text-accent-600 bg-accent-50' : 'text-navy-400 hover:bg-navy-50'}`}
              aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}
            >
              {saved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-navy-400 hover:bg-navy-50 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">Parent HQ</p>
              <p className="text-sm text-navy-800">{company.parentHQ}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">Industry</p>
              <p className="text-sm text-navy-800">{company.industry}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">Year Established</p>
              <p className="text-sm text-navy-800">{company.yearEstablished === 'unknown' ? 'Unknown' : company.yearEstablished || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">Confidence</p>
              <ConfidenceBadge level={company.confidence} />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-2">Indian Cities</p>
            <div className="flex flex-wrap gap-2">
              {company.indianCities.map(city => (
                <span key={city} className="inline-flex items-center gap-1 px-2.5 py-1 bg-navy-50 text-navy-700 rounded-lg text-xs font-medium">
                  <MapPin className="w-3 h-3" /> {city}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-2">Functions</p>
            <div className="flex flex-wrap gap-2">
              {company.functions.map(fn => (
                <span key={fn} className="px-2.5 py-1 bg-accent-50 text-accent-700 rounded-lg text-xs font-medium">
                  {fn}
                </span>
              ))}
            </div>
          </div>

          {company.notes && (
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">Evidence Notes</p>
              <p className="text-sm text-navy-700 leading-relaxed">{company.notes}</p>
            </div>
          )}

          {company.employeeCountIndia && company.employeeCountIndia !== 'unknown' && (
            <div>
              <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">Employees in India</p>
              <p className="text-sm text-navy-800">{company.employeeCountIndia.toLocaleString()}</p>
            </div>
          )}

          <div className="border-t border-navy-100 pt-4">
            {company.evidenceUrl && (
              <div className="rounded-xl border border-accent-200 bg-accent-50/50 p-3.5 mb-4">
                <p className="text-[11px] font-semibold text-accent-700 uppercase tracking-wide mb-1">Primary company evidence</p>
                <a
                  href={company.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent-700 hover:text-accent-800 font-semibold"
                >
                  Open {company.companyName}&apos;s current India source <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="mt-1 text-xs leading-relaxed text-navy-600">Use this first for company-specific location and hiring evidence. It opens in a new tab.</p>
              </div>
            )}

            <p className="text-xs font-medium text-navy-500 uppercase tracking-wide mb-1">Additional market context</p>
            <p className="text-xs text-navy-500 mb-3">These broader sources support ecosystem context; they are not company-specific proof.</p>
            {sources.length > 0 ? (
              <div className="space-y-3">
                {sources.map(src => (
                  <div key={src.id} className="bg-navy-50 rounded-lg p-3">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-accent-600 hover:text-accent-700 flex items-center gap-1.5"
                    >
                      {src.title}
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    <p className="text-xs text-navy-500 mt-1">{src.publisher}</p>
                    {src.publicationDate && (
                      <p className="text-xs text-navy-400 mt-0.5">Published: {src.publicationDate}</p>
                    )}
                    {src.lastCheckedDate && (
                      <p className="text-xs text-navy-400 mt-0.5">Link last checked: {src.lastCheckedDate}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy-500">No additional context sources are linked for this record.</p>
            )}
          </div>

          {company.lastVerifiedDate && (
            <p className="text-xs text-navy-400">Last verified: {company.lastVerifiedDate}</p>
          )}
        </div>
      </div>
    </div>
  );
}

type SortField = 'companyName' | 'industry' | 'confidence';
type SortDirection = 'asc' | 'desc';

function ExplorerContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [cityFilter, setCityFilter] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [functionFilter, setFunctionFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('companyName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCompany, setSelectedCompany] = useState<GCCCompany | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const industries = new Set<string>();
    const functions = new Set<string>();
    gccCompanies.forEach(c => {
      c.indianCities.forEach(city => cities.add(city));
      industries.add(c.industry);
      c.functions.forEach(f => functions.add(f));
    });
    return {
      cities: Array.from(cities).sort(),
      industries: Array.from(industries).sort(),
      functions: Array.from(functions).sort(),
    };
  }, []);

  const filteredCompanies = useMemo(() => {
    let result = [...gccCompanies];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.parentHQ.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.indianCities.some(city => city.toLowerCase().includes(q)) ||
        c.functions.some(f => f.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    // Filters
    if (cityFilter) {
      result = result.filter(c => c.indianCities.includes(cityFilter));
    }
    if (industryFilter) {
      result = result.filter(c => c.industry === industryFilter);
    }
    if (functionFilter) {
      result = result.filter(c => c.functions.includes(functionFilter));
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, cityFilter, industryFilter, functionFilter, sortField, sortDirection]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const hasActiveFilters = cityFilter || industryFilter || functionFilter;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy-900">GCC Explorer</h1>
        <p className="mt-1 text-sm text-navy-600">
          Search and explore {gccCompanies.length} curated GCC records. Each entry is linked to its evidence source.
        </p>
      </header>

      {/* Search and Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            <input
              type="text"
              placeholder="Search by company, city, industry, or function…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-navy-200 rounded-xl text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              id="explorer-search"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-accent-50 border-accent-200 text-accent-700'
                : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'
            }`}
            id="toggle-filters"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-accent-600 text-white text-xs flex items-center justify-center">
                {[cityFilter, industryFilter, functionFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white border border-navy-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-500 mb-1.5">City</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm text-navy-800 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                id="city-filter"
              >
                <option value="">All cities</option>
                {filterOptions.cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-500 mb-1.5">Industry</label>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm text-navy-800 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                id="industry-filter"
              >
                <option value="">All industries</option>
                {filterOptions.industries.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-500 mb-1.5">Function</label>
              <select
                value={functionFilter}
                onChange={(e) => setFunctionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm text-navy-800 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                id="function-filter"
              >
                <option value="">All functions</option>
                {filterOptions.functions.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => { setCityFilter(''); setIndustryFilter(''); setFunctionFilter(''); }}
                className="text-sm text-accent-600 hover:text-accent-700 font-medium sm:col-span-3"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-navy-500">
        Showing {filteredCompanies.length} of {gccCompanies.length} companies
      </p>

      {/* Table */}
      <div className="bg-white border border-navy-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" id="explorer-table">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50">
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('companyName')} className="flex items-center gap-1 text-xs font-semibold text-navy-500 uppercase tracking-wide hover:text-navy-700">
                    Company
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Cities</span>
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <button onClick={() => toggleSort('industry')} className="flex items-center gap-1 text-xs font-semibold text-navy-500 uppercase tracking-wide hover:text-navy-700">
                    Industry
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Functions</span>
                </th>
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('confidence')} className="flex items-center gap-1 text-xs font-semibold text-navy-500 uppercase tracking-wide hover:text-navy-700">
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Source</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-navy-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-navy-300" />
                    <p className="font-medium">No companies match your filters</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map(company => (
                  <tr
                    key={company.id}
                    className="border-b border-navy-50 hover:bg-navy-50/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedCompany(company)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-navy-900">{company.companyName}</span>
                      </div>
                      <p className="text-xs text-navy-400 mt-0.5">{company.parentHQ}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {company.indianCities.map(city => (
                          <span key={city} className="text-xs text-navy-600 bg-navy-50 px-1.5 py-0.5 rounded">
                            {city}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-navy-700">{company.industry}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {company.functions.slice(0, 3).map(fn => (
                          <span key={fn} className="text-xs text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded">
                            {fn}
                          </span>
                        ))}
                        {company.functions.length > 3 && (
                          <span className="text-xs text-navy-400">+{company.functions.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge level={company.confidence} />
                    </td>
                    <td className="px-4 py-3">
                      {company.evidenceUrl && (
                        <a
                          href={company.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-accent-500 hover:text-accent-600"
                          aria-label={`Source for ${company.companyName}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sort indicator */}
      <div className="flex items-center gap-2 text-xs text-navy-400">
        <ArrowUpDown className="w-3 h-3" />
        Sorted by {sortField === 'companyName' ? 'company name' : sortField} ({sortDirection === 'asc' ? 'ascending' : 'descending'})
      </div>

      {/* Detail Drawer */}
      {selectedCompany && (
        <CompanyDetail
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="text-navy-400 py-12 text-center text-sm">Loading explorer…</div>}>
      <ExplorerContent />
    </Suspense>
  );
}
