import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Check if the request is authenticated
 * @returns {Promise<{authorized: boolean, response?: NextResponse}>}
 */
export async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  
  if (!token || token.value !== 'logged_in_secret_value') {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }
  
  return { authorized: true };
}
