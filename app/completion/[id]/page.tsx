'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, ChevronLeft, Star, Search, PartyPopper } from 'lucide-react';
import { useKola } from '@/lib/store';

export default function CompletionPage() {
  const { id } = useParams<{ id: string }>();
  const { jobs, user, completeJob } = useKola();
  const router = useRouter();

  const job = jobs.find(j => j.id === id);

  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
          <Search size={28} color="#2952E8" />
        </div>
        <p className="text-slate-600 font-semibold">Job not found</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 font-semibold">Go Back</button>
      </div>
    );
  }

  const isEmployer = user?.role === 'employer';
  const workerName = job.applicants.find(a => a.status === 'accepted')?.workerName || 'Worker';

  const handleSubmit = () => {
    if (!rating) return;
    setLoading(true);
    setTimeout(() => {
      completeJob(job.id);
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <PartyPopper size={40} color="#16A34A" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Job Complete!</h2>
          <p className="text-slate-500 text-sm mb-8">
            Thanks for your feedback. Your rating helps keep Kola trusted.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(isEmployer ? '/employer' : '/worker')}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold active:scale-95 transition-transform"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop left panel */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[35%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="relative z-10 text-center px-8">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            <PartyPopper size={32} color="white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Rate Your Experience</h2>
          <p className="text-white/70 text-sm">Your feedback helps build trust in the community.</p>
        </div>
      </div>

      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 bg-white z-40 px-4 py-3 flex items-center gap-3 border-b border-slate-100">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 active:bg-slate-100"
          >
            <ChevronLeft size={24} className="text-blue-600" />
          </button>
          <h1 className="font-bold text-slate-900">Rate & Complete</h1>
        </header>

        <div className="px-4 lg:px-12 py-5 space-y-5 max-w-2xl lg:mx-auto">
          {/* Job summary */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Completing</p>
            <h2 className="text-lg font-black text-slate-900">{job.title}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{job.location}</p>
            {job.pay && (
              <p className="text-blue-600 font-bold text-lg mt-2">
                UGX {job.pay.toLocaleString()}
              </p>
            )}
          </div>

          {/* Who to rate */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">
              {isEmployer ? `Rate ${workerName}` : `Rate ${job.employerName}`}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-bold text-xl">
                  {isEmployer ? workerName.charAt(0) : job.employerName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-bold text-slate-900">{isEmployer ? workerName : job.employerName}</p>
                <p className="text-slate-500 text-sm">{isEmployer ? 'Worker' : 'Employer'}</p>
              </div>
            </div>

            {/* Thumbs rating */}
            <div className="flex gap-4 mb-5">
              <button
                onClick={() => setRating('up')}
                className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all active:scale-95 ${
                  rating === 'up'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <ThumbsUp
                  size={28}
                  className={rating === 'up' ? 'text-green-600 fill-green-600' : 'text-slate-400'}
                />
                <span className={`text-sm font-bold ${rating === 'up' ? 'text-green-600' : 'text-slate-500'}`}>
                  Recommended
                </span>
              </button>
              <button
                onClick={() => setRating('down')}
                className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all active:scale-95 ${
                  rating === 'down'
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <ThumbsDown
                  size={28}
                  className={rating === 'down' ? 'text-red-500 fill-red-500' : 'text-slate-400'}
                />
                <span className={`text-sm font-bold ${rating === 'down' ? 'text-red-500' : 'text-slate-500'}`}>
                  Not Recommended
                </span>
              </button>
            </div>

            {/* Star rating */}
            <div className="mb-4">
              <p className="text-slate-700 text-sm font-semibold mb-2">Overall Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setStars(n)}
                    className="active:scale-90 transition-transform"
                  >
                    <Star
                      size={32}
                      className={n <= stars ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200 fill-slate-200'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <p className="text-slate-700 text-sm font-semibold mb-2">Add a comment (optional)</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder={`How was your experience with ${isEmployer ? workerName : job.employerName}?`}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!rating || loading}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 ${
              rating
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Submitting...' : 'Submit & Complete Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
