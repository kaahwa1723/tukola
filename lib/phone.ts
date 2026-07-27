/**
 * Uganda phone normalization — single canonical format: E.164 (+256XXXXXXXXX).
 *
 * Accepted inputs:
 *   +256712345678, 256712345678, 0712 345 678, 712-345-678, 0712345678
 * All are normalized to +256712345678.
 *
 * Ugandan mobile numbers are 9 digits after the country code and start
 * with 7 (MTN 76/77/78, Airtel 70/74/75, etc.). Fixed lines are rejected —
 * OTP is SMS-only.
 *
 * Use normalizeUgPhone() at EVERY entry point (login, OTP request, payout
 * setup, contact fields) so the database only ever stores E.164.
 */
export function normalizeUgPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Keep digits only — drops +, spaces, dashes, parentheses
  let digits = raw.replace(/\D/g, '');

  // Strip Uganda country code prefixes to get the 9-digit national number
  if (digits.startsWith('00256')) digits = digits.slice(5);
  else if (digits.startsWith('256')) digits = digits.slice(3);

  // Strip trunk prefix 0 (0712... → 712...)
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Must be exactly 9 digits starting with 7 (Ugandan mobile)
  if (!/^7\d{8}$/.test(digits)) return null;

  return `+256${digits}`;
}

/** True when the string is a valid, normalizable Ugandan mobile number. */
export function isValidUgPhone(raw: string | null | undefined): boolean {
  return normalizeUgPhone(raw) !== null;
}
