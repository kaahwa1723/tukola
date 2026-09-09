'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, CheckCircle, MessageSquareHeart } from 'lucide-react';

/**
 * "Send us feedback" — landing-page intake near the footer.
 * Posts to /api/feedback with source 'landing'. Name, email and rating
 * are all optional; only the message is required (matches the API).
 */
export default function FeedbackSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          rating: rating ?? undefined,
          message: message.trim(),
          source: 'landing',
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
    <section className="py-20 md:py-28 bg-dark-bg relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 mb-6">
              <MessageSquareHeart className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-white mb-4">Send Us Feedback</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Tukola is built for Uganda&apos;s fundis and the people who hire them.
              Tell us what&apos;s working — and what isn&apos;t.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
            className="backdrop-blur-[16px] bg-white/[0.06] border border-white/[0.12] rounded-3xl p-6 md:p-8"
          >
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-5" />
                <h3 className="text-2xl font-bold font-heading text-white mb-3">Thank you!</h3>
                <p className="text-gray-400 leading-relaxed max-w-md mx-auto">
                  Your feedback has been received. We read every message and it shapes what we build next.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {/* Star rating (optional) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(rating === star ? null : star)}
                        aria-label={`Rate ${star} out of 5`}
                        className="p-1.5 transition-transform active:scale-90"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            rating != null && star <= rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-600 hover:text-gray-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Tap to rate (optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fb-name" className="block text-sm font-medium text-gray-300 mb-2">Name <span className="text-gray-500">(optional)</span></label>
                    <input
                      id="fb-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder="Your name"
                      className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="fb-email" className="block text-sm font-medium text-gray-300 mb-2">Email <span className="text-gray-500">(optional)</span></label>
                    <input
                      id="fb-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={200}
                      placeholder="you@example.com"
                      className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="fb-message" className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    id="fb-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    required
                    placeholder="Tell us what you think…"
                    className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="btn-gradient w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
