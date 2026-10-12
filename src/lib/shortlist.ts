'use client';

import { SavedItem, ResearchNote, ShortlistState } from '@/types';

const STORAGE_KEY = 'gcc-atlas-shortlist';

let cachedRaw: string | null = null;
let cachedState: ShortlistState = { savedCompanies: [], savedCities: [], researchNotes: [] };

function getState(): ShortlistState {
  if (typeof window === 'undefined') {
    return { savedCompanies: [], savedCities: [], researchNotes: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedState = raw ? JSON.parse(raw) : { savedCompanies: [], savedCities: [], researchNotes: [] };
    }
  } catch {
    // corrupted data
  }
  return cachedState;
}

function saveState(state: ShortlistState): void {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(state);
  cachedRaw = json;
  cachedState = state;
  localStorage.setItem(STORAGE_KEY, json);
  window.dispatchEvent(new Event('gcc-atlas-shortlist-updated'));
}

export function subscribeShortlist(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('gcc-atlas-shortlist-updated', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('gcc-atlas-shortlist-updated', callback);
    window.removeEventListener('storage', callback);
  };
}


export function getSavedCompanies(): SavedItem[] {
  return getState().savedCompanies;
}

export function getSavedCities(): SavedItem[] {
  return getState().savedCities;
}

export function getResearchNotes(): ResearchNote[] {
  return getState().researchNotes;
}

export function getFullShortlist(): ShortlistState {
  return getState();
}

export function saveCompany(companyId: string, note?: string): void {
  const state = getState();
  if (state.savedCompanies.some(s => s.itemId === companyId)) return;
  state.savedCompanies.push({
    id: `saved-${Date.now()}`,
    type: 'company',
    itemId: companyId,
    savedAt: new Date().toISOString(),
    personalNote: note,
  });
  saveState(state);
}

export function removeCompany(companyId: string): void {
  const state = getState();
  state.savedCompanies = state.savedCompanies.filter(s => s.itemId !== companyId);
  saveState(state);
}

export function saveCity(cityName: string, note?: string): void {
  const state = getState();
  if (state.savedCities.some(s => s.itemId === cityName)) return;
  state.savedCities.push({
    id: `saved-${Date.now()}`,
    type: 'city',
    itemId: cityName,
    savedAt: new Date().toISOString(),
    personalNote: note,
  });
  saveState(state);
}

export function removeCity(cityName: string): void {
  const state = getState();
  state.savedCities = state.savedCities.filter(s => s.itemId !== cityName);
  saveState(state);
}

export function addResearchNote(content: string, tags?: string[], relatedCompanyIds?: string[], relatedCities?: string[]): void {
  const state = getState();
  state.researchNotes.push({
    id: `note-${Date.now()}`,
    content,
    relatedCompanyIds,
    relatedCities,
    createdAt: new Date().toISOString(),
    tags,
  });
  saveState(state);
}

export function removeResearchNote(noteId: string): void {
  const state = getState();
  state.researchNotes = state.researchNotes.filter(n => n.id !== noteId);
  saveState(state);
}

export function isCompanySaved(companyId: string): boolean {
  return getState().savedCompanies.some(s => s.itemId === companyId);
}

export function isCitySaved(cityName: string): boolean {
  return getState().savedCities.some(s => s.itemId === cityName);
}

export function updateSavedItemNote(itemId: string, type: 'company' | 'city', note: string): void {
  const state = getState();
  const list = type === 'company' ? state.savedCompanies : state.savedCities;
  const item = list.find(s => s.itemId === itemId);
  if (item) {
    item.personalNote = note;
    saveState(state);
  }
}
