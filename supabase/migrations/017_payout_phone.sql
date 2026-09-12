-- ============================================================
-- Migration 017 — Fundi Mobile Money payout number
-- Run this AFTER 016_worker_services.sql
--
-- Adds public.profiles.momo_payout_phone: where a worker's money
-- goes when escrow is released. Without it the payout leg of a
-- release records splits but sends nothing (proven in the live
-- E2E test). Falls back to the worker's login phone at payment
-- creation when unset — for most fundis MoMo == their phone.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS momo_payout_phone TEXT;

COMMENT ON COLUMN public.profiles.momo_payout_phone IS
  'Worker Mobile Money payout number (E.164). Copied onto payments.payee_momo_phone at funding time; falls back to profiles.phone when null.';
