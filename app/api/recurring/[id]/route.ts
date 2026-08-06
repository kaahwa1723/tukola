import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';

type Params = { params: { id: string } };

/**
 * PATCH /api/recurring/[id] — pause or resume a recurring template.
 * Body: { active: boolean } — the employer owns the template.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { active } = await req.json();
    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active (boolean) is required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data: template } = await sb
      .from('recurring_templates')
      .select('employer_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (template.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer can change this recurring booking' }, { status: 403 });
    }

    const { data, error } = await sb
      .from('recurring_templates')
      .update({ active })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (err: any) {
    console.error('[PATCH /api/recurring/[id]]', err);
    return NextResponse.json({ error: 'Could not update the recurring booking.' }, { status: 500 });
  }
}
