import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(JWT_SECRET || '');

/**
 * Check if the request is authenticated (marketing admin)
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

  if (!token?.value) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }

  try {
    const { payload } = await jwtVerify(token.value, encodedKey);
    if (payload.role !== 'marketing-admin') {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }
    return { authorized: true, admin: payload };
  } catch {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }
}
