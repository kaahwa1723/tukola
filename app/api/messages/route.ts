import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapConversation } from '@/lib/supabase-server';

/**
 * GET /api/messages?userId=xxx
 * Returns all conversations for the given user.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('conversations')
      .select('*, messages(*, order: timestamp.asc)')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_time', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      conversations: (data ?? []).map(c => mapConversation(c, userId)),
    });
  } catch (err: any) {
    console.error('[GET /api/messages]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/messages
 * Creates a new conversation (or returns existing).
 * Body: { user1Id, user2Id, otherUserName, jobId?, jobTitle? }
 */
export async function POST(req: NextRequest) {
  try {
    const { user1Id, user2Id, otherUserName, jobId, jobTitle } = await req.json();

    if (!user1Id || !user2Id || !otherUserName) {
      return NextResponse.json({ error: 'user1Id, user2Id, otherUserName are required' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Try to find existing conversation
    const { data: existing } = await sb
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .eq('job_id', jobId ?? null)
      .single();

    if (existing) {
      return NextResponse.json({ conversation: mapConversation(existing, user1Id) });
    }

    const { data, error } = await sb
      .from('conversations')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        other_user_name: otherUserName,
        job_id: jobId ?? null,
        job_title: jobTitle ?? null,
        last_message: '',
        unread_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: mapConversation(data, user1Id) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/messages]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
