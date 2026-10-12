'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Building2,
  MapPin,
  FileText,
  Trash2,
  ExternalLink,
  Plus,
  Download,
  Tag,
  ArrowRight,
  ShieldCheck,
  Edit2,
  X,
  Compass,
} from 'lucide-react';
import { gccCompanies, cityProfiles } from '@/data';
import {
  getFullShortlist,
  subscribeShortlist,
  removeCompany,
  removeCity,
  addResearchNote,
  removeResearchNote,
  updateSavedItemNote,
} from '@/lib/shortlist';
import { ShortlistState, GCCCompany, CityProfile } from '@/types';

const emptyShortlistState: ShortlistState = {
  savedCompanies: [],
  savedCities: [],
  researchNotes: [],
};

export default function ShortlistPage() {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const shortlist = useSyncExternalStore(
    subscribeShortlist,
    getFullShortlist,
    () => emptyShortlistState
  );

  const [activeTab, setActiveTab] = useState<'all' | 'companies' | 'cities' | 'notes'>('all');

  // New Note Form State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTag, setNewNoteTag] = useState('Strategy');
  const [newNoteCompany, setNewNoteCompany] = useState('');
  const [newNoteCity, setNewNoteCity] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Edit Note / Item State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');


  // Derived datasets
  const savedCompaniesList = useMemo(() => {
    return shortlist.savedCompanies
      .map((item) => {
        const company = gccCompanies.find((c) => c.id === item.itemId);
        return { item, company };
      })
      .filter((pair): pair is { item: typeof pair.item; company: GCCCompany } => !!pair.company);
  }, [shortlist.savedCompanies]);

  const savedCitiesList = useMemo(() => {
    return shortlist.savedCities
      .map((item) => {
        const city = cityProfiles.find((c) => c.name === item.itemId);
        return { item, city };
      })
      .filter((pair): pair is { item: typeof pair.item; city: CityProfile } => !!pair.city);
  }, [shortlist.savedCities]);

  // Actions
  const handleRemoveCompany = (companyId: string) => {
    removeCompany(companyId);
  };

  const handleRemoveCity = (cityName: string) => {
    removeCity(cityName);
  };

  const handleRemoveNote = (noteId: string) => {
    removeResearchNote(noteId);
  };

  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    addResearchNote(
      newNoteContent.trim(),
      newNoteTag ? [newNoteTag] : undefined,
      newNoteCompany ? [newNoteCompany] : undefined,
      newNoteCity ? [newNoteCity] : undefined
    );

    setNewNoteContent('');
    setNewNoteCompany('');
    setNewNoteCity('');
    setIsAddingNote(false);
  };

  const handleStartEditNote = (itemId: string, currentNote: string = '') => {
    setEditingItemId(itemId);
    setEditingItemText(currentNote);
  };

  const handleSaveItemNote = (itemId: string, type: 'company' | 'city') => {
    updateSavedItemNote(itemId, type, editingItemText.trim());
    setEditingItemId(null);
    setEditingItemText('');
  };


  // Export Executive Briefing markdown
  const handleExportBriefing = () => {
    const lines: string[] = [];
    lines.push('# GCC Atlas — Executive Decision Shortlist & Briefing');
    lines.push(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    lines.push('## 1. Candidate Cities Shortlisted');
    if (savedCitiesList.length === 0) {
      lines.push('*No cities currently shortlisted.*');
    } else {
      savedCitiesList.forEach(({ city, item }) => {
        lines.push(`### ${city.name} (${city.state})`);
        lines.push(`- **Overview:** ${city.description}`);
        lines.push(`- **Key Strengths:** ${city.strengths.join('; ')}`);
        lines.push(`- **Limitations:** ${city.limitations.join('; ')}`);
        if (item.personalNote) {
          lines.push(`- **Analyst Note:** ${item.personalNote}`);
        }
        lines.push('');
      });
    }
    lines.push('');

    lines.push('## 2. Peer & Target GCC Companies Shortlisted');
    if (savedCompaniesList.length === 0) {
      lines.push('*No companies currently shortlisted.*');
    } else {
      savedCompaniesList.forEach(({ company, item }) => {
        lines.push(`### ${company.companyName} (${company.industry})`);
        lines.push(`- **HQ:** ${company.parentHQ}`);
        lines.push(`- **Indian Footprint:** ${company.indianCities.join(', ')}`);
        lines.push(`- **Functions:** ${company.functions.join(', ')}`);
        lines.push(`- **Verification:** ${company.confidence} (${company.evidenceUrl || 'Official Record'})`);
        if (item.personalNote) {
          lines.push(`- **Analyst Note:** ${item.personalNote}`);
        }
        lines.push('');
      });
    }
    lines.push('');

    lines.push('## 3. Working Hypotheses & Research Notes');
    if (shortlist.researchNotes.length === 0) {
      lines.push('*No research notes recorded.*');
    } else {
      shortlist.researchNotes.forEach((note, idx) => {
        lines.push(`### Note ${idx + 1} [${note.tags?.join(', ') || 'General'}] — ${new Date(note.createdAt).toLocaleDateString()}`);
        lines.push(note.content);
        if (note.relatedCities?.length) {
          lines.push(`- Associated Cities: ${note.relatedCities.join(', ')}`);
        }
        if (note.relatedCompanyIds?.length) {
          lines.push(`- Associated Companies: ${note.relatedCompanyIds.join(', ')}`);
        }
        lines.push('');
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gcc-atlas-shortlist-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSavedCount = shortlist.savedCompanies.length + shortlist.savedCities.length + shortlist.researchNotes.length;

  if (!isMounted) {
    return (
      <div className="py-12 text-center text-sm text-navy-500">
        Loading research workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-700">
            <Bookmark className="w-4 h-4" />
            <span>Decision Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-900 mt-1">Research Shortlist & Notes</h1>
          <p className="text-sm text-navy-600 mt-1 max-w-2xl">
            Save locations, benchmark peer GCCs, record working hypotheses, and assemble your India entry decision brief.
          </p>
        </div>

        {totalSavedCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBriefing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-navy-300 text-xs font-semibold text-navy-800 hover:bg-navy-50 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-navy-600" />
              <span>Export Decision Brief (.md)</span>
            </button>
          </div>
        )}
      </div>

      {/* Persistence callout banner */}
      <div className="bg-white border border-navy-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-navy-900">Local Browser Session Persistence</span>
            <p className="text-navy-500">
              Shortlisted companies, cities, and custom notes are stored locally in your browser. No authentication required.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddingNote(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-xs font-medium transition-colors shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Research Note</span>
        </button>
      </div>

      {/* Add Note Modal/Card */}
      {isAddingNote && (
        <form
          onSubmit={handleSaveNewNote}
          className="bg-white border-2 border-accent-400 rounded-xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-navy-100 pb-3">
            <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-600" />
              <span>New Analyst Research Note</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              className="text-navy-400 hover:text-navy-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-700 mb-1">
              Observation / Hypothesis / Follow-up requirement
            </label>
            <textarea
              required
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="e.g. Hyderabad offers stronger power subsidy frameworks for high-compute AI labs, but Bengaluru has 2x higher senior ML hiring velocity according to NASSCOM reports..."
              className="w-full px-3 py-2 text-xs border border-navy-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 text-navy-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-navy-600 mb-1">Category Tag</label>
              <select
                value={newNoteTag}
                onChange={(e) => setNewNoteTag(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-warm-50 border border-navy-200 rounded-lg text-navy-800"
              >
                <option value="Strategy">Strategy & Roadmap</option>
                <option value="Talent">Talent & Hiring</option>
                <option value="Incentives">Government Incentives</option>
                <option value="Real Estate">Office & Real Estate</option>
                <option value="Risk">Risk Assessment</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-navy-600 mb-1">Related City (Optional)</label>
              <select
                value={newNoteCity}
                onChange={(e) => setNewNoteCity(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-warm-50 border border-navy-200 rounded-lg text-navy-800"
              >
                <option value="">None / All Cities</option>
                {cityProfiles.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-navy-600 mb-1">Related Peer GCC (Optional)</label>
              <select
                value={newNoteCompany}
                onChange={(e) => setNewNoteCompany(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-warm-50 border border-navy-200 rounded-lg text-navy-800"
              >
                <option value="">None / General</option>
                {gccCompanies.map((c) => (
                  <option key={c.id} value={c.companyName}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-navy-100">
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              className="px-3 py-1.5 text-xs font-medium text-navy-600 hover:text-navy-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-accent-600 hover:bg-accent-700 rounded-lg shadow-xs"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-navy-200 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-2 font-medium border-b-2 -mb-1 transition-colors ${
            activeTab === 'all'
              ? 'border-accent-600 text-accent-700 font-semibold'
              : 'border-transparent text-navy-500 hover:text-navy-900'
          }`}
        >
          All Items ({totalSavedCount})
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-3 py-2 font-medium border-b-2 -mb-1 transition-colors ${
            activeTab === 'companies'
              ? 'border-accent-600 text-accent-700 font-semibold'
              : 'border-transparent text-navy-500 hover:text-navy-900'
          }`}
        >
          Shortlisted Companies ({savedCompaniesList.length})
        </button>
        <button
          onClick={() => setActiveTab('cities')}
          className={`px-3 py-2 font-medium border-b-2 -mb-1 transition-colors ${
            activeTab === 'cities'
              ? 'border-accent-600 text-accent-700 font-semibold'
              : 'border-transparent text-navy-500 hover:text-navy-900'
          }`}
        >
          Shortlisted Cities ({savedCitiesList.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-3 py-2 font-medium border-b-2 -mb-1 transition-colors ${
            activeTab === 'notes'
              ? 'border-accent-600 text-accent-700 font-semibold'
              : 'border-transparent text-navy-500 hover:text-navy-900'
          }`}
        >
          Analyst Notes ({shortlist.researchNotes.length})
        </button>
      </div>

      {/* Empty State */}
      {totalSavedCount === 0 ? (
        <div className="bg-white border border-navy-200 rounded-xl p-12 text-center max-w-xl mx-auto shadow-xs">
          <Bookmark className="w-12 h-12 text-navy-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-navy-900">Your Shortlist is Currently Empty</h3>
          <p className="text-xs text-navy-500 mt-1 leading-relaxed">
            As you explore verified GCCs and test city-location scenarios, bookmark companies and cities to build your comparative decision workspace.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              href="/explorer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Explore GCC Directory</span>
            </Link>
            <Link
              href="/cities"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Assess Indian Cities</span>
            </Link>
            <Link
              href="/copilot"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-navy-800 text-xs font-semibold transition-colors border border-navy-200"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Ask AI Copilot</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Shortlisted Cities */}
          {(activeTab === 'all' || activeTab === 'cities') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Shortlisted Target Cities ({savedCitiesList.length})</span>
                </h2>
                {savedCitiesList.length > 0 && (
                  <Link
                    href="/cities"
                    className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
                  >
                    Compare in Workspace <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {savedCitiesList.length === 0 ? (
                <div className="bg-white border border-navy-100 rounded-lg p-5 text-center text-xs text-navy-500">
                  No cities shortlisted yet. Visit the{' '}
                  <Link href="/cities" className="text-accent-600 underline font-medium">
                    City Decision Workspace
                  </Link>{' '}
                  to bookmark candidate hubs.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {savedCitiesList.map(({ city, item }) => (
                    <div
                      key={city.name}
                      className="bg-white border border-navy-200 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-navy-900">{city.name}</h3>
                            <span className="text-xs text-navy-500">{city.state}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveCity(city.name)}
                            className="p-1 text-navy-400 hover:text-red-600 transition-colors"
                            title="Remove from shortlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-navy-600 mt-2 line-clamp-3">
                          {city.description}
                        </p>

                        <div className="mt-3 pt-3 border-t border-navy-100 space-y-1.5">
                          <div className="text-[11px] font-semibold text-navy-700">Top Strengths:</div>
                          <ul className="text-[11px] text-navy-600 space-y-1">
                            {city.strengths.slice(0, 2).map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold">•</span>
                                <span className="line-clamp-1">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Personal Note */}
                      <div className="mt-3 pt-3 border-t border-navy-100">
                        {editingItemId === city.name ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editingItemText}
                              onChange={(e) => setEditingItemText(e.target.value)}
                              placeholder="Add personal note..."
                              className="w-full text-xs px-2 py-1 border border-accent-300 rounded focus:outline-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="text-[11px] text-navy-500 px-1.5 py-0.5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveItemNote(city.name, 'city')}
                                className="text-[11px] bg-accent-600 text-white px-2 py-0.5 rounded"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-navy-500">
                            <span className="italic truncate max-w-[180px]">
                              {item.personalNote ? `Note: ${item.personalNote}` : 'No personal note'}
                            </span>
                            <button
                              onClick={() => handleStartEditNote(city.name, item.personalNote)}
                              className="text-accent-600 hover:text-accent-700 ml-1 shrink-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Shortlisted Companies */}
          {(activeTab === 'all' || activeTab === 'companies') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Shortlisted Benchmark GCCs ({savedCompaniesList.length})</span>
                </h2>
                {savedCompaniesList.length > 0 && (
                  <Link
                    href="/explorer"
                    className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
                  >
                    View in Explorer <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {savedCompaniesList.length === 0 ? (
                <div className="bg-white border border-navy-100 rounded-lg p-5 text-center text-xs text-navy-500">
                  No GCCs shortlisted yet. Visit the{' '}
                  <Link href="/explorer" className="text-accent-600 underline font-medium">
                    GCC Explorer
                  </Link>{' '}
                  to bookmark peer centres.
                </div>
              ) : (
                <div className="bg-white border border-navy-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-navy-800">
                      <thead className="bg-warm-100 text-navy-700 font-semibold border-b border-navy-200">
                        <tr>
                          <th className="py-2.5 px-4">Company</th>
                          <th className="py-2.5 px-4">HQ</th>
                          <th className="py-2.5 px-4">Indian Presence</th>
                          <th className="py-2.5 px-4">Key Functions</th>
                          <th className="py-2.5 px-4">Evidence & Source</th>
                          <th className="py-2.5 px-4">Personal Note</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-100">
                        {savedCompaniesList.map(({ company, item }) => (
                          <tr key={company.id} className="hover:bg-warm-50/60">
                            <td className="py-3 px-4">
                              <div className="font-bold text-navy-900">{company.companyName}</div>
                              <div className="text-[11px] text-navy-500">{company.industry}</div>
                            </td>
                            <td className="py-3 px-4 text-navy-600">{company.parentHQ}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {company.indianCities.map((c) => (
                                  <span
                                    key={c}
                                    className="px-1.5 py-0.5 rounded bg-navy-50 text-navy-700 border border-navy-200 text-[10px] font-medium"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="line-clamp-2 text-navy-600">{company.functions.join(', ')}</span>
                            </td>
                            <td className="py-3 px-4">
                              {company.evidenceUrl ? (
                                <a
                                  href={company.evidenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-accent-600 hover:underline"
                                >
                                  <span>Official Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-navy-400 italic">Curated</span>
                              )}
                            </td>
                            <td className="py-3 px-4 max-w-[200px]">
                              {editingItemId === company.id ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={editingItemText}
                                    onChange={(e) => setEditingItemText(e.target.value)}
                                    placeholder="Add personal note..."
                                    className="w-full text-xs px-2 py-1 border border-accent-300 rounded focus:outline-none"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => setEditingItemId(null)}
                                      className="text-[10px] text-navy-500"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveItemNote(company.id, 'company')}
                                      className="text-[10px] bg-accent-600 text-white px-1.5 py-0.5 rounded"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-navy-500">
                                  <span className="italic truncate">
                                    {item.personalNote || '—'}
                                  </span>
                                  <button
                                    onClick={() => handleStartEditNote(company.id, item.personalNote)}
                                    className="text-accent-600 hover:text-accent-700 ml-1 shrink-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleRemoveCompany(company.id)}
                                className="p-1 text-navy-400 hover:text-red-600 transition-colors"
                                title="Remove from shortlist"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Research Notes */}
          {(activeTab === 'all' || activeTab === 'notes') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Analyst Research Notes & Working Hypotheses ({shortlist.researchNotes.length})</span>
                </h2>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Note
                </button>
              </div>

              {shortlist.researchNotes.length === 0 ? (
                <div className="bg-white border border-navy-100 rounded-lg p-5 text-center text-xs text-navy-500">
                  No custom notes recorded yet. Click &ldquo;Add Research Note&rdquo; to capture executive hypotheses or due diligence items.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shortlist.researchNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white border border-navy-200 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {note.tags?.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                              >
                                <Tag className="w-2.5 h-2.5" /> {t}
                              </span>
                            ))}
                            <span className="text-[10px] text-navy-400">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveNote(note.id)}
                            className="p-1 text-navy-400 hover:text-red-600 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-xs text-navy-800 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                      </div>

                      {(note.relatedCities?.length || note.relatedCompanyIds?.length) && (
                        <div className="mt-3 pt-3 border-t border-navy-100 flex items-center gap-2 flex-wrap text-[11px] text-navy-500">
                          {note.relatedCities?.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
                            >
                              <MapPin className="w-3 h-3" /> {c}
                            </span>
                          ))}
                          {note.relatedCompanyIds?.map((comp) => (
                            <span
                              key={comp}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                            >
                              <Building2 className="w-3 h-3" /> {comp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
