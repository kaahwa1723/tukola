# CLAUDE.md — Agent instructions for working in `kola/`

You are a coding agent working on Tukola, a Ugandan fundi marketplace. Read these first, in order:

1. `PRD.md` — what the product is and must do
2. `ARCHITECTURE-ESSENTIALS.md` — the 10 non-negotiable technical decisions
3. `ARCHITECTURE.md` — full technical reference (when you need detail)
4. `../Tukola-App-Rebuild-Plan-v2.md` — live build status (what's done/blocked/buildable)
5. `../Tukola-Lessons-Applied.md` — field-tested mistakes already encoded as rules
6. `SECURITY-CHECKLIST.md` — security posture; re-run before every deploy, after any new table or API route

## Working rules (hard)

- **Git:** the founder keeps ~59 uncommitted files in the repo. NEVER `git add -A` or `git commit -a`. Stage ONLY files you changed, by name. Small reviewable commits; after each: what changed, how to verify, anything needed from the founder.
- **Dev server:** `./node_modules/.bin/next dev -p 3131` from `kola/` (npx is NOT on PATH). Kill by PID when done: `netstat -ano | grep :3131` → `taskkill //F //PID <pid>`. Never leave it running at end of turn.
- **Typecheck:** `./node_modules/.bin/tsc --noEmit` after every code change. `next build` must stay green.
- **DB changes:** draft SQL in `supabase/migrations/`, show it to the founder, get explicit approval, THEN apply (Supabase MCP `apply_migration` or SQL Editor). Never apply DDL unconfirmed. Prefer read-only queries for investigation.
- **API routes:** when you touch one, check its neighbors for the same vulnerability class — pattern bugs travel in packs. Derive user ID from session, never from client input.
- **Security:** server-owned fields (verified badge, ratings, escrow, roles) are written by server logic only. Validate and normalize phones server-side. No secrets in code.
- **PER-UPDATE SECURITY GATE (mandatory, every change, no exceptions):** before committing ANY code change, run the 60-second gate in `SECURITY-CHECKLIST.md` §"Per-Update Gate" that matches what you touched (route / table / dependency / config / UI). Record the result in your end-of-turn report. A change is not "done" until its gate row is ✅ or the failure is disclosed to the founder.
- **Honesty:** no fabricated numbers/data, no mock fallbacks presented as real, no claiming success when something failed.
- **Plan conflicts:** if the plan disagrees with the code, STOP and ask — do not guess.
- **Off-limits:** `tukola-native/` entirely; anything needing live credentials (real SMS, real MoMo, WhatsApp, PostHog activation); Vercel deploys; external pushes.

## Before building a feature

Check `../Tukola-App-Rebuild-Plan-v2.md` — much is already built and committed. Do NOT rebuild it. Then apply the 10-Layer Review Standard (see rebuild plan v1, Part 6) and the pre-Vercel build list order.
