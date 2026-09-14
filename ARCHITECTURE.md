# TUKOLA — ARCHITECTURE
### Complete technical reference for the `kola/` app
*Created 8 Sep 2026 · Product context: `PRD.md` · Quick reference: `ARCHITECTURE-ESSENTIALS.md` · Build status: `../Tukola-App-Rebuild-Plan-v2.md`*

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14.2.5 (App Router) + TypeScript + Tailwind | PWA-first; one codebase for UI + API |
| Database | Supabase (Postgres) — project ref `qpnetjblxjnbmeboppwx` | Relational (jobs ↔ profiles ↔ escrow are deeply joined); free tier fits <$100/mo rule |
| Auth | Custom: SMS OTP (`lib/otp.ts`) + server-issued sessions (`lib/session.ts`) | No Supabase Auth — phone-first market, no emails |
| Payments | MTN MoMo RequestToPay (implemented, sandbox-ready) + Flutterwave stub, behind `lib/payments/` provider interface | Dual-rail or die |
| SMS | `SmsProvider` interface (`lib/sms/`); mock live, `AfricasTalkingProvider` stubbed (~30 lines remain) | Local SMS UGX 25–35, never Twilio |
| Analytics | PostHog (no-op without key — by design) + `/api/admin/funnel` from DB | Honest metrics only |
| i18n | `lib/i18n.tsx` EN/Luganda | Luganda text AI-drafted — needs native review |
| Hosting | Vercel (not yet deployed) · 3 crons in `vercel.json` | — |
| Deferred | `tukola-native/` (Expo) — OFF-LIMITS, do not touch | — |

## 2. Directory map

```
kola/
├── app/
│   ├── page.tsx / role / login / verify / onboarding   ← public flow (onboarding BEFORE signup)
│   ├── employer/  (dashboard, post-job, jobs, hire, messages, profile)
│   ├── worker/    (dashboard, jobs, messages, profile)
│   ├── admin/     (stats, funnel, users, jobs, disputes)
│   ├── completion/  job completion + confirm-release UX
│   └── api/       ← ALL data access happens here (39 routes, see §5)
├── components/    shared UI (ImagePicker, UploadImagePicker, …)
├── hooks/  lib/   ← business logic (see §4)
└── supabase/
    ├── schema.sql         ← original 6-table schema (§7 policies SUPERSEDED by 006)
    └── migrations/        002_admin · 003_mvp_fixes · 004_identity · 005_payments · 006_rls_lockdown (draft)
```

## 3. The security model (read this before touching anything)

**All database access flows through Next.js API routes using the service-role key** (`lib/supabase-server.ts`). The browser never queries Supabase directly; the anon key in the bundle is vestigial.

