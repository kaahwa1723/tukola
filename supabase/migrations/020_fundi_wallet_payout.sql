-- 020_fundi_wallet_payout.sql — fundi earnings can land in the wallet
--
-- Founder request: after a job is confirmed, the fundi chooses where the
-- money goes — instant MoMo payout (default) or kept in the Tukola wallet
-- to cash out bigger sums at once (fewer MoMo fees per shilling earned).
--
--   profiles.payout_preference  'momo' (default, unchanged behavior)
--                               'wallet' (release credits wallet_entries)
--   wallet_entries kinds extended: 'earnings' (job pay landing in wallet),
--                               'withdrawal' (cash-out to MoMo)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payout_preference TEXT NOT NULL DEFAULT 'momo'
    CHECK (payout_preference IN ('momo', 'wallet'));

COMMENT ON COLUMN profiles.payout_preference IS
  'Where released job pay goes: momo = instant MoMo payout; wallet = credited to the Tukola wallet for batched cash-out.';

ALTER TABLE wallet_entries DROP CONSTRAINT IF EXISTS wallet_entries_kind_check;
ALTER TABLE wallet_entries
  ADD CONSTRAINT wallet_entries_kind_check
  CHECK (kind IN ('topup', 'job_funding', 'refund', 'adjustment', 'earnings', 'withdrawal'));
