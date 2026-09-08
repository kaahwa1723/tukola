-- ============================================================
-- 006_rls_lockdown.sql — CLOSE THE "BYPASS-THE-APP" HOLE
-- ============================================================
-- STATUS: DRAFTED 8 Sep 2026 — reviewed from repo evidence.
-- ⚠️  NOT YET APPLIED to the live DB. Verify against the live
--     database first (Supabase MCP was unreachable at audit time),
--     then apply via Supabase MCP apply_migration or SQL Editor.
--
-- WHY: schema.sql created 17 policies with USING (true) /
-- WITH CHECK (true) on the 6 core tables. The publishable anon
-- key ships in the client JS bundle, so ANYONE can call the
-- PostgREST API directly and:
--   • UPDATE any profile — flip is_verified (fake "ID-verified"
--     badge), inflate rating / completed_jobs  ← the exact
--     "user edited their own limits" hack, Tukola edition
--   • SELECT all profiles (every user's phone number)
--   • SELECT all conversations + messages (all private chats)
--   • UPDATE / cancel anyone's jobs; INSERT fake ratings
-- Client code never queries Supabase directly — all access goes
-- through API routes with the service-role key, which bypasses
-- RLS. So legitimate users lose NOTHING when anon access dies.
-- Sessions are custom OTP (not Supabase Auth), so auth.uid()
-- is always NULL — there is no safe per-user policy to write
-- for anon/authenticated. Deny-all IS the correct policy.
-- ============================================================

BEGIN;

-- ── 1. Drop every wide-open demo policy ─────────────────────
DROP POLICY IF EXISTS profiles_read_all        ON profiles;
DROP POLICY IF EXISTS profiles_insert_svc      ON profiles;
DROP POLICY IF EXISTS profiles_update_svc      ON profiles;

DROP POLICY IF EXISTS jobs_read_all            ON jobs;
DROP POLICY IF EXISTS jobs_insert_svc          ON jobs;
DROP POLICY IF EXISTS jobs_update_svc          ON jobs;

DROP POLICY IF EXISTS applications_read_all    ON applications;
DROP POLICY IF EXISTS applications_insert_svc  ON applications;
DROP POLICY IF EXISTS applications_update_svc  ON applications;

DROP POLICY IF EXISTS conversations_read       ON conversations;
DROP POLICY IF EXISTS conversations_insert     ON conversations;
DROP POLICY IF EXISTS conversations_update     ON conversations;

DROP POLICY IF EXISTS messages_read            ON messages;
DROP POLICY IF EXISTS messages_insert          ON messages;
DROP POLICY IF EXISTS messages_update          ON messages;

DROP POLICY IF EXISTS ratings_read             ON ratings;
DROP POLICY IF EXISTS ratings_insert           ON ratings;

-- ── 2. Belt-and-braces: strip table-level grants ────────────
-- With RLS enabled and zero policies, access is already denied.
-- This also closes the door if someone later adds a careless
-- policy, and blocks non-RLS-covered operations.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- service_role keeps full access by default (bypasses RLS) —
-- the API routes use it via SUPABASE_SERVICE_ROLE_KEY.

COMMIT;

-- ── 3. Verify after applying (expected: zero rows) ──────────
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual = 'true' OR with_check = 'true');
--
-- Then smoke-test the app: login → post job → apply → escrow
-- release. All flows use service-role API routes and must work.
