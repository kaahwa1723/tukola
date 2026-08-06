-- ============================================================
-- Migration 005 — Payments & escrow ledger
-- Run this AFTER 004_identity.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. PAYMENTS (escrow ledger — every shilling accounted)
-- State machine: pending → held → released | refunded | disputed
--   pending  : RequestToPay sent, waiting for customer's MoMo PIN
--   held     : money collected, sitting in escrow
--   released : splits paid out (fundi + commission + guarantee accrual)
--   refunded : money returned to payer
--   disputed : frozen pending admin resolution
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  BIGSERIAL PRIMARY KEY,
  job_id              TEXT NOT NULL REFERENCES jobs (id) ON DELETE RESTRICT,
  payer_id            TEXT NOT NULL REFERENCES profiles (id),
  payee_id            TEXT NOT NULL REFERENCES profiles (id),
  amount              INT NOT NULL CHECK (amount > 0),        -- principal, UGX
  commission          INT,                                     -- platform share (set on release)
  psp_fee             INT DEFAULT 0,                           -- provider charge
  guarantee_accrual   INT,                                     -- 2% of GMV → reserve (set on release)
  fundi_payout        INT,                                     -- what the fundi receives (set on release)
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','held','released','refunded','disputed')),
  provider            TEXT NOT NULL,                           -- 'mock' | 'mtn_momo' | 'flutterwave'
  provider_ref        TEXT,                                    -- provider transaction reference
  idempotency_key     TEXT NOT NULL UNIQUE,                    -- retries never double-charge
  payer_momo_phone    TEXT NOT NULL,                           -- E.164; may differ from contact number
  payee_momo_phone    TEXT,                                    -- collected at payout setup
  receipt_number      TEXT,                                    -- assigned on release (EFRIS)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  held_at             TIMESTAMPTZ,
  released_at         TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  disputed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payments_job_id_idx    ON payments (job_id);
CREATE INDEX IF NOT EXISTS payments_payer_id_idx  ON payments (payer_id);
CREATE INDEX IF NOT EXISTS payments_payee_id_idx  ON payments (payee_id);
CREATE INDEX IF NOT EXISTS payments_status_idx    ON payments (status);

-- ─────────────────────────────────────────────
-- 2. GUARANTEE RESERVE LEDGER
-- 2% of every completed job's GMV accrues here; guarantee claims pay out
-- of it. Append-only — corrections are new rows, never edits.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guarantee_reserve (
  id          BIGSERIAL PRIMARY KEY,
  payment_id  BIGINT REFERENCES payments (id) ON DELETE SET NULL,
  entry_type  TEXT NOT NULL CHECK (entry_type IN ('accrual','payout','adjustment')),
  amount      INT NOT NULL,                 -- signed: accrual positive, payout negative
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guarantee_reserve_payment_idx ON guarantee_reserve (payment_id);

-- ─────────────────────────────────────────────
-- 3. DISPUTES (admin queue)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id           BIGSERIAL PRIMARY KEY,
  payment_id   BIGINT NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  job_id       TEXT NOT NULL REFERENCES jobs (id) ON DELETE RESTRICT,
  opened_by    TEXT NOT NULL REFERENCES profiles (id),
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','resolved_release','resolved_refund')),
  resolved_by  TEXT,                        -- admin user id
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS disputes_status_idx ON disputes (status);
CREATE INDEX IF NOT EXISTS disputes_job_idx    ON disputes (job_id);

-- ─────────────────────────────────────────────
-- 4. TWO-TAP COMPLETION + B2B FLAG on jobs
-- worker_done_at : fundi tapped "Job done" (starts the 48h auto-release clock)
-- completion_photo_url : required for jobs above UGX 100,000
-- is_b2b : B2B-flagged jobs use the 15% commission rate
-- ─────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS worker_done_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_photo_url  TEXT,
  ADD COLUMN IF NOT EXISTS is_b2b                BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────
-- 5. RLS — money tables are service-role only (like otp_codes):
-- no policies at all → anonymous/authenticated clients get NOTHING.
-- All access flows through the API routes (service role).
-- ─────────────────────────────────────────────
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantee_reserve ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes          ENABLE ROW LEVEL SECURITY;
