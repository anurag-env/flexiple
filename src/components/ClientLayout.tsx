'use client';

import AppShell from '@/components/AppShell';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
