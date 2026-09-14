import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { getWalletBalance, settleTopup } from '@/lib/wallet';
import { getPaymentProvider } from '@/lib/payments/provider';
import { reportError } from '@/lib/error-report';

/**
 * GET /api/wallet — the caller's balance, recent ledger entries, and
 * top-up intents (session-derived identity; nobody can read another
 * user's wallet).
 *
 * Read-settle: pending top-ups older than 30s are verified server-to-
 * server with the payment provider and settled on the spot, so the
 * balance catches up even if RukaPay's webhook is slow or lost. The
 * webhook path settles them too — both paths are idempotent.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();

    const [{ data: topups }, { data: entries }] = await Promise.all([
      sb.from('wallet_topups')
        .select('id, amount_ugx, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      sb.from('wallet_entries')
        .select('id, kind, amount_ugx, note, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Opportunistically settle the user's stale pending top-ups
    const stale = (topups ?? []).filter(
      (t) => t.status === 'pending' && Date.now() - new Date(t.created_at).getTime() > 30_000
    );
    if (stale.length > 0) {
      const provider = getPaymentProvider();
      for (const t of stale) {
        try {
          const { data: full } = await sb
            .from('wallet_topups')
            .select('id, user_id, amount_ugx, status, provider_ref')
            .eq('id', t.id)
            .single();
          if (!full?.provider_ref) continue;
          const tx = await provider.getTransactionStatus(full.provider_ref);
          if (tx.status !== 'pending') {
            await settleTopup(sb, full, tx.status === 'successful' ? 'successful' : 'failed');
            t.status = tx.status === 'successful' ? 'successful' : 'failed';
          }
        } catch (e) {
          console.warn('[GET /api/wallet] topup settle check failed (non-fatal):', e);
        }
      }
    }

    const balance = await getWalletBalance(sb, user.id);
    return NextResponse.json({ balance, entries: entries ?? [], topups: topups ?? [] });
  } catch (err: any) {
    console.error('[GET /api/wallet]', err);
    reportError('wallet.read', err, { route: 'GET /api/wallet' });
    return NextResponse.json({ error: 'Could not load the wallet.' }, { status: 500 });
  }
}
