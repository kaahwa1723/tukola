/**
 * Leakage guard — Phase 2, "log, don't block".
 *
 * Scans in-app chat for off-platform signals: Ugandan phone numbers and
 * direct-payment keywords. Matches are recorded in `leakage_events` so
 * the Monday metrics review can measure leakage — messages are NEVER
 * blocked (blocking just teaches people to write "call me on zero seven…").
 */

// Uganda mobiles: 07XX XXX XXX, +256 7XX…, 256 7XX…, with optional separators
const UG_PHONE = /(?:\+?256[\s.-]?|0)7[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/;

// Direct-payment / off-platform intent keywords
const KEYWORDS =
  /\b(momo|mobile money|mtn money|airtel money|send money|pay me direct(ly)?|pay direct(ly)?|cash only|outside the app|off.?platform|whatsapp me|call me)\b/i;

/** Returns the matched signal kinds, empty when the message looks clean. */
export function scanForLeakage(text: string): string[] {
  const hits: string[] = [];
  if (UG_PHONE.test(text)) hits.push('phone_number');
  const kw = text.match(KEYWORDS);
  if (kw) hits.push(`keyword:${kw[1].toLowerCase()}`);
  return hits;
}
