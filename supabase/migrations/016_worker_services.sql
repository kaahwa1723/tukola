-- ============================================================
-- Migration 016 — Worker services (priced service listings)
-- Run this AFTER 015_pricing_milestones.sql
--
-- Adds public.worker_services: a fundi's priced menu of services
-- ("Cleaning — per room — UGX 20,000", "Braiding — per head —
-- UGX 30,000"). Employers browse these and book the fundi
-- directly; booking creates a job pre-filled with the listed
-- price and pre-invites that worker (one tap to accept).
--
-- Model: Fiverr-style fixed-price listings adapted to the
-- existing Tukola invite + held-payment machinery.
--
-- RLS posture follows the repo doctrine (schema.sql §7):
-- RLS ENABLED + ZERO POLICIES = deny-all for anon/authenticated.
-- All access goes through API routes with the service role.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.worker_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,            -- e.g. "House cleaning"
  category     TEXT NOT NULL,            -- one of JOB_CATEGORIES
  unit_label   TEXT,                     -- e.g. "per room", "per head", "per day"
  price_ugx    INTEGER NOT NULL CHECK (price_ugx > 0),
  description  TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.worker_services IS
  'Fundi-posted priced service listings. Employers browse and book directly; booking creates a pre-filled job with an invited application. Service-role-only access via /api/services.';

CREATE INDEX IF NOT EXISTS worker_services_worker_idx  ON public.worker_services (worker_id);
CREATE INDEX IF NOT EXISTS worker_services_active_idx  ON public.worker_services (active, category);

-- Booking lineage: which service listing a job came from.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.worker_services(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.jobs.service_id IS
  'Set when the job was created by booking a worker service listing (migration 016).';

ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;
-- Intentionally ZERO policies: deny-all for anon/authenticated (schema.sql §7).
