-- ============================================================
-- Migration 015 — Pricing model: rate card + milestone payments
-- Run this AFTER 014_contact_requests.sql
--
-- Implements the approved pricing recommendation
-- (Tukola-Pricing-Model-Options.md):
--   - Jobs under UGX 300,000 stay full-escrow upfront ('standard')
--   - Jobs at/above UGX 300,000 can be paid in stages ('milestone'):
--     30% start/materials → 40% main work → 30% completion
--
-- Adds:
--   public.rate_card        — indicative UGX ranges per category,
--                             seeded; admin-managed later
--   jobs.pricing_type       — 'standard' | 'milestone'
--   public.job_milestones   — the stage plan for milestone jobs
--   payments.milestone_id   — links a stage's escrow payment
--
-- RLS posture: ENABLED + ZERO POLICIES = deny-all (schema.sql §7).
-- All access is service-role-only via API routes.
-- ============================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS milestone_id UUID;

CREATE TABLE IF NOT EXISTS public.job_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  idx         INT NOT NULL,          -- 1..n, stage order
  label       TEXT NOT NULL,         -- e.g. 'Getting started & materials'
  pct         INT NOT NULL,          -- percent of total pay
  amount_ugx  INT NOT NULL,          -- rounded; stages sum to jobs.pay
  payment_id  BIGINT REFERENCES public.payments(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, idx)
);

COMMENT ON TABLE public.job_milestones IS
  'Stage payment plan for milestone-priced jobs (pay >= UGX 300k). Each stage is funded and released separately; stage status is derived from its linked payment.';

CREATE TABLE IF NOT EXISTS public.rate_card (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category   TEXT NOT NULL UNIQUE,   -- matches lib/constants JOB_CATEGORIES
  min_ugx    INT NOT NULL,
  max_ugx    INT NOT NULL,
  note       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.rate_card IS
  'Indicative price ranges shown when posting/applying for jobs. Sets fair expectations for both sides; final price is still agreed between employer and fundi.';

ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_card ENABLE ROW LEVEL SECURITY;
-- Intentionally ZERO policies: deny-all for anon/authenticated.

-- Seed indicative ranges (UGX). Categories MUST match
-- lib/constants.ts JOB_CATEGORIES exactly. These are GUIDES, not
-- fixed prices — the final price is agreed between employer and fundi.
INSERT INTO public.rate_card (category, min_ugx, max_ugx, note) VALUES
  ('Cleaning',           30000,  150000, 'Home/office cleaning; deep cleans higher'),
  ('Plumbing',           40000,  250000, 'Repairs and installations; parts excluded'),
  ('Electrical',         40000,  250000, 'Wiring, fittings, fault fixes; parts excluded'),
  ('Construction',       100000, 1500000, 'Fundi labour per phase; materials separate'),
  ('Moving & Delivery',  50000,  300000, 'House/office moves within a city'),
  ('Gardening',          30000,  150000, 'Compound maintenance, landscaping'),
  ('Painting',           80000,  500000, 'Per room to full house; paint excluded'),
  ('Cooking & Catering', 50000,  400000, 'Home cooking to event catering'),
  ('Security',           50000,  250000, 'Per shift or part-time month'),
  ('Driving',            30000,  200000, 'Per trip or per day'),
  ('Events',             80000,  600000, 'Setup, decor, sound, coordination'),
  ('Tailoring',          30000,  250000, 'Repairs to full outfits; fabric excluded'),
  ('Technical Repair',   40000,  300000, 'Phones, appliances, electronics'),
  ('Farming',            40000,  300000, 'Garden work, harvesting, spraying'),
  ('Beauty & Wellness',  20000,  150000, 'Hair, nails, makeup — home service'),
  ('Other',              20000,  500000, 'Agree a fair price with the fundi')
ON CONFLICT (category) DO NOTHING;
