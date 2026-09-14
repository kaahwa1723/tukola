import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Tukola',
  description: 'The terms for using Tukola — escrow payments, the 10% fee, the Tukola Guarantee, and marketplace rules.',
};

const sections = [
  {
    id: 'agreement',
    title: '1. The agreement',
    body: `By using Tukola you agree to these terms. Tukola is a marketplace: we connect customers with independent fundis. Fundis are not Tukola employees — they are independent service providers whose identity we verify (National ID plus two reference calls) before they can display the "ID-verified" badge.`,
  },
  {
    id: 'accounts',
    title: '2. Accounts',
    body: `Your account is tied to your phone number, verified by one-time SMS code. You are responsible for activity on your account. One person, one account — do not create multiple accounts or share login codes.`,
  },
  {
    id: 'payments',
    title: '3. Payments and escrow',
    list: [
      'All jobs must be paid through Tukola. Paying a fundi outside the platform to avoid fees breaks these terms and removes your guarantee protection.',
      'When you pay, the money is held in escrow — the fundi can see it is secured, but cannot withdraw it yet.',
      'When the work is done, the fundi marks the job complete and you confirm. Only then is the money released.',
      'If you do not confirm or dispute within 48 hours of completion, the payment is released automatically.',
      'Mobile money payments require your MoMo PIN each time — this is how mobile money works in Uganda, not a Tukola limitation.',
    ],
  },
  {
    id: 'fees',
    title: '4. Fees',
    body: `Tukola charges a flat 10% platform fee on completed platform-paid jobs, deducted from the job amount before the fundi is paid — the fundi always receives 90%. There are no subscription fees, no listing fees, and no hidden charges. A further 2% of every completed job goes into the guarantee reserve (see below) — this does not change what you pay.`,
  },
  {
    id: 'guarantee',
    title: '5. The Tukola Guarantee',
    body: `If work paid through Tukola goes wrong, you can file a guarantee claim from the completed job. Our team reviews every claim. If approved, we arrange a re-do or refund you up to UGX 200,000 from the guarantee reserve. The guarantee only covers jobs that were paid through the platform — off-platform payments are not covered.`,
  },
  {
    id: 'conduct',
    title: '6. Marketplace rules',
    list: [
      'Be honest: real names, real job descriptions, real reviews of work actually done.',
      'No exchanging phone numbers or payment details in chat to avoid platform fees — this is measured and repeated attempts can lead to suspension.',
      'No illegal work, harassment, or discrimination.',
      'Ratings must reflect real completed jobs.',
    ],
  },
  {
    id: 'disputes',
    title: '7. Disputes',
    body: `If something goes wrong, open a dispute from the job page before confirming completion. Funds stay held while our team reviews. Our decision on release or refund is based on the job record, messages, and evidence from both sides.`,
  },
  {
    id: 'liability',
    title: '8. Liability',
    body: `Tukola provides the marketplace, verification, escrow, and guarantee mechanisms described above. We are not liable for the quality of a fundi's work beyond the guarantee terms, nor for losses from events outside our control (network outages, mobile-money downtime, government shutdowns). Nothing in these terms removes rights you have under Ugandan law.`,
  },
  {
    id: 'changes',
    title: '9. Changes and contact',
    body: `We may update these terms; the current version is always on this page with its date. Continued use after an update means you accept it. Questions: contact us through the Tukola app or at support@tukola.com. These terms are governed by the laws of Uganda.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <div className="bg-gradient-to-r from-[#1A2DB8] via-primary to-accent py-14 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h1 className="font-heading font-bold text-white text-3xl md:text-4xl">Terms of Service</h1>
          <p className="text-blue-100 mt-3">Last updated: September 2026 · Kampala, Uganda</p>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 max-w-3xl py-10 md:py-14 space-y-8">
        {sections.map(s => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="font-heading font-bold text-[#0A0F2C] text-lg md:text-xl mb-2">{s.title}</h2>
            {s.body && <p className="text-slate-600 leading-relaxed">{s.body}</p>}
            {s.list && (
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 leading-relaxed">
                {s.list.map(item => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
        <div className="pt-6 border-t border-slate-200">
          <Link href="/" className="text-primary font-semibold hover:underline">← Back to Tukola</Link>
        </div>
      </div>
    </div>
  );
}
