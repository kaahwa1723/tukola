/**
 * Lifecycle email notifications — one function per user-facing event.
 *
 * Same fire-and-forget discipline as lib/analytics.ts: email must NEVER
 * break a user action. Every function here swallows its own failures and
 * only console.warns — callers can await them without a try/catch.
 *
 * Recipients are resolved from profiles.email (added by migration
 * 012_profile_email.sql). Users without an email on file are skipped
 * silently — phone-first accounts are the norm, email is opt-in data.
 */

import { createServerSupabase } from '../supabase-server';
import { getEmailProvider } from './provider';
import {
  welcomeEmail,
  applicationAcceptedEmail,
  paymentHeldEmail,
  paymentReleasedEmail,
  disputeOpenedEmail,
} from './templates';

interface ProfileContact {
  name: string;
  email: string | null;
}

/** Look up a profile's display name + email. NULL email = skip silently. */
async function lookupContact(userId: string): Promise<ProfileContact | null> {
  const sb = createServerSupabase();
  const { data } = await sb
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle();
  if (!data || typeof data.email !== 'string' || !data.email.includes('@')) return null;
  return { name: data.name ?? 'there', email: data.email };
}

async function lookupJobTitle(jobId: string | number): Promise<string> {
  const sb = createServerSupabase();
  const { data } = await sb.from('jobs').select('title').eq('id', jobId).maybeSingle();
  return data?.title ?? 'your job';
}

async function deliver(to: string, tpl: { subject: string; html: string; text: string }): Promise<void> {
  await getEmailProvider().send({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
}

/**
 * Welcome — after a NEW account is created (signup completes in
 * /api/auth/register; new users have no profile at OTP-verify time).
 */
export async function sendWelcomeEmail(user: {
  id: string;
  name: string;
  role: string;
  email?: string | null;
}): Promise<void> {
  try {
    // The profile row is fresh from insert — use its email directly,
    // skipping silently when the account has none on file.
    if (typeof user.email !== 'string' || !user.email.includes('@')) return;
    await deliver(user.email, welcomeEmail(user.name, user.role));
  } catch (e: any) {
    console.warn(`[email] welcome failed for user ${user.id}:`, e?.message ?? e);
  }
}

/** Application accepted — the chosen worker is notified. */
export async function sendApplicationAcceptedEmail(args: {
  workerId: string;
  jobId: string;
}): Promise<void> {
  try {
    const worker = await lookupContact(args.workerId);
    if (!worker) return;
    const jobTitle = await lookupJobTitle(args.jobId);
    await deliver(worker.email!, applicationAcceptedEmail(worker.name, jobTitle));
  } catch (e: any) {
    console.warn(`[email] application_accepted failed (worker ${args.workerId}, job ${args.jobId}):`, e?.message ?? e);
  }
}

/** Escrow funded — the fundi learns the money is held and work can start. */
export async function sendPaymentHeldEmail(args: {
  fundiId: string;
  jobId: string | number;
  amountUgx: number;
}): Promise<void> {
  try {
    const fundi = await lookupContact(args.fundiId);
    if (!fundi) return;
    const jobTitle = await lookupJobTitle(args.jobId);
    await deliver(fundi.email!, paymentHeldEmail(fundi.name, jobTitle, args.amountUgx));
  } catch (e: any) {
    console.warn(`[email] payment_held failed (fundi ${args.fundiId}, job ${args.jobId}):`, e?.message ?? e);
  }
}

/** Escrow released — BOTH parties are told; the fundi learns they got paid. */
export async function sendPaymentReleasedEmail(args: {
  fundiId: string;
  employerId: string;
  jobId: string | number;
  amountUgx: number;
  fundiPayoutUgx: number;
}): Promise<void> {
  try {
    const jobTitle = await lookupJobTitle(args.jobId);
    const [fundi, employer] = await Promise.all([
      lookupContact(args.fundiId),
      lookupContact(args.employerId),
    ]);
    if (fundi) {
      await deliver(fundi.email!, paymentReleasedEmail(fundi.name, jobTitle, args.fundiPayoutUgx, true));
    }
    if (employer) {
      await deliver(employer.email!, paymentReleasedEmail(employer.name, jobTitle, args.amountUgx, false));
    }
  } catch (e: any) {
    console.warn(`[email] payment_released failed (job ${args.jobId}):`, e?.message ?? e);
  }
}

/**
 * Dispute opened — alert the admin (ADMIN_EMAIL env, optional) and both
 * job parties that the escrowed payment is frozen pending review.
 */
export async function sendDisputeOpenedEmail(args: {
  partyIds: string[];
  jobId: string;
  reason: string;
  adminEmail?: string;
}): Promise<void> {
  try {
    const jobTitle = await lookupJobTitle(args.jobId);
    const uniquePartyIds = Array.from(new Set(args.partyIds));
    const parties = await Promise.all(uniquePartyIds.map(lookupContact));
    const recipients: { name: string; email: string }[] = parties
      .filter((p): p is ProfileContact => !!p)
      .map(p => ({ name: p.name, email: p.email! }));

    const admin = args.adminEmail ?? process.env.ADMIN_EMAIL;
    if (admin && admin.includes('@')) {
      recipients.push({ name: 'Tukola admin', email: admin });
    }

    for (const r of recipients) {
      await deliver(r.email, disputeOpenedEmail(r.name, jobTitle, args.reason));
    }
  } catch (e: any) {
    console.warn(`[email] dispute_opened failed (job ${args.jobId}):`, e?.message ?? e);
  }
}
