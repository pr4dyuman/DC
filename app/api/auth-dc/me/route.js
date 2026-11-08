import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await checkAuth();

  if (auth.authorized) {
    return NextResponse.json(
      {
        authenticated: true,
        email: typeof auth.admin?.email === 'string' ? auth.admin.email : null,
        superAdmin: auth.admin?.superAdmin === true,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
