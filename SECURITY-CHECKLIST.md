# TUKOLA — SECURITY CHECKLIST
### Merged from [vibe-check](https://github.com/benavlabs/vibe-check) (17 vulns) + [vibeappscanner](https://vibeappscanner.com/vibe-coding-security-checklist) (30 checks)
*First full run 16 Sep 2026 · Re-run before every production deploy and after adding any table or API route. Status: ✅ pass · ⚠️ partial · ❌ fail · ⬜ pending · 🔒 blocked on founder · N/A*

---

## CRITICAL — must all be ✅ before launch

| # | Check | Status | Evidence / action |
|---|---|---|---|
| C1 | RLS enabled on ALL tables | ✅ **verified live** | All 24 tables `rls_enabled=true`, 16 Sep 2026 via Supabase MCP |
| C2 | RLS policies restrict access | ✅ by design | Zero policies = deny-all for anon/authenticated. All data via service-role API routes. Custom OTP auth means no `auth.uid()` — deny-all is correct, per-user policies impossible. (Migration `rls_lockdown`, applied 8 Sep 2026) |
| C3 | Unauthenticated DB queries return nothing | ✅ / spot-test advised | Implied by C2. Founder spot-test: `curl "$SUPABASE_URL/rest/v1/profiles" -H "apikey: $ANON_KEY"` should return `[]` or 401 |
| C4 | Service-role key server-only, never frontend | ✅ | Only `lib/supabase-server.ts`; env-only, never `NEXT_PUBLIC_` |
| C5 | No secrets in source code | ✅ | grep for `sk-`, `AIzaSy`, key patterns: clean |
| C6 | `.env*` in `.gitignore` | ✅ fixed 16 Sep | Added missing bare `.env` + `.env.production` |
| C7 | No secrets in git history | ❌ **known** | Old admin PIN was committed pre-Jul 2026. Purge optional — rotation makes it moot → C9 |
| C8 | Server-side auth on all protected API routes | ✅ | All 58 routes derive user from server session or admin/cron secret; only `/api/auth/login` + `/api/public-stats` intentionally open. 31-route audit closed edit/delete + phone-exposure holes (commit `9e224cd`) |
| C9 | Previously exposed keys rotated | ✅ | Rotated by founder 14 Sep 2026 (plan v2, Sep-14 session log) |
| C10 | API routes verify resource ownership (IDOR) | ✅ / re-check new routes | Session-derived identity throughout. ⚠️ Route count grew 39→58 since last audit — new routes (claims, wallet, referrals, milestones) need the same neighbor-check |
| C11 | Input validation on all endpoints | ⚠️ | Manual validation, no schema library. Adopt zod (or equivalent) for all new routes; retrofit high-risk ones (payments, claims, wallet) |
| C12 | Payment webhooks verified | ✅ | HMAC-SHA256 over raw body via `PAYMENT_WEBHOOK_SECRET`; unsigned callbacks ignored; idempotent |
| C13 | Production secrets set in hosting platform | ✅ | App live on tukolaapp.com via Vercel; env vars set there (Sep-14 session) |

## HIGH

| # | Check | Status | Evidence / action |
|---|---|---|---|
| H1 | SSRF — no user-controlled URLs in server fetches | ✅ | All `fetch()` targets from env config (MoMo, AT, PostHog, Nominatim) |
| H2 | CSRF | ✅ | Session cookie `SameSite=lax`, `httpOnly`, `secure` in prod (`lib/session.ts`) |
| H3 | Wildcard CORS | ✅ | No CORS overrides; Next.js same-origin default |
| H4 | Rate limiting | ⚠️ | On OTP request/verify, register, contact, feedback, cron. **Missing: `/api/auth/login`, payment initiation endpoints** — add before launch |
| H5 | SQL injection | ✅ | supabase-js query builder only; no raw SQL from user input |
| H6 | XSS | ✅ | No `dangerouslySetInnerHTML`; React escaping default |
| H7 | Hallucinated packages (slopsquatting) | ✅ | 9 prod deps, all mainstream; no typosquats |
| H8 | Dependency vulnerabilities | ⚠️ improved 16 Sep | `next` 14.2.5→14.2.35, postcss forced to 8.5.28 (override), nanoid patched; build + smoke test green. **Remaining: 1 critical umbrella advisory on next-core, fixed only in Next 16 (breaking).** Sub-CVEs mostly N/A here: no Server Actions, no middleware, no rewrites, Vercel-managed image optimization. → Planned migration, build list #14 |

