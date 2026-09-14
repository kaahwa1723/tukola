/**
 * wallet.ts — the Tukola Wallet ledger (SafeBoda-style stored balance).
 *
 * Balance = SUM(wallet_entries.amount_ugx). The ledger is append-only;
 * every mutation is a new signed row with a UNIQUE idempotency key, so
 * webhook replays and client retries can never double-count money.
 *
 * Kinds:
 *   topup        + money in from MoMo (only after provider-verified success)
 *   job_funding  - instant escrow funding (no USSD prompt)
 *   refund       + escrow refunds land here (held → refunded)
 *   adjustment   ± manual admin correction (with a mandatory note)
 */

type Sb = ReturnType<typeof import('./supabase-server').createServerSupabase>;

export class InsufficientFundsError extends Error {
  constructor(public readonly balance: number, public readonly required: number) {
    super(`Wallet balance ${balance} < required ${required}`);
  }
}

export async function getWalletBalance(sb: Sb, userId: string): Promise<number> {
  const { data, error } = await sb
    .from('wallet_entries')
    .select('amount_ugx')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).reduce((sum, e) => sum + Number(e.amount_ugx), 0);
}

/**
 * Append a ledger row. Returns true when the row was written, false when
 * the idempotency key already existed (safe no-op on replay/retry).
 */
async function appendEntry(
  sb: Sb,
  entry: {
    userId: string;
    kind: 'topup' | 'job_funding' | 'refund' | 'adjustment';
    amountUgx: number;               // signed
    paymentId?: number;
    topupId?: number;
    idempotencyKey: string;
    note?: string;
  }
): Promise<boolean> {
  const { error } = await sb.from('wallet_entries').insert({
    user_id: entry.userId,
    kind: entry.kind,
    amount_ugx: entry.amountUgx,
    payment_id: entry.paymentId ?? null,
    topup_id: entry.topupId ?? null,
    idempotency_key: entry.idempotencyKey,
    note: entry.note ?? null,
  });
  if (error) {
    if (error.code === '23505') return false; // idempotency replay
    throw error;
  }
  return true;
}

export async function creditWallet(
  sb: Sb,
  args: Omit<Parameters<typeof appendEntry>[1], 'amountUgx'> & { amountUgx: number }
): Promise<boolean> {
  if (args.amountUgx <= 0) throw new Error('Credit amount must be positive');
  return appendEntry(sb, args);
}

/**
 * Debit with a balance check. NOTE: check-then-insert is not a DB-level
 * atomic operation — two SIMULTANEOUS debits of different jobs could
 * overdraw. Same-job double-debit is impossible (unique idempotency key).
 * At current volume this is acceptable; if wallets scale, move this into
 * a Postgres function with SELECT … FOR UPDATE on a balance cache row.
 */
export async function debitWallet(
  sb: Sb,
  args: Omit<Parameters<typeof appendEntry>[1], 'amountUgx'> & { amountUgx: number }
): Promise<boolean> {
  if (args.amountUgx <= 0) throw new Error('Debit amount must be positive');
  const balance = await getWalletBalance(sb, args.userId);
  if (balance < args.amountUgx) throw new InsufficientFundsError(balance, args.amountUgx);
  return appendEntry(sb, { ...args, amountUgx: -args.amountUgx });
}

/**
 * Settle a pending top-up after a provider-verified status: credit the
 * ledger exactly once (idempotency key per top-up), mark the intent row.
 */
export async function settleTopup(
  sb: Sb,
  topup: { id: number; user_id: string; amount_ugx: number; status: string },
  outcome: 'successful' | 'failed'
): Promise<void> {
  if (topup.status !== 'pending') return; // replay guard
  const { error } = await sb
    .from('wallet_topups')
    .update({ status: outcome, settled_at: new Date().toISOString() })
    .eq('id', topup.id)
    .eq('status', 'pending'); // only one concurrent settler wins
  if (error) throw error;

  if (outcome === 'successful') {
    await creditWallet(sb, {
      userId: topup.user_id,
      kind: 'topup',
      amountUgx: Number(topup.amount_ugx),
      topupId: topup.id,
      idempotencyKey: `topup_credit_${topup.id}`,
      note: 'Wallet top-up via Mobile Money',
    });
  }
}
