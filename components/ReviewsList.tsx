'use client';

import { useEffect, useState } from 'react';
import { Star, MessageSquareQuote } from 'lucide-react';

interface Review {
  stars: number | null;
  score: string | null;
  comment: string | null;
  createdAt: string;
  jobCategory: string | null;
  raterFirstName: string;
}

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11} className={i <= n ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200 fill-slate-200'} />
      ))}
    </span>
  );
}

/**
 * Public reviews list — what a fundi's past customers actually wrote.
 * Data comes from GET /api/ratings (job-gated ratings; first names only).
 * Used on the employer hire page (decision point) and the worker's own
 * profile (so they see what customers see).
 */
export default function ReviewsList({ userId, dark = false }: { userId: string; dark?: boolean }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    fetch(`/api/ratings?userId=${encodeURIComponent(userId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setReviews(d.reviews ?? []))
      .catch(() => setReviews([]));
  }, [userId]);

  // Loading or genuinely zero reviews → render nothing (honest empty:
  // the profile already shows "New" for unrated fundis).
  if (!reviews || reviews.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareQuote size={16} className={dark ? 'text-white/60' : 'text-blue-600'} />
        <h3 className={`font-bold text-sm ${dark ? 'text-white' : 'text-[#0A0F2C]'}`}>
          What customers say ({reviews.length})
        </h3>
      </div>
      <div className="space-y-2.5">
        {reviews.map((r, i) => (
          <div key={i}
            className={`rounded-2xl p-3.5 ${dark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                {r.stars != null
                  ? <Stars n={r.stars} />
                  : <span className={`text-[11px] font-bold ${r.score === 'great' ? 'text-green-600' : 'text-amber-600'}`}>
                      {r.score === 'great' ? 'Positive' : 'Mixed'}
                    </span>}
                {r.jobCategory && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500'}`}>
                    {r.jobCategory}
                  </span>
                )}
              </div>
              <span className={`text-[10px] flex-shrink-0 ${dark ? 'text-white/40' : 'text-slate-400'}`}>
                {dateFmt(r.createdAt)}
              </span>
            </div>
            {r.comment && (
              <p className={`text-xs leading-relaxed ${dark ? 'text-white/80' : 'text-slate-600'}`}>
                “{r.comment}”
              </p>
            )}
            <p className={`text-[10px] mt-1 font-semibold ${dark ? 'text-white/40' : 'text-slate-400'}`}>
              — {r.raterFirstName}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
