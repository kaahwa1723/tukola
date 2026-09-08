import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tukola',
  description: 'How Tukola collects, uses, and protects your personal data, under Uganda\'s Data Protection and Privacy Act, 2019.',
};

const sections = [
  {
    title: '1. Who we are',
    body: `Tukola is a marketplace platform operating in Kampala, Uganda that connects households and businesses with vetted blue-collar workers ("fundis"). This policy explains what personal data we collect, why, and how we protect it, in line with the Data Protection and Privacy Act, 2019 (Uganda).`,
  },
  {
    title: '2. What we collect',
    list: [
      'Phone number — used as your account identity and for login codes (OTP).',
      'Name and role (employer or fundi) — to operate the marketplace.',
      'Fundi profiles — skills, work area, and verification status.',
      'Job details — titles, descriptions, locations, photos you upload, and prices.',
      'Payment records — amounts, mobile-money references, and receipts.',
      'Messages sent through in-app chat.',
      'Approximate location (parish/area level) — only when you use location features. We do not track your precise GPS.',
    ],
  },
  {
    title: '3. Why we collect it (purpose)',
    body: `We use your data only to run the service: creating your account, matching fundis to jobs, holding and releasing payments in escrow, resolving disputes and guarantee claims, and preventing fraud. We do not sell your data to anyone.`,
  },
  {
    title: '4. When we share data',
    list: [
      'Between job parties: an employer sees a fundi\'s profile; contact details are only shared after payment is secured in escrow.',
      'Payment providers (e.g. MTN Mobile Money) — only what is needed to process your payment.',
      'SMS providers — your phone number, to deliver login codes.',
      'Where required by Ugandan law or a lawful authority request.',
    ],
  },
  {
    title: '5. How long we keep data',
    list: [
      'Login codes (OTP): deleted after 10 minutes.',
      'Accounts, jobs, and messages: kept while your account is active, and up to 24 months after, unless you ask us to delete sooner.',
      'Payment and receipt records: kept for 7 years, as required for tax and financial records (EFRIS/URA).',
    ],
  },
  {
    title: '6. Your rights',
    body: `Under the Data Protection and Privacy Act, you may ask us to: show you the data we hold about you, correct it, or delete it (except records we must keep by law, such as payment records). To make a request, contact us through the app or at the email below. We respond within 30 days.`,
  },
  {
    title: '7. Security',
    body: `Passwords are never used — login is by one-time SMS code with server-side sessions. Payment data is handled by licensed providers. Access to our database is restricted and encrypted in transit. No system is perfectly secure, but protecting your data is a core design requirement of Tukola, not an afterthought.`,
  },
  {
    title: '8. Analytics',
    body: `We collect anonymous product analytics (e.g. which features are used) to improve the service. These are counts of actions, not recordings of you.`,
  },
  {
    title: '9. Changes and contact',
    body: `If we change this policy we will update this page and the date below. Questions or requests: contact us through the Tukola app or at privacy@tukola.com.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <div className="bg-gradient-to-r from-[#1A2DB8] via-primary to-accent py-14 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h1 className="font-heading font-bold text-white text-3xl md:text-4xl">Privacy Policy</h1>
          <p className="text-blue-100 mt-3">Last updated: September 2026 · Kampala, Uganda</p>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 max-w-3xl py-10 md:py-14 space-y-8">
        {sections.map(s => (
          <section key={s.title}>
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
