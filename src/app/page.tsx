'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Search,
  ArrowRight,
  BookOpen,
  Globe,
  TrendingUp,
  FileText,
  MessageSquare,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { gccCompanies, evidenceSources, cityProfiles } from '@/data';

const exampleQuestions = [
  'Which city should I investigate for an AI engineering GCC?',
  'What evidence supports choosing Hyderabad over Pune?',
  'Which companies operate engineering centres in Bengaluru?',
  'What government incentives should I investigate for a GCC?',
];

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Derive stats from actual dataset
  const stats = useMemo(() => {
    const citySet = new Set<string>();
    const industrySet = new Set<string>();
    const functionSet = new Set<string>();
    gccCompanies.forEach(c => {
      c.indianCities.forEach(city => citySet.add(city));
      industrySet.add(c.industry);
      c.functions.forEach(f => functionSet.add(f));
    });
    return {
      totalCompanies: gccCompanies.length,
      totalCities: citySet.size,
      totalIndustries: industrySet.size,
      totalSources: evidenceSources.length,
      totalFunctions: functionSet.size,
    };
  }, []);

  // City distribution from actual data
  const cityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    gccCompanies.forEach(c => {
      c.indianCities.forEach(city => {
        counts[city] = (counts[city] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, []);

  // Industry distribution from actual data
  const industryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    gccCompanies.forEach(c => {
      counts[c.industry] = (counts[c.industry] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return gccCompanies
      .filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.indianCities.some(city => city.toLowerCase().includes(q)) ||
        c.functions.some(f => f.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold text-navy-900">
          GCC Atlas
        </h1>
        <p className="mt-2 text-base text-navy-600 max-w-2xl">
          India&apos;s GCC Decision Workspace. Research evidence-backed insights on Global Capability Centres across Indian cities to make informed location decisions.
        </p>
      </header>

      {/* Search Bar */}
      <div className="relative max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
          <input
            type="text"
            placeholder="Search companies, cities, industries, or functions…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-navy-200 rounded-xl text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-shadow"
            id="dashboard-search"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-navy-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {searchResults.map(company => (
              <Link
                key={company.id}
                href={`/explorer?search=${encodeURIComponent(company.companyName)}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-navy-50 transition-colors border-b border-navy-100 last:border-b-0"
              >
                <Building2 className="w-4 h-4 text-navy-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{company.companyName}</p>
                  <p className="text-xs text-navy-500 truncate">
                    {company.industry} · {company.indianCities.join(', ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <Link
        href="/cities"
        className="inline-flex items-center gap-2 px-5 py-3 bg-accent-600 text-white text-sm font-medium rounded-xl hover:bg-accent-700 transition-colors shadow-sm"
        id="start-assessment-cta"
      >
        <MapPin className="w-4 h-4" />
        Start a GCC Location Assessment
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* Stats Grid */}
      <section aria-label="Dataset Overview">
        <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-4">
          Curated Dataset Coverage
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Companies', value: stats.totalCompanies, icon: Building2, href: '/explorer' },
            { label: 'Cities', value: stats.totalCities, icon: MapPin, href: '/cities' },
            { label: 'Industries', value: stats.totalIndustries, icon: TrendingUp, href: '/explorer' },
            { label: 'Evidence Sources', value: stats.totalSources, icon: FileText, href: '/evidence' },
            { label: 'Functions Tracked', value: stats.totalFunctions, icon: Globe, href: '/explorer' },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white border border-navy-100 rounded-xl p-4 hover:border-accent-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-navy-400 group-hover:text-accent-500 transition-colors" />
                <span className="text-xs font-medium text-navy-500 uppercase tracking-wide">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-navy-400">
          Statistics derived from the curated GCC Atlas dataset. Data sources last checked October 2025.
        </p>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Data visualizations">
        {/* City Distribution */}
        <div className="bg-white border border-navy-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-navy-700 mb-4">Companies by City (in dataset)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityDistribution} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#627d98' }} />
                <YAxis type="category" dataKey="city" tick={{ fontSize: 12, fill: '#334e68' }} width={90} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}
                  formatter={(value) => [`${value ?? 0} companies`, 'Count']}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-navy-400 mt-2">Based on {stats.totalCompanies} curated company records</p>
        </div>

        {/* Industry Distribution */}
        <div className="bg-white border border-navy-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-navy-700 mb-4">Companies by Industry (in dataset)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={industryDistribution} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#627d98' }} />
                <YAxis type="category" dataKey="industry" tick={{ fontSize: 12, fill: '#334e68' }} width={140} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}
                  formatter={(value) => [`${value ?? 0} companies`, 'Count']}
                />
                <Bar dataKey="count" fill="#1d4ed8" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-navy-400 mt-2">Industry classification based on primary business of parent company</p>
        </div>
      </section>

      {/* City Comparison Preview */}
      <section aria-label="City comparison preview">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider">City Comparison Preview</h2>
          <Link href="/cities" className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
            Full comparison <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cityProfiles.map(city => (
            <div key={city.name} className="bg-white border border-navy-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-accent-500" />
                <h3 className="text-base font-semibold text-navy-900">{city.name}</h3>
                <span className="text-xs text-navy-400">{city.state}</span>
              </div>
              <p className="text-sm text-navy-600 mb-3 line-clamp-2">{city.description}</p>
              <div className="space-y-1.5">
                {city.strengths.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-navy-600">
                    <span className="text-success mt-0.5">✓</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Example Research Questions */}
      <section aria-label="Example research questions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Example Research Questions
          </h2>
          <Link href="/copilot" className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
            Open AI Copilot <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleQuestions.map((q, i) => (
            <Link
              key={i}
              href={`/copilot?q=${encodeURIComponent(q)}`}
              className="bg-white border border-navy-100 rounded-xl px-4 py-3 text-sm text-navy-700 hover:border-accent-200 hover:text-accent-700 transition-all flex items-center gap-3 group"
            >
              <MessageSquare className="w-4 h-4 text-navy-300 group-hover:text-accent-400 shrink-0 transition-colors" />
              <span>{q}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Data Coverage Notice */}
      <section className="bg-navy-50 border border-navy-100 rounded-xl p-5" aria-label="Data coverage notice">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-navy-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-navy-700 mb-1">About This Dataset</h3>
            <p className="text-sm text-navy-600 leading-relaxed">
              GCC Atlas contains a curated sample of {stats.totalCompanies} companies and {stats.totalSources} evidence sources.
              This is not a comprehensive database of all GCCs in India. Data has been sourced from government publications,
              company announcements, and industry reports. Each record is linked to its evidence source.
              Fields marked &ldquo;unknown&rdquo; indicate data that could not be independently verified.
            </p>
            <p className="text-xs text-navy-400 mt-2">
              Key sources: NASSCOM-Zinnov India GCC Landscape 2024 · India Economic Survey 2025–26 · Karnataka GCC Policy 2024–2029 · Company career/about pages
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
