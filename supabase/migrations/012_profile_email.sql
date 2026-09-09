-- ============================================================
-- Migration 012 — Profile email address
-- Run this AFTER 011_leakage_events.sql
--
-- Adds profiles.email: an OPTIONAL contact email used by the
-- transactional email system (lib/email/) for lifecycle
-- notifications — welcome, application accepted, escrow held /
-- released, dispute opened.
--
-- Tukola accounts are phone-first (OTP login); email is opt-in
-- data captured later, so the column is nullable and most early
-- rows will be NULL:
--
--   NULL = no email on file → lib/email/notify.ts skips that
--          recipient silently. No notification is ever fabricated
--          or sent to a guessed address.
--
-- RLS posture is unchanged (deny-all for anon; service role only).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.profiles.email IS
  'Optional contact email for transactional notifications (lib/email/). NULL = no email on file; sends skip silently.';
