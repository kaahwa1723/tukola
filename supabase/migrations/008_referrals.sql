-- ============================================================
-- Migration 008 — Referral mechanics (Phase 2 of the rebuild plan)
-- Run this AFTER 007_reliability_score.sql
--
-- Plan: "unique referral codes; WhatsApp share links; UGX 10K job
-- credit both sides (customer referral), UGX 5K + 5K (fundi referral
-- on activation + first job). Credits are ledger entries, redeemable
-- against commission."
--
-- Standing rule honoured here: the data model is the moat. Credits
-- are FIRST-CLASS append-only ledger rows — a balance is never a
-- stored number, it is always SUM(earned) − SUM(redeemed) − SUM(expired)
-- computed from this ledger by lib/referrals.ts. Corrections are new
-- rows, never edits (same discipline as guarantee_reserve in 005).
--
-- Three tables:
--   referral_codes   — exactly one short code per user (PK on user_id)
--   referrals        — attribution: who referred whom (one row per
--                      referee, enforced by UNIQUE(referee_id) so a
--                      signup can never be double-attributed)
--   referral_credits — the money ledger (earned / redeemed / expired)
--
-- RLS posture is unchanged: deny-all for anon/authenticated, the
-- service role (API routes) does everything — same as 005/006.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. REFERRAL CODES — one per user, human-shareable
-- Short (8 chars) from an unambiguous alphabet (no 0/O/1/I/L) so it
-- survives being read out loud on WhatsApp voice notes.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  user_id     TEXT PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON referral_codes (code);

COMMENT ON TABLE referral_codes IS
  'One referral code per user (Phase 2). Codes are minted lazily by lib/referrals.ts getOrCreateReferralCode — never fabricated client-side.';

-- ─────────────────────────────────────────────
-- 2. REFERRALS — attribution rows
--   pending  : signup attributed, waiting for the qualifying event
--   rewarded : credits issued (terminal — a referral pays out once)
--
-- The qualifying event is the same for both roles: the referee's FIRST
-- completed paid job (see lib/referrals.ts issueReferralCreditsForCompletion).
--   referee_role='employer' (customer referral): UGX 10,000 to BOTH sides
--   referee_role='worker'   (fundi referral):    UGX 5,000 to the referrer
--                                                + UGX 5,000 to the fundi
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id            BIGSERIAL PRIMARY KEY,
  referrer_id   TEXT NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  referee_id    TEXT NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  referee_role  TEXT NOT NULL CHECK (referee_role IN ('worker','employer')),
  code          TEXT NOT NULL,                  -- snapshot of the code used
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','rewarded')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at   TIMESTAMPTZ,
  -- One attribution per signup — the moat against self/double-claiming
  CONSTRAINT referrals_referee_unique UNIQUE (referee_id),
  -- Self-referral is structurally impossible
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx   ON referrals (status);

COMMENT ON TABLE referrals IS
  'Referral attribution (Phase 2). UNIQUE(referee_id) means a signup can only ever be attributed once; status pending→rewarded pays out exactly once.';

-- ─────────────────────────────────────────────
-- 3. REFERRAL CREDITS — append-only money ledger (UGX)
--   kind='earned'   : credit granted by a rewarded referral (or a
--                     reversal row restoring a balance after a failed
--                     payout — corrections are new rows, never edits)
--   kind='redeemed' : credit consumed against platform commission at
--                     escrow release (payment_id points at the payment)
--   kind='expired'  : credit lapsed (no expiry policy yet — the kind
--                     exists so one can be added without a migration)
--
-- Balance = SUM(earned) − SUM(redeemed) − SUM(expired).
-- NEVER a stored counter. No fabricated balances.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_credits (
  id           BIGSERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  amount_ugx   INT NOT NULL CHECK (amount_ugx > 0),
  kind         TEXT NOT NULL CHECK (kind IN ('earned','redeemed','expired')),
  referral_id  BIGINT REFERENCES referrals (id) ON DELETE SET NULL,
  payment_id   BIGINT REFERENCES payments (id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_credits_user_idx    ON referral_credits (user_id);
CREATE INDEX IF NOT EXISTS referral_credits_payment_idx ON referral_credits (payment_id);

COMMENT ON TABLE referral_credits IS
  'Append-only referral credit ledger (Phase 2). A user''s balance is a ledger SUM, never a stored number. Redeemable against platform commission at escrow release (lib/escrow.ts releasePayment).';

-- ─────────────────────────────────────────────
-- 4. RLS — same posture as 005/006: enable RLS with ZERO policies and
-- strip table-level grants. anon/authenticated get NOTHING; all access
-- flows through API routes using the service-role key.
-- ─────────────────────────────────────────────
ALTER TABLE referral_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON referral_codes   FROM anon, authenticated;
REVOKE ALL ON referrals        FROM anon, authenticated;
REVOKE ALL ON referral_credits FROM anon, authenticated;

-- service_role keeps full access (bypasses RLS) — used by the API routes.
