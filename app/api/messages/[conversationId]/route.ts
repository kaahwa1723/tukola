import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapMessage } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { scanForLeakage } from '@/lib/leakage';
import { track } from '@/lib/analytics';

type Params = { params: { conversationId: string } };

/**
 * Load the conversation and verify the session user is a participant.
 * Returns the conversation row when authorized, null otherwise.
 */
async function getAuthorizedConversation(req: NextRequest, conversationId: string) {
  const user = await getSessionUser(req);
  if (!user) return { user: null, conv: null };

  const sb = createServerSupabase();
  const { data: conv } = await sb
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv || (conv.user1_id !== user.id && conv.user2_id !== user.id)) {
    return { user, conv: null };
  }
  return { user, conv };
}

/**
 * GET /api/messages/[conversationId]
 * Returns all messages in the conversation and marks the session user's
 * incoming messages as read. Participants only.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { user, conv } = await getAuthorizedConversation(req, params.conversationId);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('messages')
      .select('*')
      .eq('conversation_id', params.conversationId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Mark unread messages addressed to me as read
    await sb
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', params.conversationId)
      .eq('to_id', user.id)
      .eq('read', false);

    // Reset unread count on conversation
    await sb
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', params.conversationId);

    return NextResponse.json({ messages: (data ?? []).map(mapMessage) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/messages/[conversationId]
 * Sends a message from the SESSION user to the other participant.
 * Body: { text } — fromId/toId/fromName are all server-derived.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { user, conv } = await getAuthorizedConversation(req, params.conversationId);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const toId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
    const sb = createServerSupabase();
    const timestamp = new Date().toISOString();

    // Insert message
    const { data: msg, error: msgError } = await sb
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        from_id: user.id,
        to_id: toId,
        from_name: user.name,
        text: text.trim(),
        timestamp,
        read: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Bump unread for the recipient (own call — never inside update())
    const { error: unreadError } = await sb.rpc('increment_unread', { conv_id: params.conversationId });
    if (unreadError) console.warn('[increment_unread]', unreadError.message);

    // Update conversation last_message / last_message_time
    await sb
      .from('conversations')
      .update({ last_message: text.trim(), last_message_time: timestamp })
      .eq('id', params.conversationId);

    // Leakage guard (log, don't block): record off-platform signals so the
    // weekly metrics can measure leakage. The message always sends.
    const signals = scanForLeakage(text);
    let leakageWarning: string | null = null;
    if (signals.length > 0) {
      try {
        let hadCapturedPayment = false;
        if (conv.job_id) {
          const { count } = await sb
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', conv.job_id)
            .in('status', ['held', 'disputed', 'released']);
          hadCapturedPayment = (count ?? 0) > 0;
        }
        await sb.from('leakage_events').insert({
          conversation_id: params.conversationId,
          job_id: conv.job_id ?? null,
          from_id: user.id,
          matched: signals.join(','),
          had_captured_payment: hadCapturedPayment,
        });
        track('leakage_signal', user.id, { jobId: conv.job_id ?? null, signals, hadCapturedPayment });
        if (!hadCapturedPayment) {
          leakageWarning =
            'Heads up: jobs taken off-platform lose the payment guarantee, escrow protection, and ratings.';
        }
      } catch (e) {
        console.warn('[leakage guard]', e); // never let measurement break chat
      }
    }

    return NextResponse.json({ message: mapMessage(msg), leakageWarning }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/messages/[conversationId]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
