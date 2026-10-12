import ClientLayout from '@/components/ClientLayout';

export default function Template({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
