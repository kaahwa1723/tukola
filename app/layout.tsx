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
  metadataBase: new URL('https://tukolaapp.com'),
  title: {
    default: 'Tukola — Hire Trusted Fundis in Uganda | Tukola App',
    template: '%s | Tukola',
  },
  description: "Find verified fundis for cleaning, plumbing, construction, beauty & more. Book at set prices, your money is held safely until the job is done. Uganda's trusted worker marketplace.",
  keywords: ['fundis Uganda', 'hire workers Kampala', 'cleaning services Uganda', 'plumber Kampala', 'gig workers Uganda', 'tukola'],
  openGraph: {
    type: 'website',
    url: 'https://tukolaapp.com',
    siteName: 'Tukola',
    title: 'Tukola — Hire Trusted Fundis in Uganda',
    description: 'Verified fundis at set prices. Your money is held safely until the job is done.',
    locale: 'en_UG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tukola — Hire Trusted Fundis in Uganda',
    description: 'Verified fundis at set prices. Your money is held safely until the job is done.',
  },
  robots: { index: true, follow: true },
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
