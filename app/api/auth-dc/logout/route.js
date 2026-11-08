import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { validateCsrfOrigin } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// Signs out of the content admin at /admin. A super admin's main session is
// left alone; they sign out from the app.
export async function POST(req) {
  const csrf = validateCsrfOrigin(req);
  if (!csrf.valid) return csrf.response;

  const cookieStore = await cookies();
  cookieStore.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
