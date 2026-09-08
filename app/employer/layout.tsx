import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ResponsiveLayout basePath="employer">
      {children}
    </ResponsiveLayout>
  );
}
