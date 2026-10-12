'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  MessageSquare,
  Library,
  Bookmark,
  Menu,
  X,
  Globe,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'GCC Explorer', href: '/explorer', icon: Building2 },
  { name: 'City Workspace', href: '/cities', icon: MapPin },
  { name: 'AI Copilot', href: '/copilot', icon: MessageSquare },
  { name: 'Evidence Library', href: '/evidence', icon: Library },
  { name: 'Research Shortlist', href: '/shortlist', icon: Bookmark },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-navy-950 text-white border-r border-navy-800">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-800">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-600">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">GCC Atlas</h1>
            <p className="text-xs text-navy-400">India Decision Workspace</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-600/20 text-accent-300'
                    : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-navy-800">
          <div className="text-xs text-navy-500">
            <p>Curated dataset · Not live data</p>
            <p className="mt-1">Last updated: Oct 2025</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-navy-950 text-white border-b border-navy-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-600">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">GCC Atlas</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-navy-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav className="px-3 pb-3 space-y-1 border-t border-navy-800" aria-label="Mobile navigation">
            {navigation.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-600/20 text-accent-300'
                      : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-warm-50 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
