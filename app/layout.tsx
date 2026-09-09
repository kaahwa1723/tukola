import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import { KolaProvider } from '@/lib/store';
import { I18nProvider } from '@/lib/i18n';
import BootSplash from '@/components/BootSplash';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', weight: ['400','500','600','700','800'] });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron', weight: ['700', '800', '900'], display: 'swap' });

export const metadata: Metadata = {
  title: 'TUKOLA — Find Work. Hire Workers.',
  description: "Kampala's fundi marketplace. Hire rated fundis with escrow-protected payments, or find work and get paid on release.",
  manifest: '/manifest.json',
  icons: { icon: '/favicon.png?v=2', apple: '/apple-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2952E8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${orbitron.variable} antialiased`} style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
        <KolaProvider>
          <I18nProvider>
            <BootSplash />
            <ServiceWorkerRegister />
            <div className="min-h-screen bg-[#F0F4FF]">{children}</div>
          </I18nProvider>
        </KolaProvider>
      </body>
    </html>
  );
}
