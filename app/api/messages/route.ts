import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapConversation } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';

/**
 * GET /api/messages
 * Returns all conversations for the SESSION user (no userId param —
 * you can only ever read your own inbox).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    // Embedded ordering uses `messages.order=timestamp.asc` (PostgREST has no
    // in-select `order:` syntax — that string would 400 the whole request).
    const { data, error } = await sb
      .from('conversations')
      .select('*, messages(*)')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_time', { ascending: false })
      .order('timestamp', { referencedTable: 'messages', ascending: true });

    if (error) throw error;

    return NextResponse.json({
      conversations: (data ?? []).map(c => mapConversation(c, user.id)),
    });
  } catch (err: any) {
    console.error('[GET /api/messages]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/messages
 * Creates a new conversation (or returns existing).
 * Body: { user2Id, jobId?, jobTitle? }
 *
 * The session user is always user1; their name comes from their profile.
 * user2 must exist in profiles. Client-supplied names are ignored.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { user2Id, jobId, jobTitle } = await req.json();
    if (!user2Id) {
      return NextResponse.json({ error: 'user2Id is required' }, { status: 400 });
    }
    if (user2Id === user.id) {
      return NextResponse.json({ error: 'Cannot start a conversation with yourself' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Counterparty must be a real profile
    const { data: other } = await sb
      .from('profiles')
      .select('id, name')
      .eq('id', user2Id)
      .maybeSingle();
    if (!other) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // ── Chat gate (anti-spam, anti-leakage) ──────────────────────────
    // Two strangers can never chat. A conversation requires a job link:
    // one party employs a job the other has applied to / been invited to /
    // been accepted on. Anyone circumventing this in the client is stopped
    // here, server-side.
    const [{ data: myJobs }, { data: theirJobs }] = await Promise.all([
      sb.from('jobs').select('id').eq('employer_id', user.id),
      sb.from('jobs').select('id').eq('employer_id', user2Id),
    ]);
    const myJobIds = (myJobs ?? []).map((j) => j.id);
    const theirJobIds = (theirJobs ?? []).map((j) => j.id);

    let linked = false;
    if (myJobIds.length > 0) {
      const { count } = await sb
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', user2Id)
        .in('job_id', myJobIds);
      linked = (count ?? 0) > 0;
    }
    if (!linked && theirJobIds.length > 0) {
      const { count } = await sb
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .in('job_id', theirJobIds);
      linked = (count ?? 0) > 0;
    }
    if (!linked) {
      return NextResponse.json(
        { error: 'You can only message someone once there is a job between you — apply to their job or wait for applicants on yours.' },
        { status: 403 }
      );
    }

    // Try to find existing conversation
    let existingQuery = sb
      .from('conversations')
      .select('*, messages(*)')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user.id})`);
    existingQuery = jobId ? existingQuery.eq('job_id', jobId) : existingQuery.is('job_id', null);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return NextResponse.json({ conversation: mapConversation(existing, user.id) });
    }

    const { data, error } = await sb
      .from('conversations')
      .insert({
        user1_id: user.id,
        user2_id: user2Id,
        user1_name: user.name,
        user2_name: other.name,
        other_user_name: other.name,
        job_id: jobId ?? null,
        job_title: jobTitle ?? null,
        last_message: '',
        unread_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: mapConversation({ ...data, messages: [] }, user.id) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/messages]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
