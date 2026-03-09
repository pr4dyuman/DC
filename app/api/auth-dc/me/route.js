import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/authMiddleware';

export async function GET() {
  const auth = await checkAuth();

  if (auth.authorized) {
    return NextResponse.json({ authenticated: true }, { status: 200 });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
