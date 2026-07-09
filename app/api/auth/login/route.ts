import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';

/**
 * POST /api/auth/login
 * Body: { phone, name, role }
 * Returns the user profile (creates it if new).
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, name, role } = await req.json();

    if (!phone || !name || !role) {
      return NextResponse.json({ error: 'phone, name and role are required' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Try to find existing profile by phone
    const { data: existing } = await sb
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existing) {
      return NextResponse.json({ user: mapUser(existing) });
    }

    // Create new profile
    const newId = `user_${Date.now()}`;
    const { data: created, error } = await sb
      .from('profiles')
      .insert({
        id: newId,
        name,
        phone,
        role,
        location: 'Kampala, Uganda',
        rating: 4.5,
        completed_jobs: 0,
        skills: [],
        about: '',
        response_time: '< 30 mins',
        last_active: 'Just now',
        is_verified: false,
        portfolio_images: [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user: mapUser(created) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}
