import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ResponsiveLayout basePath="worker" messageBadge={3}>
      {children}
    </ResponsiveLayout>
  );
}
