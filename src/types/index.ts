// ── Core Data Types for GCC Atlas ──

export type ConfidenceLevel = 'verified' | 'likely' | 'unverified' | 'unknown';

export interface EvidenceSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publicationDate?: string;       // ISO date string when available
  category: 'government' | 'industry-report' | 'company-announcement' | 'news' | 'research' | 'directory';
  claimsSupported: string[];       // What this source establishes
  lastCheckedDate?: string;        // When we last verified the link
  confidenceNotes?: string;
}

export interface GCCCompany {
  id: string;
  companyName: string;
  parentHQ: string;                // Country/City of parent headquarters
  indianCities: string[];
  industry: string;
  functions: string[];             // e.g. ['Engineering', 'Data Science', 'Product']
  evidenceSourceIds: string[];     // Links to EvidenceSource
  evidenceUrl?: string;            // Primary evidence URL
  sourcePublicationDate?: string;
  lastVerifiedDate?: string;
  confidence: ConfidenceLevel;
  notes?: string;                  // What the evidence establishes
  employeeCountIndia?: number | 'unknown';
  yearEstablished?: number | 'unknown';
}

export interface CityMetric {
  id: string;
  cityName: string;
  criterionKey: string;
  criterionLabel: string;
  value: number | string | 'unknown';
  unit?: string;
  score?: number;                  // Normalized 1–10 or undefined if unknown
  evidenceSourceIds: string[];
  notes?: string;
  dataYear?: number;
}

export interface CityProfile {
  name: string;
  state: string;
  description: string;
  metrics: CityMetric[];
  strengths: string[];
  limitations: string[];
  evidenceSourceIds: string[];
}

export interface ResearchNote {
  id: string;
  content: string;
  relatedCompanyIds?: string[];
  relatedCities?: string[];
  evidenceSourceIds?: string[];
  createdAt: string;               // ISO date string
  tags?: string[];
}

export interface CityAssessment {
  id: string;
  name: string;
  cityNames: string[];
  weights: Record<string, number>; // criterionKey → weight (0–100)
  createdAt: string;
  notes?: string;
}

export interface SavedItem {
  id: string;
  type: 'company' | 'city' | 'note';
  itemId: string;
  savedAt: string;
  personalNote?: string;
}

export interface ShortlistState {
  savedCompanies: SavedItem[];
  savedCities: SavedItem[];
  researchNotes: ResearchNote[];
}

// ── Criteria for city comparison ──
export interface ComparisonCriterion {
  key: string;
  label: string;
  description: string;
  category: 'talent' | 'ecosystem' | 'cost' | 'government' | 'industry';
}

// ── AI Copilot types ──
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: EvidenceSource[];
  timestamp: string;
}

export interface RetrievedContext {
  companies: GCCCompany[];
  sources: EvidenceSource[];
  cityMetrics: CityMetric[];
  relevanceNotes: string;
}
