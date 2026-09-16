# TUKOLA — ARCHITECTURE ESSENTIALS
### Critical decisions only. Full detail: `ARCHITECTURE.md`. Product: `PRD.md`.

**One-line:** Next.js 14 PWA + Supabase Postgres; browser NEVER touches the DB — all access via API routes with the service-role key.

## Non-negotiable decisions

1. **DB access:** service-role key in API routes only. RLS deny-all for anon/authenticated (migration 006). Custom OTP sessions — there is no `auth.uid()`, ever.
2. **Server-owned fields** (never accept from client): `is_verified`, `rating`, `completed_jobs`, role, escrow/payment amounts, guarantee payouts.
3. **Escrow state machine:** `pending → held → released/refunded/disputed`. Guarded transitions only. Release = 17% platform / 83% fundi + 2% guarantee accrual.
4. **Phones:** E.164 `+256` normalization at every entry point (`lib/phone.ts`). MoMo number ≠ contact number. Contact details locked behind escrow.
5. **Payments:** dual-rail — MTN MoMo primary, Flutterwave redundancy. Idempotent webhooks. USSD-push UX reality.
6. **No fabricated data anywhere.** Landing counters query the live DB.
7. **No secrets in repo.** Env vars only. `NEXT_PUBLIC_DEMO_MODE=false`.
8. **Software budget <$100/month.** Free tiers first.
9. **Offline-tolerant, 2G-conscious, parish-level location** (never precise GPS).
10. **EN + LG + SW + LUO only** (founder added Swahili/Luo Sep 2026). All non-English strings AI-drafted — flagged for native review before marketing.

## Flow order (do not rearrange)

`onboarding → login → OTP verify → role pick → dashboard` — onboarding BEFORE signup (conversion lesson, locked).

## Do NOT

- Touch `tukola-native/` (deferred Expo app)
- Add Supabase client calls in browser code
- Build: native iOS, USSD, AI matching, ads, >2 languages, beyond GKMA
- `git add -A` / `git commit -a` (founder has ~59 uncommitted files — stage by name only)
- Leave the dev server running

## When unsure

Plan vs code conflict → STOP and ask. Status source of truth: `../Tukola-App-Rebuild-Plan-v2.md`. Business truth: `../TUKOLA-MASTER-DOCUMENT.md`.
