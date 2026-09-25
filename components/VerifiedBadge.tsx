'use client';

import { ShieldCheck, BadgeCheck } from 'lucide-react';

/**
 * Trust badges — render ONLY from server-owned flags (isVerified /
 * verifiedPlus), never from client state the worker controls.
 *
 * tier 'id'   — ID-verified: National ID + 2 reference calls, checked by
 *               our team. Do not inflate this into "background checked".
 * tier 'plus' — Verified+: full vetting via the admin queue — national ID,
 *               LC1 letter, trade certificate verified WITH the issuer,
 *               and police clearance. Only render when verifiedPlus is true.
 *
 * variant 'chip'  — compact inline pill for list rows / cards
 * variant 'full'  — pill + explanatory line for profile/hire pages
 */
export default function VerifiedBadge({
  variant = 'chip',
  dark = false,
  tier = 'id',
}: {
  variant?: 'chip' | 'full';
  dark?: boolean; // on dark/gradient backgrounds
  tier?: 'id' | 'plus';
}) {
  const plus = tier === 'plus';

  const chip = plus ? (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={
        dark
          ? { background: 'rgba(16,185,129,0.22)', color: '#34D399' }
          : { background: '#ECFDF5', color: '#047857' }
      }
      title="Verified+: National ID + LC1 letter + trade certificate verified with the issuer + police clearance"
    >
      <BadgeCheck size={12} strokeWidth={2.5} />
      Verified+
    </span>
  ) : (
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
        {plus
          ? 'Fully vetted: ID, LC1 letter, certificate checked with the issuer, and police clearance.'
          : 'National ID + 2 reference calls, checked by our team.'}
      </p>
    </div>
  );
}
