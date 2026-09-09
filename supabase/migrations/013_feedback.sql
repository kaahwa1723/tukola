-- ============================================================
-- Migration 013 — Feedback inbox
-- Run this AFTER 012_profile_email.sql
--
-- Adds public.feedback: messages sent from the landing page
-- ("Send us feedback" section) and from the in-app /feedback
-- page. Written ONLY by POST /api/feedback (service role) and
-- read ONLY by GET /api/admin/feedback (service role).
--
-- RLS posture follows the repo doctrine (schema.sql §7):
-- RLS ENABLED + ZERO POLICIES = deny-all for anon/authenticated.
-- There is no auth.uid() (custom OTP auth), so per-user policies
-- are impossible anyway — all access is service-role-only via
-- API routes. Do NOT add USING (true) policies here.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT,
  email      TEXT,
  role       TEXT,          -- 'employer' | 'worker' | 'visitor'
  message    TEXT NOT NULL,
  rating     INT CHECK (rating BETWEEN 1 AND 5),
  source     TEXT,          -- 'landing' | 'app'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.feedback IS
  'User feedback from the landing page and in-app /feedback page. Service-role-only access via /api/feedback and /api/admin/feedback.';

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
-- Intentionally ZERO policies: deny-all for anon/authenticated (schema.sql §7).
