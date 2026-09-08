'use client';

import { ShieldCheck } from 'lucide-react';

/**
 * ID-verified badge — render ONLY when the fundi's `isVerified` flag is
 * true (server-owned; set by the admin team after checks, never by the
 * client or the worker).
 *
 * The copy is deliberately honest and specific: verification today means
 * a National ID check plus two reference calls, done by our team. Do not
 * inflate this into "background checked" or "police cleared" — that is
 * not what the process does.
 *
 * variant 'chip'  — compact inline pill for list rows / cards
 * variant 'full'  — pill + explanatory line for profile/hire pages
 */
export default function VerifiedBadge({
  variant = 'chip',
  dark = false,
}: {
  variant?: 'chip' | 'full';
  dark?: boolean; // on dark/gradient backgrounds
}) {
  const chip = (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={
        dark
          ? { background: 'rgba(0,200,255,0.18)', color: '#00C8FF' }
          : { background: '#EEF2FF', color: '#2952E8' }
      }
      title="ID-verified: National ID + 2 reference calls, checked by our team"
    >
      <ShieldCheck size={12} strokeWidth={2.5} />
      ID-verified
    </span>
  );

  if (variant === 'chip') return chip;

  return (
    <div className="flex flex-col gap-1">
      {chip}
      <p className={`text-[11px] leading-snug ${dark ? 'text-white/60' : 'text-slate-500'}`}>
        National ID + 2 reference calls, checked by our team.
      </p>
    </div>
  );
}
