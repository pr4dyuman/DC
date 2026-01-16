
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth-utils';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  
  // Verify token if present
  let session = null;
  if (token) {
    session = await verifyToken(token);
  }

  // 1. Super Admin Protection
  if (request.nextUrl.pathname.startsWith('/super-admin')) {
    if (session?.role !== 'superadmin') {
       // If attempting to access super-admin without permission, redirect to dashboard or login
       return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Dashboard Protection
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!session) {
        // Redirect to login if no session
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      // Redirect Super Admins accessing root dashboard to their portal
      if (session.role === 'superadmin' && request.nextUrl.pathname === '/dashboard') {
          return NextResponse.redirect(new URL('/super-admin', request.url));
      }
  }

  // 3. Request Headers for Server Components
  const requestHeaders = new Headers(request.headers);
  if (session) {
      requestHeaders.set('x-user-id', session.userId);
      requestHeaders.set('x-user-role', session.role);
      if (session.agencyId) requestHeaders.set('x-agency-id', session.agencyId);
  }

  return NextResponse.next({
      request: {
          headers: requestHeaders,
      },
  });
}

export const config = {
  matcher: ['/dashboard/:path*', '/super-admin/:path*']
};
