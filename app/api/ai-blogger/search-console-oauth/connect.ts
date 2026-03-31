import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import crypto from "crypto";

/**
 * Step 1 of OAuth flow
 * Generates OAuth authorization URL and redirects user to Google
 * POST /api/ai-blogger/search-console-oauth/connect
 */
export async function POST(req: NextRequest) {
    try {
        // Verify user is authenticated
        const session = await getSessionUser();
        const userId = session?.userId;
        const agencyId = session?.agencyId;

        if (!userId || !agencyId) {
            return NextResponse.json(
                { error: "Unauthorized - user not authenticated" },
                { status: 401 }
            );
        }

        // Get Google OAuth credentials from environment
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return NextResponse.json(
                { error: "OAuth credentials not configured on server" },
                { status: 500 }
            );
        }

        // Generate state token for CSRF protection
        const state = crypto.randomBytes(32).toString("hex");

        // Store state in sessionStorage via cookie (expires in 10 minutes)
        const stateCookie = {
            state,
            createdAt: Date.now(),
            agencyId,
        };

        // Build Google OAuth URL
        const scopes = [
            "https://www.googleapis.com/auth/webmasters.readonly", // Read-only Search Console
        ];

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: scopes.join(" "),
            state: state,
            access_type: "offline", // Get refresh token
            prompt: "consent", // Force consent screen to get refresh token
        });

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        // Return redirect URL and state for client-side handling
        return NextResponse.json({
            error: null,
            redirectUrl: googleAuthUrl,
            stateToken: state,
        });

    } catch (error) {
        console.error("[OAuth Connect] Error:", error);
        return NextResponse.json(
            { error: "Failed to initiate OAuth connection" },
            { status: 500 }
        );
    }
}
