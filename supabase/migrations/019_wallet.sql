-- 019_wallet.sql — Tukola Wallet (SafeBoda-style stored balance)
--
-- Employers (and anyone) can preload money via MoMo once, then fund jobs
-- instantly — no USSD PIN prompt per job. Refunds land back in the wallet.
--
-- Design (Rebuild plan Layer 7 — every shilling accounted):
--   wallet_topups  — a pending MoMo collection intent until RukaPay
--                    confirms (webhook or read-settle), then successful.
--   wallet_entries — APPEND-ONLY signed ledger. Balance = SUM(amount_ugx).
--                    Rows are never updated or deleted; corrections are
--                    new rows. Every entry carries a UNIQUE idempotency
--                    key so retries/webhook replays can never double-count.
--
-- v1 is deliberately spend-only + refunds-in: no cash withdrawals (a
-- withdrawal rail = float liability + regulation; revisit at scale).
--
-- RLS posture: deny-all for anon/authenticated (zero policies); the API
-- routes use service_role which bypasses RLS.

CREATE TABLE IF NOT EXISTS wallet_topups (
  id               BIGSERIAL PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  amount_ugx       BIGINT NOT NULL CHECK (amount_ugx > 0),
  momo_phone       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'successful', 'failed')),
  provider         TEXT NOT NULL,
  provider_ref     TEXT,
  idempotency_key  TEXT NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wallet_entries (
  id               BIGSERIAL PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  kind             TEXT NOT NULL
                   CHECK (kind IN ('topup', 'job_funding', 'refund', 'adjustment')),
  amount_ugx       BIGINT NOT NULL,                -- signed: + credit, - debit
  payment_id       BIGINT REFERENCES payments (id) ON DELETE SET NULL,
  topup_id         BIGINT REFERENCES wallet_topups (id) ON DELETE SET NULL,
  idempotency_key  TEXT NOT NULL UNIQUE,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_topups_user_idx    ON wallet_topups (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_topups_ref_idx     ON wallet_topups (provider_ref);
CREATE INDEX IF NOT EXISTS wallet_entries_user_idx   ON wallet_entries (user_id, created_at DESC);

ALTER TABLE wallet_topups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_entries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE wallet_topups  IS 'MoMo top-up intents; credited to wallet_entries only after provider-verified success.';
COMMENT ON TABLE wallet_entries IS 'Append-only signed wallet ledger. Balance = SUM(amount_ugx) per user. Never UPDATE/DELETE — corrections are new rows.';
