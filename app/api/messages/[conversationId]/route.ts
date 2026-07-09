import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapMessage } from '@/lib/supabase-server';

type Params = { params: { conversationId: string } };

/**
 * GET /api/messages/[conversationId]
 * Returns all messages in the conversation and marks them as read.
 * Query param: userId (the reading user — their messages get marked read)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const sb = createServerSupabase();

    const { data, error } = await sb
      .from('messages')
      .select('*')
      .eq('conversation_id', params.conversationId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Mark unread messages as read for this user
    if (userId) {
      await sb
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', params.conversationId)
        .eq('to_id', userId)
        .eq('read', false);

      // Reset unread count on conversation
      await sb
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', params.conversationId);
    }

    return NextResponse.json({ messages: (data ?? []).map(mapMessage) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/messages/[conversationId]
 * Sends a message and updates conversation last_message.
 * Body: { fromId, toId, fromName, text }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { fromId, toId, fromName, text } = await req.json();

    if (!fromId || !toId || !fromName || !text?.trim()) {
      return NextResponse.json({ error: 'fromId, toId, fromName and text are required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const timestamp = new Date().toISOString();

    // Insert message
    const { data: msg, error: msgError } = await sb
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        from_id: fromId,
        to_id: toId,
        from_name: fromName,
        text: text.trim(),
        timestamp,
        read: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation last_message and bump unread for recipient
    await sb
      .from('conversations')
      .update({
        last_message: text.trim(),
        last_message_time: timestamp,
        unread_count: sb.rpc('increment_unread', { conv_id: params.conversationId }) as any,
      })
      .eq('id', params.conversationId);

    // Simpler fallback — just update text and time
    await sb
      .from('conversations')
      .update({ last_message: text.trim(), last_message_time: timestamp })
      .eq('id', params.conversationId);

    return NextResponse.json({ message: mapMessage(msg) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/messages/[conversationId]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
