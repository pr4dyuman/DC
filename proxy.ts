
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth-utils';

// Role → allowed dashboard route prefixes
const ROLE_ROUTES: Record<string, string[]> = {
    client: ['/dashboard', '/dashboard/projects', '/dashboard/messages', '/dashboard/singularity'],
    employee: ['/dashboard', '/dashboard/projects', '/dashboard/messages', '/dashboard/singularity', '/dashboard/team'],
    manager: ['/dashboard', '/dashboard/projects', '/dashboard/messages', '/dashboard/singularity', '/dashboard/team', '/dashboard/finance', '/dashboard/clients', '/dashboard/settings'],
    admin: ['*'],
};

function isRouteAllowed(role: string, pathname: string): boolean {
    const allowed = ROLE_ROUTES[role];
    if (!allowed) return false;
    if (allowed.includes('*')) return true;
    return allowed.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export default async function proxy(request: NextRequest) {
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

      // Role-based route protection
      if (!isRouteAllowed(session.role, request.nextUrl.pathname)) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
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
