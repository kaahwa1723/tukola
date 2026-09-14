import Link from 'next/link';
import type { Metadata } from 'next';
import { MessageCircle, Phone, ShieldCheck, Wallet, Star, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help & Support — Tukola',
  description: 'How Tukola works: booking a fundi, payment protection, the wallet, the guarantee, and how to reach support.',
};

const faqs = [
  {
    icon: Search,
    q: 'How do I hire a fundi?',
    a: 'Browse services with set prices and tap "Book at this price", or post a job and let fundis apply. The fundi accepts, you fund the job with Mobile Money, and the money is held safely until you confirm the work is done.',
  },
  {
    icon: ShieldCheck,
    q: 'How does payment protection work?',
    a: 'Your money is held by Tukola — the fundi never gets it upfront. When the work is done, the fundi marks it complete and you confirm. Only then is the money released. If you don\'t respond, it releases automatically after 48 hours.',
  },
  {
    icon: Wallet,
    q: 'What is the Tukola wallet?',
    a: 'You can load money once via Mobile Money (Profile → My Wallet → Load) and then fund jobs instantly — no PIN prompt each time. Refunds also land back in your wallet.',
  },
  {
    icon: Star,
    q: 'What is the Tukola Guarantee?',
    a: 'If a job funded through Tukola goes wrong, you may be covered up to UGX 200,000. Open a dispute from the job page and our team reviews it. Jobs settled in cash outside the app are never covered.',
  },
  {
    icon: MessageCircle,
    q: 'When can I chat with a fundi or employer?',
    a: 'Chat opens once there is an application or booking between you and the other person on a job. Phone numbers stay hidden until money is held — this protects both sides.',
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Help & Support</h1>
        <p className="text-slate-500 mb-8">Everything you need to use Tukola with confidence.</p>

        <div className="space-y-4 mb-10">
          {faqs.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.q} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Icon size={15} className="text-blue-600" />
                  </div>
                  <h2 className="font-bold text-slate-900 text-sm">{f.q}</h2>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{f.a}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">Talk to us</h2>
          <div className="space-y-2.5 text-sm">
            <a href="https://wa.me/256754744330?text=Hi%20Tukola%2C%20I%20need%20help"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-green-700 font-semibold">
              <MessageCircle size={16} /> WhatsApp: 0754 744 330
            </a>
            <a href="tel:+256754744330" className="flex items-center gap-2.5 text-blue-700 font-semibold">
              <Phone size={16} /> Call: 0754 744 330
            </a>
            <Link href="/feedback" className="flex items-center gap-2.5 text-blue-700 font-semibold">
              <MessageCircle size={16} /> Send feedback in the app
            </Link>
          </div>
          <p className="text-slate-400 text-xs mt-4">
            Legal: <Link href="/privacy" className="underline">Privacy Policy</Link> · <Link href="/terms" className="underline">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
