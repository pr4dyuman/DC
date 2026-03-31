import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, getSessionAgencyId } from "@/lib/auth";
import { BlogStudioSettingsModel, connectDB, encryptApiKey } from "@/lib/mongodb";
import { redirect } from "next/navigation";

/**
 * Step 2 of OAuth flow
 * Receives authorization code from Google
 * Exchanges code for tokens
 * Stores tokens encrypted in database
 * GET /api/ai-blogger/search-console-oauth/callback?code=...&state=...
 */
export async function GET(req: NextRequest) {
    try {
        // Verify user is authenticated
        const userId = await getSessionUserId();
        const agencyId = await getSessionAgencyId();

        if (!userId || !agencyId) {
            return NextResponse.redirect(
                new URL(
                    "/login?error=Unauthorized",
                    req.nextUrl.origin
                )
            );
        }

        // Get authorization code from query params
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // Handle user rejection
        if (error === "access_denied") {
            return NextResponse.redirect(
                new URL(
                    `/app/dashboard/ai-blogger?error=oauth_denied`,
                    req.nextUrl.origin
                )
            );
        }

        // Validate we got a code
        if (!code || !state) {
            return NextResponse.redirect(
                new URL(
                    `/app/dashboard/ai-blogger?error=missing_params`,
                    req.nextUrl.origin
                )
            );
        }

        // Get Google OAuth credentials
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            console.error("[OAuth Callback] Missing OAuth credentials");
            return NextResponse.redirect(
                new URL(
                    `/app/dashboard/ai-blogger?error=server_config`,
                    req.nextUrl.origin
                )
            );
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }).toString(),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error("[OAuth Callback] Token exchange failed:", error);
            return NextResponse.redirect(
                new URL(
                    `/app/dashboard/ai-blogger?error=token_exchange_failed`,
                    req.nextUrl.origin
                )
            );
        }

        const tokens = await tokenResponse.json();

        if (!tokens.refresh_token || !tokens.access_token) {
            console.error("[OAuth Callback] No tokens received:", tokens);
            return NextResponse.redirect(
                new URL(
                    `/app/dashboard/ai-blogger?error=no_tokens`,
                    req.nextUrl.origin
                )
            );
        }

        // Get user's Google Search Console properties
        const domainsResponse = await fetch(
            "https://www.googleapis.com/webmasters/v3/sites",
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                },
            }
        );

        if (!domainsResponse.ok) {
            console.error("[OAuth Callback] Failed to fetch Search Console domains");
            return NextResponse.redirect(
                new URL(
                    `/app/dashboard/ai-blogger?error=failed_fetch_domains`,
                    req.nextUrl.origin
                )
            );
        }

        const domainsData = await domainsResponse.json();
        const domains = domainsData.siteEntry || [];

        if (domains.length === 0) {
            console.warn("[OAuth Callback] No Search Console properties found for user");
            return NextResponse.redirect(
                new URL(
                    `/app/dashboard/ai-blogger?error=no_properties`,
                    req.nextUrl.origin
                )
            );
        }

        // Store the tokens and domain selection prompt in session storage
        // We'll let the frontend handle domain selection with a modal
        const response = NextResponse.redirect(
            new URL(
                `/app/dashboard/ai-blogger?oauth_complete=true`,
                req.nextUrl.origin
            )
        );

        // Store tokens and domains in a temporary session variable
        // The frontend will need to select which domain to use
        const sessionData = {
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token,
            expiresIn: tokens.expires_in || 3600,
            expiresAt: Date.now() + ((tokens.expires_in || 3600) * 1000),
            domains: domains.map((d: any) => ({
                url: d.siteUrl,
                name: d.siteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
            })),
        };

        // Set a temporary cookie to pass data to the frontend
        response.cookies.set("_oauth_session", JSON.stringify(sessionData), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 300, // 5 minutes
        });

        return response;

    } catch (error) {
        console.error("[OAuth Callback] Error:", error);
        return NextResponse.redirect(
            new URL(
                `/app/dashboard/ai-blogger?error=oauth_error`,
                req.nextUrl.origin
            )
        );
    }
}
