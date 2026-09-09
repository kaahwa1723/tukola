'use client';

import { useState } from 'react';
import { Star, Send, CheckCircle } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useKola } from '@/lib/store';

/**
 * In-app feedback page (/feedback) for logged-in users.
 * Name and role are prefilled from the session profile (useKola store,
 * same as the profile pages); both stay editable. Posts to /api/feedback
 * with source 'app'.
 */
export default function FeedbackPage() {
  const { user } = useKola();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const homePath = user?.role === 'employer' ? '/employer' : '/worker';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          role: user?.role,
          rating: rating ?? undefined,
          message: message.trim(),
          source: 'app',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send your feedback. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <MobileHeader title="Send Feedback" showBack backHref={homePath} />

      <div className="px-4 lg:px-6 py-5 max-w-2xl mx-auto space-y-4">
        <p className="text-slate-500 text-sm leading-relaxed animate-slide-up">
          Tell us what&apos;s working and what isn&apos;t — your feedback shapes what we build next.
        </p>

        <div className="bg-white rounded-2xl p-5 animate-slide-up"
          style={{ border: '1px solid rgba(41,82,232,0.08)', boxShadow: '0 2px 12px rgba(41,82,232,0.05)' }}>
          {sent ? (
            <div className="text-center py-8">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-black text-[#0A0F2C] mb-2">Thank you!</h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
                Your feedback has been received. We read every message.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {/* Star rating (optional) */}
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      aria-label={`Rate ${star} out of 5`}
                      className="p-1.5 transition-transform active:scale-90"
                    >
                      <Star
                        size={30}
                        className={`transition-colors ${
                          rating != null && star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400 font-semibold">Tap to rate (optional)</span>
              </div>

              <div>
                <label htmlFor="app-fb-name" className="block text-sm font-bold text-[#0A0F2C] mb-1.5">Name</label>
                <input
                  id="app-fb-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label htmlFor="app-fb-email" className="block text-sm font-bold text-[#0A0F2C] mb-1.5">
                  Email <span className="text-slate-400 font-semibold">(optional)</span>
                </label>
                <input
                  id="app-fb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={200}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label htmlFor="app-fb-message" className="block text-sm font-bold text-[#0A0F2C] mb-1.5">Message</label>
                <textarea
                  id="app-fb-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  required
                  placeholder="Tell us what you think…"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm font-semibold bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}
              >
                <Send size={16} strokeWidth={2.5} />
                {sending ? 'Sending…' : 'Send Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
