import { describe, it, expect, beforeEach } from 'vitest';
import { ShortlistState } from '@/types';

// Pure state reducer functions representing shortlist actions
function createInitialState(): ShortlistState {
  return {
    savedCompanies: [],
    savedCities: [],
    researchNotes: [],
  };
}

function saveCompany(state: ShortlistState, companyId: string, note?: string): ShortlistState {
  if (state.savedCompanies.some(s => s.itemId === companyId)) return state;
  return {
    ...state,
    savedCompanies: [
      ...state.savedCompanies,
      {
        id: `saved-${Date.now()}-${Math.random()}`,
        type: 'company',
        itemId: companyId,
        savedAt: new Date().toISOString(),
        personalNote: note,
      },
    ],
  };
}

function removeCompany(state: ShortlistState, companyId: string): ShortlistState {
  return {
    ...state,
    savedCompanies: state.savedCompanies.filter(s => s.itemId !== companyId),
  };
}

function saveCity(state: ShortlistState, cityName: string, note?: string): ShortlistState {
  if (state.savedCities.some(s => s.itemId === cityName)) return state;
  return {
    ...state,
    savedCities: [
      ...state.savedCities,
      {
        id: `saved-${Date.now()}-${Math.random()}`,
        type: 'city',
        itemId: cityName,
        savedAt: new Date().toISOString(),
        personalNote: note,
      },
    ],
  };
}

function removeCity(state: ShortlistState, cityName: string): ShortlistState {
  return {
    ...state,
    savedCities: state.savedCities.filter(s => s.itemId !== cityName),
  };
}

function addResearchNote(
  state: ShortlistState,
  content: string,
  tags?: string[],
  relatedCompanyIds?: string[],
  relatedCities?: string[]
): ShortlistState {
  return {
    ...state,
    researchNotes: [
      ...state.researchNotes,
      {
        id: `note-${Date.now()}-${Math.random()}`,
        content,
        tags,
        relatedCompanyIds,
        relatedCities,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function updateSavedItemNote(
  state: ShortlistState,
  itemId: string,
  type: 'company' | 'city',
  note: string
): ShortlistState {
  if (type === 'company') {
    return {
      ...state,
      savedCompanies: state.savedCompanies.map(c =>
        c.itemId === itemId ? { ...c, personalNote: note } : c
      ),
    };
  } else {
    return {
      ...state,
      savedCities: state.savedCities.map(c =>
        c.itemId === itemId ? { ...c, personalNote: note } : c
      ),
    };
  }
}

describe('Shortlist Persistence Logic & State Management', () => {
  let state: ShortlistState;

  beforeEach(() => {
    state = createInitialState();
  });

  it('saves and deduplicates companies in shortlist', () => {
    state = saveCompany(state, 'gcc-001', 'Primary anchor tenant');
    expect(state.savedCompanies.length).toBe(1);
    expect(state.savedCompanies[0].itemId).toBe('gcc-001');
    expect(state.savedCompanies[0].personalNote).toBe('Primary anchor tenant');

    // Attempting to save the same company twice must not duplicate
    state = saveCompany(state, 'gcc-001');
    expect(state.savedCompanies.length).toBe(1);
  });

  it('removes companies from shortlist correctly', () => {
    state = saveCompany(state, 'gcc-001');
    state = saveCompany(state, 'gcc-002');
    expect(state.savedCompanies.length).toBe(2);

    state = removeCompany(state, 'gcc-001');
    expect(state.savedCompanies.length).toBe(1);
    expect(state.savedCompanies[0].itemId).toBe('gcc-002');
  });

  it('saves and removes candidate cities', () => {
    state = saveCity(state, 'Bengaluru');
    state = saveCity(state, 'Hyderabad');
    expect(state.savedCities.length).toBe(2);

    // Idempotent duplicate check
    state = saveCity(state, 'Bengaluru');
    expect(state.savedCities.length).toBe(2);

    state = removeCity(state, 'Bengaluru');
    expect(state.savedCities.length).toBe(1);
    expect(state.savedCities[0].itemId).toBe('Hyderabad');
  });

  it('adds and updates personal notes on saved items', () => {
    state = saveCity(state, 'Pune');
    state = updateSavedItemNote(state, 'Pune', 'city', 'Attractive commercial real estate rates');
    expect(state.savedCities[0].personalNote).toBe('Attractive commercial real estate rates');
  });

  it('adds structured research notes with tagging and city/company linkages', () => {
    state = addResearchNote(
      state,
      'Explore Karnataka GCC Policy stamp duty reimbursement for Phase 2 expansion.',
      ['Policy', 'Finance'],
      ['gcc-001'],
      ['Bengaluru']
    );

    expect(state.researchNotes.length).toBe(1);
    expect(state.researchNotes[0].content).toContain('Karnataka GCC Policy');
    expect(state.researchNotes[0].tags).toEqual(['Policy', 'Finance']);
    expect(state.researchNotes[0].relatedCities).toEqual(['Bengaluru']);
  });

  it('serializes and deserializes safely via JSON', () => {
    state = saveCompany(state, 'gcc-001', 'Note 1');
    state = saveCity(state, 'Hyderabad', 'Note 2');
    state = addResearchNote(state, 'Research insight note');

    const serialized = JSON.stringify(state);
    const parsed: ShortlistState = JSON.parse(serialized);

    expect(parsed.savedCompanies.length).toBe(1);
    expect(parsed.savedCities.length).toBe(1);
    expect(parsed.researchNotes.length).toBe(1);
    expect(parsed.savedCompanies[0].itemId).toBe('gcc-001');
    expect(parsed.savedCities[0].itemId).toBe('Hyderabad');
  });
});
