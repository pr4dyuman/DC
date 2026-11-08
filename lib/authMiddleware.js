import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

import { getSessionUser } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(JWT_SECRET || '');

function unauthorized() {
  return {
    authorized: false,
    response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
  };
}

/** A signed-in Digital Corvids super admin, who can manage site content too. */
async function getSuperAdminEditor() {
  try {
    const session = await getSessionUser();
    if (session?.role === 'superadmin') {
      return { superAdmin: true, userId: session.userId };
    }
  } catch (error) {
    console.error('[authMiddleware] Super admin check failed:', error);
  }
  return null;
}

/**
 * Check if the request may manage site content: a marketing admin signed in
 * at /admin, or a super admin signed in to the main app.
 * @returns {Promise<{authorized: boolean, response?: NextResponse, admin?: object}>}
 */
export async function checkAuth() {
  if (!JWT_SECRET) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Server misconfiguration' },
        { status: 500 }
      )
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');

  if (token?.value) {
    try {
      const { payload } = await jwtVerify(token.value, encodedKey);
      if (payload.role === 'marketing-admin') {
        return { authorized: true, admin: payload };
      }
    } catch {
      // Expired or invalid: fall through to the super admin check.
    }
  }

  const superAdmin = await getSuperAdminEditor();
  if (superAdmin) {
    return { authorized: true, admin: superAdmin };
  }

  return unauthorized();
}