- `lib/session.ts` — server-issued session; every route derives user ID from it. localStorage-as-identity is dead.
- `lib/admin-auth.ts` — admin routes gated by ADMIN_PIN session.
- `lib/cron-auth.ts` — cron routes gated by secret.
- `lib/rate-limit.ts` — OTP/payment endpoint throttling.
- `lib/contact-visibility.ts` — phone numbers locked behind escrow.
- `lib/leakage.ts` — chat filter logs phone/payment keyword exchanges (log, don't block).

**RLS posture:** `006_rls_lockdown.sql` (drafted, not yet applied) drops the 17 demo-era `USING (true)` policies and revokes anon/authenticated access entirely. Zero policies = deny-all = correct, because there is no `auth.uid()` in a custom-OTP system. **Server-owned fields (`is_verified`, `rating`, `completed_jobs`, escrow amounts, roles) must only ever be written by API routes — never trust client-supplied values for them.**

**⚠️ Known soft spot:** `createServerSupabase()` falls back to the anon key if `SUPABASE_SERVICE_ROLE_KEY` is unset. After 006 is applied, that fallback = total app failure (fail-closed, acceptable) — but ensure the env var is set in every environment.

## 4. lib/ modules

`escrow.ts` (state machine below) · `payments/` (MoMo + Flutterwave providers, idempotent webhooks via `PAYMENT_WEBHOOK_SECRET`) · `otp.ts` + `sms/` (swappable provider) · `session.ts` · `analytics.ts` (10 funnel events) · `leakage.ts` · `rate-limit.ts` · `phone.ts` (E.164 +256 normalization at every entry point) · `i18n.tsx` · `store.tsx` (client state) · `data.ts` · `types.ts` · `constants.ts`.

**Escrow states:** `pending → held → released / refunded / disputed` — transitions guarded. Release splits 10% platform / 90% fundi and accrues 2% to `guarantee_reserve`. Two-tap completion: fundi marks done → employer confirms release or disputes. Auto-release 48h post-completion via cron.

## 5. API surface (39 routes)

- **Auth:** `/api/auth/otp/request|verify` · `/api/auth/register|login|logout|me`
- **Jobs:** `/api/jobs` · `/api/jobs/[id]` · `…/apply|accept|mark-done|complete|confirm-release|dispute|rebook`
- **Marketplace:** `/api/fundis` (area+skill, parish-level, merit-ranked Top-3) · `/api/users/[id]`
- **Comms:** `/api/messages` · `/api/messages/[conversationId]`
- **Payments:** `/api/payments` · `…/[id]/status|receipt` · `/api/payments/webhook`
- **Recurring:** `/api/recurring` · `/api/recurring/[id]`
- **Ratings:** `/api/ratings`
- **Admin:** `/api/admin/auth|stats|funnel|users|users/[id]|disputes|disputes/[id]/resolve`
- **Crons** (`vercel.json`): `auto-release` */30min · `recurring` 17 3 * * * · `reconcile` 43 4 * * *
- **Misc:** `/api/public-stats` (honest landing counters) · `/api/upload`

## 6. Data model

| Table | From | Notes |
|---|---|---|
| `profiles` | schema.sql | workers+employers; `is_verified`, `rating`, `completed_jobs` are SERVER-OWNED |
| `jobs` | schema.sql | `employer_phone` sensitive — exposure via API is escrow-gated |
| `applications` | schema.sql | UNIQUE(job_id, worker_id) |
| `conversations`, `messages` | schema.sql | private — must never be anon-readable |
| `ratings` | schema.sql | two-way, great/issues |
| `otp_codes` | 004 | DB-backed codes, RLS enabled, no policies (deny-all) |
| `payments` | 005 | escrow ledger |
| `guarantee_reserve` | 005 | 2% accrual, ≤UGX 200K claims |
| `disputes` | 005 | claim → admin review → payout |
| `rebook_invites`, `leakage_events`, `recurring_booking_templates` | applied live | ⚠️ **NOT in repo migrations — schema drift, backfill into repo** |

## 7. Ops & limits

- Dev: `./node_modules/.bin/next dev -p 3131` (npx not on PATH) — kill by PID when done; never leave running
- Typecheck: `./node_modules/.bin/tsc --noEmit` after code changes
- `next build` passes (46 pages) as of 7 Aug 2026
- Committed milestones: `9c68896` secrets · `ad56d28` OTP+sessions · `61041d8` escrow · `4004404` analytics · `ed5132b` phone-gating · `9e224cd` security+rebook+leakage · `d80cbe4` matching+recurring+i18n
- Budget rule: software <$100/month

## 8. Known gaps / technical debt

1. RLS lockdown 006 drafted, not applied; live-DB verification pending (MCP unreachable 8 Sep 2026)
2. Schema drift: 3 live migrations missing from repo
3. Anon-key fallback in `createServerSupabase()`
4. Luganda translations AI-drafted (job detail, post-job, onboarding, dashboards still English)
5. No PWA service worker / offline queue · no bundle/2G audit
6. Reconciliation cron route exists; check logic not written
7. `AfricasTalkingProvider` is a template comment (~30 lines)
8. Empty-state CTA sweep incomplete · no feedback board · no home-screen widget (native, later)
