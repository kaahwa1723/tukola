# TUKOLA — PRODUCT REQUIREMENTS DOCUMENT (PRD)
### What we're building, who it's for, what it must do
*Created 8 Sep 2026 · Distilled from `../TUKOLA-MASTER-DOCUMENT.md` (the business source of truth) and `../Tukola-App-Rebuild-Plan.md` (v1 governing spec). If business context conflicts, the master document wins. Tech detail lives in `ARCHITECTURE.md`; quick reference in `ARCHITECTURE-ESSENTIALS.md`.*

---

## 1. What Tukola is

A **transaction-owning marketplace** connecting households and SMEs in Greater Kampala (GKMA) with vetted blue-collar workers ("fundis": cleaners, plumbers, electricians, carpenters, painters, movers, security, drivers).

**The flow:** post a job in 60 seconds → matched by location → hire an ID-verified, rated fundi → **pay through the platform (escrow by default above UGX 100K)** → every job backed by a **work guarantee (re-do or refund up to UGX 200K)**.

**Positioning:** *"Tukola stands behind every job."* We sell certainty and recourse — never cheapness.

**Revenue:** 10% flat launch commission on completed platform-paid jobs (all jobs incl. B2B; negotiable band 7%–15%, path to 12–15% after density is proven) · B2B contracts (UGX 150K/mo service fee + EFRIS invoicing) · Featured Passes (garnish only) · fundi fintech (Phase 3, M12+).

## 2. Who it's for

| Side | Who | What they need |
|---|---|---|
| **Demand** | Middle/upper-income GKMA households (women-led booking wedge) + SMEs/landlords/Airbnbs/offices/NGOs | Safety-verified fundis, recourse when work fails, EFRIS invoices to expense labor legally |
| **Supply** | Fundis earning UGX 3,486–4,810/hour informally via brokers (10–30% cut) and WhatsApp | Steady jobs without broker fees, same-day payout, portable reputation |

**Environment reality:** only ~35% of handsets are smartphones; data costs matter (avg comms spend ~UGX 15,721/mo); MoMo USSD-push is the payment reality; internet shutdowns have happened (offline tolerance is risk mitigation).

## 3. What the product must do

**Phase 0 — Trust plumbing (code COMPLETE, gate blocked on founder credentials):**
- Real OTP login via local SMS (Africa's Talking class stubbed; mock provider live)
- Server-side sessions; all API routes derive identity from session
- Escrow ledger: `pending → held → released/refunded/disputed`, guarded transitions
- Commission split 10%/90% on release + 2% guarantee accrual
- Two-tap completion (fundi "Job done" → customer "Confirm & release" or dispute)
- EFRIS-ready receipts · idempotent payment webhooks · auto-release cron
- Honest analytics: 10 real funnel events, live DB counters, zero fabricated stats

**Phase 1 — Liquidity UX (partially built):**
- ✅ Location-first matching (parish-level, no precise GPS) + merit-ranked Top-3 suggestions
- ✅ Re-book same fundi (1 tap) · recurring bookings (weekly/biweekly + cron)
- ⚠️ EN/Luganda switch (AI-drafted Luganda needs native-speaker review)
- ⬜ WhatsApp integration (blocked on Meta/Africa's Talking account)
- ⬜ PWA offline queue for job posts/applications · bundle/2G audit

**Phase 2 — Retention & B2B (buildable now):**
- ✅ Leakage guard (chat keyword logging) · repeat-hire metric
- ⬜ Reliability score v1 · referral mechanics · guarantee claims flow · B2B accounts

## 4. The 4 hard rules (permanent)

1. **No fabricated data** — real counts or none, everywhere (landing, decks, dashboards)
2. **No secrets in the repo** — env vars only
3. **Every job payable in-platform** — no exceptions (the escrow owns completion data)
4. **MoMo USSD-push reality** — payment UX must match how MoMo actually works

## 5. Explicitly OUT of scope (do not build)

Native iOS · USSD app · ads · "AI matching"/ML claims · languages beyond EN+Luganda · beyond GKMA (24 months) · data reports · enterprise packages · consumer subscriptions (no recurring MoMo debit exists in Uganda — verified).

## 6. Success gates (Day-90)

≥300 vetted active fundis (5 trades, 3–5 parishes) · ≥250 completed paid jobs cumulative (≥120 final month) · ≥60% fill rate in pilot parishes · ≥20% 90-day repeat-hire · guarantee loss <2% of GMV · ≥UGX 4–6M/mo net run-rate · ≥3 B2B contracts · URSB/TIN/PDPO/EFRIS done.

## 7. Product lessons locked in (from field-tested mistakes — see `../Tukola-Lessons-Applied.md`)

- **Database is relational (Supabase) and stays that way** — data model decided before code
- **Users must never be able to edit server-owned fields** (verified badge, rating, escrow) — RLS deny-all for anon, enforcement in API routes only
- **Onboarding precedes signup** (already the flow: onboarding → login → verify → role)
- **Every empty state has one obvious next step** (sweep pending)
- **Analytics from day one** (done — PostHog-gated, no fabricated stats)
- **AI features ship with caching + cost caps** (currently no in-app AI; rule applies when added)
- **Feedback board with upvotes** (planned — see rebuild plan build list)
