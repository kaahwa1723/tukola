/**
 * Pricing model — approved split (Tukola-Pricing-Model-Options.md):
 *
 *   - Jobs BELOW UGX 300,000 → 'standard': one payment, full amount held
 *     safely, released to the fundi when the employer confirms.
 *   - Jobs AT/ABOVE UGX 300,000 → 'milestone' (recommended, employer can
 *     opt out): pay in 3 stages — 30% start/materials, 40% main work,
 *     30% completion. Each stage is held separately and released when
 *     that stage is confirmed. The fundi gets materials money early;
 *     the employer never commits more than one stage at a time.
 *
 * RATE_CARD here mirrors the rate_card table seeded by migration 015.
 * The constants are the client-side source for instant display; the
 * table exists so ranges become admin-editable without a deploy.
 */

export const MILESTONE_THRESHOLD_UGX = 300_000;

export type PricingType = 'standard' | 'milestone';

export interface RateRange {
  min: number;
  max: number;
  note: string;
}

export const RATE_CARD: Record<string, RateRange> = {
  'Cleaning':           { min: 30000,  max: 150000,  note: 'Deep cleans may cost more' },
  'Plumbing':           { min: 40000,  max: 250000,  note: 'Parts not included' },
  'Electrical':         { min: 40000,  max: 250000,  note: 'Parts not included' },
  'Construction':       { min: 100000, max: 1500000, note: 'Labour per phase; materials separate' },
  'Moving & Delivery':  { min: 50000,  max: 300000,  note: 'Within one city' },
  'Gardening':          { min: 30000,  max: 150000,  note: 'Compound care and landscaping' },
  'Painting':           { min: 80000,  max: 500000,  note: 'Paint not included' },
  'Cooking & Catering': { min: 50000,  max: 400000,  note: 'Home cooking to events' },
  'Security':           { min: 50000,  max: 250000,  note: 'Per shift or part-time month' },
  'Driving':            { min: 30000,  max: 200000,  note: 'Per trip or per day' },
  'Events':             { min: 80000,  max: 600000,  note: 'Setup, decor, sound' },
  'Tailoring':          { min: 30000,  max: 250000,  note: 'Fabric not included' },
  'Technical Repair':   { min: 40000,  max: 300000,  note: 'Phones, appliances, electronics' },
  'Farming':            { min: 40000,  max: 300000,  note: 'Garden work, harvesting' },
  'Beauty & Wellness':  { min: 20000,  max: 150000,  note: 'Home service' },
  'Other':              { min: 20000,  max: 500000,  note: 'Agree a fair price with the fundi' },
};

export interface MilestoneStage {
  idx: number;
  label: string;
  pct: number;
  amountUgx: number;
}

const STAGE_DEFS = [
  { label: 'Getting started & materials', pct: 30 },
  { label: 'Main work', pct: 40 },
  { label: 'Completion & handover', pct: 30 },
];

/** Should this amount default to stage payments? */
export function suggestsMilestones(payUgx: number): boolean {
  return payUgx >= MILESTONE_THRESHOLD_UGX;
}

/**
 * Split a total into stages. Rounding: each stage rounds normally and
 * the LAST stage absorbs the remainder, so stages always sum exactly
 * to the total.
 */
export function milestoneTemplate(totalUgx: number): MilestoneStage[] {
  let allocated = 0;
  return STAGE_DEFS.map((def, i) => {
    const isLast = i === STAGE_DEFS.length - 1;
    const amountUgx = isLast ? totalUgx - allocated : Math.round(totalUgx * def.pct / 100);
    allocated += amountUgx;
    return { idx: i + 1, label: def.label, pct: def.pct, amountUgx };
  });
}

export function formatUgx(n: number): string {
  return `UGX ${n.toLocaleString('en-US')}`;
}
