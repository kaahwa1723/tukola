import type { User } from './types';

/**
 * Profile completion — the trust-layer gate (founder decision 24 Sep 2026).
 *
 * A fundi CANNOT apply for (or accept) a job until every REQUIRED item is
 * done. Optional items only raise the percentage — "complete profiles win
 * more jobs" stays honest because the bar reflects real, checkable fields.
 *
 *   Required (the gate):
 *     phone (implicit — OTP login), profile photo, area, about, skills,
 *     MoMo payout number (without it a release can't pay them),
 *     national ID (number + photo), next of kin (name + phone)
 *   Optional (raise the %):
 *     sex + date of birth, qualification / certificate, LC1 / area letter,
 *     work portfolio photos
 *
 * is_verified is deliberately NOT part of this — badges are admin-set and
 * never self-service. This checklist is self-reported evidence; the
 * vetting queue turns it into a Verified+ badge.
 *
 * Used by: POST /api/jobs/[id]/apply (enforcement), worker profile page
 * (the bar), worker dashboard (the nudge banner). Pure + isomorphic — no
 * Node/browser-only APIs, safe to import from both.
 */

export interface CompletionItem {
  key: string;       // i18n key suffix: prof.item.<key>
  done: boolean;
  required: boolean;
}

export interface ProfileCompletion {
  percent: number;              // 0–100 across ALL items
  canWork: boolean;             // every required item done
  items: CompletionItem[];
  missingRequired: string[];    // item keys — for API errors + UI hints
}

export function computeProfileCompletion(u: Partial<User> | null | undefined): ProfileCompletion {
  const items: CompletionItem[] = [
    // ── Required to work ──────────────────────────────────────────────
    { key: 'phone',          required: true,  done: !!u?.phone },
    { key: 'avatar',         required: true,  done: !!u?.avatar },
    { key: 'location',       required: true,  done: !!u?.location },
    { key: 'about',          required: true,  done: !!u?.about?.trim() },
    { key: 'skills',         required: true,  done: (u?.skills?.length ?? 0) > 0 },
    { key: 'momo',           required: true,  done: !!u?.momoPayoutPhone },
    { key: 'nationalId',     required: true,  done: !!u?.nationalIdNumber?.trim() && !!u?.nationalIdPhotoUrl },
    { key: 'nextOfKin',      required: true,  done: !!u?.nextOfKinName?.trim() && !!u?.nextOfKinPhone },
    // ── Optional — raise the percentage ───────────────────────────────
    { key: 'sexDob',         required: false, done: !!u?.sex && !!u?.dateOfBirth },
    { key: 'qualification',  required: false, done: !!u?.qualification?.trim() || !!u?.certificatePhotoUrl },
    { key: 'lcLetter',       required: false, done: !!u?.lcLetterPhotoUrl },
    { key: 'portfolio',      required: false, done: (u?.portfolioImages?.length ?? 0) > 0 },
  ];

  const done = items.filter(i => i.done).length;
  const missingRequired = items.filter(i => i.required && !i.done).map(i => i.key);

  return {
    percent: Math.round((done / items.length) * 100),
    canWork: missingRequired.length === 0,
    items,
    missingRequired,
  };
}