## MEDIUM / LOW

| # | Check | Status | Evidence / action |
|---|---|---|---|
| M1 | HSTS | ✅ fixed 16 Sep | `next.config.js` headers, all routes |
| M2 | X-Content-Type-Options: nosniff | ✅ fixed 16 Sep | same |
| M3 | X-Frame-Options: DENY | ✅ fixed 16 Sep | same (clickjacking) |
| M4 | Referrer-Policy | ✅ fixed 16 Sep | `strict-origin-when-cross-origin` |
| M5 | Content-Security-Policy | ⬜ hardening | Needs per-request nonces (middleware) — App Router hydration uses inline scripts. Do not set a naive `'self'` CSP; it will break the app |
| M6 | File uploads | ⚠️ | Bucket allowlist + image-only + 5MB cap. MIME is client-asserted → add magic-byte sniffing (hardening) |
| M7 | Verbose error messages | ⚠️ low | Admin routes return `err.message` (admin-gated, low risk). Standardize generic client errors + server-side detail logs |
| M8 | Sensitive data in logs | ✅ / guard | Only mock providers log OTP/phone (dev). **Pre-deploy gate: `SMS_PROVIDER` and `PAYMENT_PROVIDER` must not be `mock` in production** |
| M9 | Session timeout | ✅ | `SESSION_TTL_MS` enforced; logout clears cookie |
| M10 | Source maps in production | ✅ | Next default (no `productionBrowserSourceMaps`) |
| M11 | Weak password hashing | N/A → ✅ | No passwords. OTP: 6-digit crypto-random, HMAC-hashed at rest, timing-safe compare, max 5 attempts, one active code per phone |
| M12 | Email verification | N/A | Phone OTP *is* the verification channel |
| M13 | Error boundaries | ⬜ verify | `loading.tsx` exists; confirm `error.tsx` boundaries on app segments show generic messages |

## Per-Update Gate (mandatory — run on EVERY code change, in every chat)

This gate is binding on all agents via `CLAUDE.md`. Pick the rows matching what you touched; each must be ✅ or disclosed to the founder before the change counts as done.

| If you touched… | 60-second check | Pass |
|---|---|---|
| **Any API route** | User ID from session, not client? Ownership check on the resource? Rate limit if public/auth-adjacent? Errors generic to client? Neighbors checked for the same bug class? | C8/C10/C11/H4/M7 |
| **Any DB table/migration** | RLS enabled? Zero anon policies (deny-all)? All access via service-role API routes only? Migration file in repo AND applied to live DB (no drift)? | C1–C4 |
| **Server-owned field** (`is_verified`, rating, escrow, wallet, score) | Written by server logic only? Client payload value ignored/rejected? | C10 |
| **Dependencies** (`package.json`) | `npm audit --omit=dev` shows no new critical/high? Package name spelled correctly (slopsquatting)? Lockfile committed? | H7/H8 |
| **Config / env** | No secrets outside env vars? New env var added to `.env.local.example` as placeholder? `.gitignore` still covers it? | C5–C7 |
| **UI rendering user content** | No `dangerouslySetInnerHTML`? URLs/phones from DB rendered as text, not raw HTML? | H6 |
| **File upload path** | Bucket allowlist? Type + size limits? Magic-byte check if new endpoint? | M6 |
| **Webhook / callback** | Signature verified? Idempotent? Unsigned requests ignored? | C12 |
| **Auth / session** | Cookie still httpOnly + SameSite=lax + secure-in-prod? OTP rules intact (HMAC, 5 attempts)? | H2/M9/M11 |

**Reporting rule:** end-of-turn summary includes "Security gate: rows run → result" — e.g. *"Security gate: API route row ✅, dependency row ✅ (audit clean)"*.

## Standing rules (so this stays true)

1. New table → RLS enabled, **zero anon policies** (deny-all), access via API route only.
2. New API route → session-derived identity + ownership check + rate limit if public/auth-adjacent. Check its neighbors for the same bug class.
3. Server-owned fields (`is_verified`, ratings, escrow, wallet, reliability score) never accepted from client payloads.
4. **Every code change runs the Per-Update Gate above.** Re-run this full checklist before every deploy. When traction is real: hire a pentester — no checklist replaces one.

*Verified live via Supabase MCP 16 Sep 2026 (project `qpnetjblxjnbmeboppwx`). Codebase evidence from `kola/` at commit range through `5433fbf`. Deps: `next@14.2.35` + `postcss@8.5.28` (override), build + smoke test green 16 Sep 2026.*
