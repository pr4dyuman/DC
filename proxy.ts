import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth-utils";
import { isDashboardRouteAllowed } from "./lib/dashboard-route-access";

export default async function proxy(request: NextRequest) {
    const token = request.cookies.get("auth_token")?.value;

    let session = null;
    if (token) {
        session = await verifyToken(token);
    }

    if (request.nextUrl.pathname.startsWith("/super-admin")) {
        if (session?.role !== "superadmin") {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    if (request.nextUrl.pathname.startsWith("/dashboard")) {
        if (!session) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("from", request.nextUrl.pathname);
            return NextResponse.redirect(loginUrl);
        }

        if (session.role === "superadmin" && request.nextUrl.pathname === "/dashboard") {
            return NextResponse.redirect(new URL("/super-admin", request.url));
        }

        if (!isDashboardRouteAllowed(session.role, request.nextUrl.pathname)) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    const requestHeaders = new Headers(request.headers);
    if (session) {
        requestHeaders.set("x-user-id", session.userId);
        requestHeaders.set("x-user-role", session.role);
        if (session.agencyId) requestHeaders.set("x-agency-id", session.agencyId);
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ["/dashboard/:path*", "/super-admin/:path*"],
};
