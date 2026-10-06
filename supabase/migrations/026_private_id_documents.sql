-- 026 · Private bucket for identity documents
-- ---------------------------------------------------------------------------
-- Problem: national-ID, LC1-letter and certificate photos were uploaded into
-- the PUBLIC profile-images bucket — anyone with (or guessing) the URL could
-- read a fundi's identity documents. Avatars and portfolio shots legitimately
-- stay public, so the fix is a separate private bucket, not a bucket flip.
--
-- This migration creates `id-documents` as a private bucket. We deliberately
-- attach NO storage RLS policies: with zero policies, every anon/authenticated
-- read or write is denied and only the service role can touch objects. All
-- reads are proxied through /api/docs/[...path], which enforces its own
-- authorization (owner or admin) — no signed URLs are ever minted, so there
-- is nothing leakable to share.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;
