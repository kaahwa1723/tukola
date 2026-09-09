'use client';

import { useEffect, useState } from 'react';
import { MessageSquareHeart, RefreshCw, Star, MessageSquare } from 'lucide-react';

interface FeedbackItem {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  message: string;
  rating: number | null;
  source: string | null;
  created_at: string;
}

const ROLE_COLOR: Record<string, string> = {
  employer: 'bg-blue-100 text-blue-700',
  worker: 'bg-green-100 text-green-700',
  visitor: 'bg-slate-100 text-slate-600',
};

const SOURCE_COLOR: Record<string, string> = {
  landing: 'bg-purple-100 text-purple-700',
  app: 'bg-cyan-100 text-cyan-700',
};

/**
 * Admin feedback inbox (Phase: feedback feature).
 * Live data from GET /api/admin/feedback — newest first. Read-only:
 * submissions arrive from POST /api/feedback (landing + in-app).
 */
export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/feedback');
      if (!res.ok) {
        setError('Could not load feedback. You may need to sign in again.');
        return;
      }
      const data = await res.json();
      setItems(data.feedback ?? []);
    } catch {
      setError('Network error loading feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageSquareHeart size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Feedback</h1>
            <p className="text-slate-500 text-sm">Messages from the landing page and the in-app feedback form</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
        <p className="font-semibold text-blue-900 text-sm">
          {items.length} message{items.length === 1 ? '' : 's'} received
        </p>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{item.name || 'Anonymous'}</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  {item.email || 'No email given'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.rating != null && (
                  <span className="flex items-center gap-0.5" aria-label={`Rated ${item.rating} out of 5`}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={13}
                        className={star <= (item.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} />
                    ))}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3 mb-4">
              <MessageSquare size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700 text-sm whitespace-pre-wrap">{item.message}</p>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {item.role && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${ROLE_COLOR[item.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {item.role}
                  </span>
                )}
                {item.source && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${SOURCE_COLOR[item.source] ?? 'bg-slate-100 text-slate-600'}`}>
                    {item.source === 'landing' ? 'Landing page' : 'In-app'}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs">
                {new Date(item.created_at).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {new Date(item.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {!loading && items.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon"><MessageSquareHeart size={30} color="#2952E8" /></div>
            <p className="empty-title">No feedback yet</p>
            <p className="empty-sub">Messages sent from the landing page or the in-app feedback form will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
