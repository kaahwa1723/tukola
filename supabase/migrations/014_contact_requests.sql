-- ============================================================
-- Migration 014 — Contact requests inbox
-- Run this AFTER 013_feedback.sql
--
-- Adds public.contact_requests: enquiries from employers and
-- organisations who want to hire through Tukola or partner with
-- us ("Contact us" section on the landing page).
-- Written ONLY by POST /api/contact (service role) and read
-- ONLY by admin (service role).
--
-- RLS posture follows the repo doctrine (schema.sql §7):
-- RLS ENABLED + ZERO POLICIES = deny-all for anon/authenticated.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  organisation TEXT,
  email        TEXT NOT NULL,
  phone        TEXT,
  kind         TEXT,          -- 'employer' | 'organisation' | 'partnership' | 'other'
  message      TEXT NOT NULL,
  handled      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contact_requests IS
  'Employer/organisation enquiries from the landing page contact form. Service-role-only access via /api/contact and admin.';

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
-- Intentionally ZERO policies: deny-all for anon/authenticated (schema.sql §7).
