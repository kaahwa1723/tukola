import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ResponsiveLayout basePath="worker">
      {children}
    </ResponsiveLayout>
  );
}
