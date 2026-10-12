# GCC Atlas — India's GCC Decision Workspace

> **Evidence-informed decision platform for international companies evaluating, benchmarking, and establishing Global Capability Centres (GCCs) in India.** Built for the Flexiple Product Intern assignment.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/Google-Gemini_2.0_Flash-orange?logo=google)](https://ai.google.dev/)
[![Deployment](https://img.shields.io/badge/Vercel-Ready-black?logo=vercel)](https://vercel.com/)

---

## 1. Product Objective

Setting up a Global Capability Centre in India is a multi-million-dollar strategic commitment. Today, leadership teams face a dilemma:
- **Generic directories** list company names with zero provenance, outdated headcounts, and no methodology.
- **Consulting reports** offer high-level static PDF charts that cannot be customized to an organization's specific priorities.

**GCC Atlas** solves this by providing:
1. **Decision Workspaces**: Configurable multi-criteria decision models for city selection (Bengaluru, Hyderabad, Pune).
2. **Explicit Evidence Provenance**: Every statistic, policy claim, and company presence is tied directly to a verifiable primary source.
3. **AI Research Copilot**: A server-side conversational research assistant powered by Google Gemini that retrieves relevant evidence passages before answering, explicitly distinguishing verified facts, estimates, assumptions, and unknowns.
4. **Local Executive Shortlist**: Local session persistence for shortlisted peer centres, candidate cities, and analyst hypotheses—with one-click Markdown briefing export.

---

## 2. Core Modules

### A. Overview Dashboard (`/`)
- High-level KPIs computed directly from the curated dataset (verified GCCs, covered cities, evidence sources, policies).
- Distribution charts showing presence across cities and industry clusters.
- Quick scenario launchers and recently verified corporate centres.
- Methodology disclosure: no synthetic statistics.

### B. GCC Explorer (`/`)
- Searchable and filterable directory of 25+ curated GCC entities (e.g., Google, Microsoft, SAP Labs, JPMorgan Chase, Mercedes-Benz R&D, Cisco, Wells Fargo).
- Multi-dimensional filters: City (Bengaluru, Hyderabad, Pune, etc.), Industry (Technology, Financial Services, Automotive, Retail), and Functions (Engineering, AI/ML, Cloud, Data Science, Risk).
- Confidence badges (`verified`, `likely`, `unverified`, `unknown`).
- Slide-over detail drawer with parent HQ, established year, supporting evidence citations, and one-click bookmarking.

### C. City Decision Workspace (`/cities`)
- Side-by-side comparative analysis of **Bengaluru**, **Hyderabad**, and **Pune**.
- Configurable priority weight sliders (0–100) across 5 core evaluation pillars:
  - Access to Technology Talent
  - Existing GCC Ecosystem Maturity
  - Office Market Costs & Scalability
  - State Government Policies & Subsidies
  - Relevant Industry Peer Presence
- Dynamic Recharts Radar Chart visualization of comparative strengths.
- Transparent mathematical scoring breakdown: shows exact weight distribution, normalized metrics, data coverage, and limitations.

### D. AI Research Copilot (`/copilot`)
- Natural-language Q&A interface grounded in the local evidence database.
- Uses lightweight lexical BM25-style retrieval over company profiles, city metrics, and policy citations before passing context to Gemini.
- Strict system prompt guardrails:
  - Distinguishes between **verified facts**, **estimates**, **assumptions**, and **unknowns**.
  - Must provide clickable source URLs.
  - Zero hallucination allowed; explicitly admits when evidence is missing.
- Graceful fallback: If `GEMINI_API_KEY` is not configured, the copilot displays a friendly message while the entire rest of the platform remains 100% operational.

### E. Evidence Library (`/evidence`)
- Comprehensive audit trail of all 20+ primary and secondary sources.
- Includes key benchmarks:
  - *India Economic Survey 2025–26* (Services Sector GCC discussion)
  - *NASSCOM–Zinnov India GCC Landscape 2024–2026*
  - *Karnataka GCC Policy 2024–2029*
  - *Telangana IT Policy Framework 2021–2026*
  - *Maharashtra IT/ITeS Policy 2023*
  - Corporate SEC/press disclosures (Microsoft IDC, Mercedes-Benz R&D India, etc.)
  - Flexiple GCC directory & statistics reference attribution
- Category filtering, search, and dynamic cross-referencing showing every company and city that cites each source.

### F. Research Shortlist & Notes (`/shortlist`)
- Client-side persistence via `localStorage` (zero login or auth friction).
- Organizes saved GCCs, target cities, and custom analyst notes.
- In-place note editor to attach internal hypotheses (e.g. "Assess stamp duty exemption for 200-seat tech hub").
- **Export Decision Brief**: Generates and downloads a formatted Markdown briefing document ready for executive distribution.

---

## 3. Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict typing across all data models)
- **Styling**: Tailwind CSS with enterprise color system (Warm slate, Navy-950, Cobalt blue accent)
- **Visualizations**: Recharts (Responsive bar charts and radar charts)
- **Icons**: Lucide React
- **AI Integration**: `@google/generative-ai` (Gemini 2.0 Flash) via Next.js Server-Side Route (`/api/copilot`)

### Directory Structure

```
gcc-atlas/
├── public/                 # Static assets
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── copilot/    # POST route for Gemini API + grounded context
│   │   ├── cities/         # City Decision Workspace
│   │   ├── copilot/        # AI Research Copilot Chat Interface
│   │   ├── evidence/       # Evidence Library & Provenance
│   │   ├── explorer/       # GCC Search & Filter Directory
│   │   ├── shortlist/      # Saved Items, Notes & Briefing Export
│   │   ├── globals.css     # Design tokens and custom theme utilities
│   │   ├── layout.tsx      # Root HTML & metadata layout
│   │   └── page.tsx        # Overview Executive Dashboard
│   ├── components/
│   │   ├── AppShell.tsx    # Desktop sidebar & mobile navigation drawer
│   │   └── ClientLayout.tsx# Responsive container layout
│   ├── data/
│   │   ├── cities.ts       # Evaluated cities and multi-criteria metrics
│   │   ├── companies.ts    # 25+ verified GCC enterprise records
│   │   ├── index.ts        # Central data exports
│   │   └── sources.ts      # Curated primary & secondary source citations
│   ├── lib/
│   │   ├── retrieval.ts    # Lexical context retrieval engine for AI copilot
│   │   └── shortlist.ts    # LocalStorage persistence service
│   └── types/
│       └── index.ts        # TypeScript schemas (GCCCompany, CityMetric, EvidenceSource, etc.)
├── .env.example            # Environment variable template
├── .gitignore              # Ignores .env files while keeping .env.example
├── next.config.ts          # Next.js build configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # Product documentation
```

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 18.18+ or Node.js 20+
- npm or yarn or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd gcc-atlas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional for Copilot):**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   > *Note:* If no API key is provided, the Overview, Explorer, City Workspace, Evidence Library, and Shortlist features work completely fine. The AI Copilot will display an informative prompt explaining that the key is missing.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 5. Verification & Testing

To test and compile the production build:

```bash
# Run Next.js production build
npm run build

# Run production server
npm run start
```

All 6 core routes are pre-rendered statically with zero compile or lint warnings.

---

## 6. Public Deployment on Vercel

GCC Atlas is 100% Vercel-ready:

1. **Push code to GitHub / GitLab / Bitbucket**.
2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and select the repository.
   - Framework preset: **Next.js**.
   - Root directory: `./` (or `gcc-atlas` if nested).
3. **Environment Variables**:
   - Add `GEMINI_API_KEY` in Vercel Project Settings > Environment Variables.
4. **Deploy**:
   - Click **Deploy**. Vercel will build and assign a production URL.

---

## 7. Data Provenance & Ethics Policy

- **No Artificial Metrics**: GCC Atlas does not fabricate rental yields, average salaries, or employee counts. If a datapoint is not verified from an authoritative source, it is marked `unknown`.
- **Source Attribution**: All entries link to original publishers (Government of Karnataka, Government of Telangana, Government of Maharashtra, NASSCOM, Zinnov, Ministry of Finance, corporate filings).
- **Flexiple Attribution**: Flexiple's public GCC directory and market statistics are cited as reference benchmarks, adhering to fair attribution guidelines without scraping proprietary datasets.
