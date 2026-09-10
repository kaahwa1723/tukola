'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Send, CheckCircle } from 'lucide-react';

const KINDS = [
  { value: 'employer', label: 'I want to hire fundis' },
  { value: 'organisation', label: 'Organisation / business hiring in bulk' },
  { value: 'partnership', label: 'Partnership or collaboration' },
  { value: 'other', label: 'Something else' },
];

/**
 * "Contact us" — landing-page intake aimed at employers and
 * organisations (NGOs, construction firms, hotels…) rather than
 * individual app users. Posts to /api/contact; every submission also
 * triggers an instant notification email to the founder inbox.
 */
export default function ContactSection() {
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState('employer');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          organisation: organisation.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          kind,
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send your message. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all';

  return (
    <section id="contact" className="py-20 md:py-28 bg-surface relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:w-2/5"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary mb-6">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading text-navy mb-5 leading-tight">
              Hiring for a team or organisation?
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Construction firms, hotels, NGOs, offices and events — if you need vetted fundis at scale, tell us what you're building and we'll set you up.
            </p>
            <ul className="space-y-3 text-gray-600">
              {['Verified workers matched to your project', 'Protected payments on every engagement', 'A real human replies within one working day'].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-black mt-0.5 shrink-0">✓</span>
                  <span className="font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:w-3/5 w-full bg-white rounded-3xl border border-gray-100 shadow-[0_16px_48px_rgba(41,82,232,0.10)] p-6 md:p-8"
          >
            {sent ? (
              <div className="text-center py-10">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-5" />
                <h3 className="text-2xl font-bold font-heading text-navy mb-3">Message received!</h3>
                <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
                  Thank you, {name.split(' ')[0]}. We've got your enquiry and will reply to <span className="font-semibold">{email}</span> within one working day.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ct-name" className="block text-sm font-semibold text-gray-700 mb-1.5">Your name</label>
                    <input id="ct-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required placeholder="Full name" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="ct-org" className="block text-sm font-semibold text-gray-700 mb-1.5">Organisation <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input id="ct-org" type="text" value={organisation} onChange={(e) => setOrganisation(e.target.value)} maxLength={150} placeholder="Company or organisation" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ct-email" className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                    <input id="ct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required placeholder="you@company.com" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="ct-phone" className="block text-sm font-semibold text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input id="ct-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="07XX XXX XXX" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label htmlFor="ct-kind" className="block text-sm font-semibold text-gray-700 mb-1.5">What brings you here?</label>
                  <select id="ct-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ct-message" className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
                  <textarea id="ct-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} required placeholder="Tell us what you need — how many fundis, what kind of work, when…" className={`${inputCls} resize-none`} />
                </div>

                {error && (
                  <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || !name.trim() || !email.trim() || !message.trim()}
                  className="btn-gradient w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
