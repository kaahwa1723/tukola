import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/auth
 * Body: { pin: string }
 * Validates the admin PIN against ADMIN_PIN env var (default: "tukola2025")
 */
export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const secret = process.env.ADMIN_PIN ?? 'tukola2025';

  if (!pin || pin !== secret) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
