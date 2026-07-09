import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Orbitron } from 'next/font/google';
import './globals.css';
import { KolaProvider } from '@/lib/store';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap', weight: ['400','500','600','700','800'] });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron', weight: ['700', '800', '900'], display: 'swap' });

export const metadata: Metadata = {
  title: 'TUKOLA — Find Work. Hire Workers.',
  description: "Uganda's #1 blue-collar gig marketplace. Connecting workers and employers instantly.",
  manifest: '/manifest.json',
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
      <body className={`${jakarta.variable} ${orbitron.variable} antialiased`} style={{ fontFamily: 'var(--font-jakarta), Plus Jakarta Sans, sans-serif' }}>
        <KolaProvider>
          <div className="min-h-screen bg-[#F0F4FF]">{children}</div>
        </KolaProvider>
      </body>
    </html>
  );
}
