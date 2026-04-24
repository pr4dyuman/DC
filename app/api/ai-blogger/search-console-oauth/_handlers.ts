import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { BlogStudioSettingsModel, connectDB, decryptApiKey, encryptApiKey } from "@/lib/mongodb";

const OAUTH_STATE_COOKIE = "_ai_blogger_search_console_oauth_state";
const OAUTH_SESSION_COOKIE = "_ai_blogger_search_console_oauth_session";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const OAUTH_SESSION_MAX_AGE_SECONDS = 5 * 60;
const OAUTH_RETURN_PATH = "/dashboard/ai-blogger/settings";
const OAUTH_CALLBACK_PATH = "/api/ai-blogger/search-console-oauth/callback";

type OAuthStateCookie = {
    state: string;
    agencyId: string;
    userId: string;
    redirectUri: string;
    createdAt: number;
};

type OAuthDomain = {
    url: string;
    name: string;
};

type OAuthSessionCookie = {
    agencyId: string;
    userId: string;
    refreshToken: string;
    accessToken: string;
    expiresAt: number;
    createdAt: number;
};

function cookieOptions(maxAge: number, httpOnly = true) {
    return {
        httpOnly,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge,
        path: "/",
    };
}

function encodeCookieValue(value: unknown) {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCookieValue<T>(value: string | undefined): T | null {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
    } catch {
        return null;
    }
}

function buildRedirect(request: NextRequest, searchParams: Record<string, string>) {
    const url = new URL(OAUTH_RETURN_PATH, request.nextUrl.origin);
    for (const [key, value] of Object.entries(searchParams)) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url);
}

function isLocalhostOrigin(origin: string) {
    try {
        const hostname = new URL(origin).hostname;
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    } catch {
        return false;
    }
}

function getRequestOrigin(request: NextRequest) {
    const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
    if (forwardedHost && forwardedProto) {
        return `${forwardedProto}://${forwardedHost}`;
    }

    return request.nextUrl.origin;
}

function getGoogleOAuthRedirectUri(request: NextRequest) {
    const requestOrigin = getRequestOrigin(request).replace(/\/+$/, "");
    const dynamicRedirectUri = `${requestOrigin}${OAUTH_CALLBACK_PATH}`;
    const configuredRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "";

    if (!configuredRedirectUri) {
        return dynamicRedirectUri;
    }

    // In local development, prefer the actual dev server origin so OAuth can
    // work against localhost without editing shared production env files.
    if (process.env.NODE_ENV !== "production" && isLocalhostOrigin(requestOrigin)) {
        return dynamicRedirectUri;
    }

    return configuredRedirectUri;
}

function clearCookie(response: NextResponse, name: string) {
    response.cookies.set(name, "", {
        ...cookieOptions(0),
        maxAge: 0,
    });
}

function normalizeDomains(value: unknown): OAuthDomain[] {
    const rows = Array.isArray(value) ? value : [];
    return rows
        .map((row) => {
            const siteUrl = typeof row?.siteUrl === "string" ? row.siteUrl.trim() : "";
            if (!siteUrl) {
                return null;
            }

            return {
                url: siteUrl,
                name: siteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
            };
        })
        .filter((row): row is OAuthDomain => Boolean(row));
}

async function fetchSearchConsoleDomains(accessToken: string) {
    const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Failed to fetch Search Console properties: ${details || response.statusText}`);
    }

    const data = await response.json();
    return normalizeDomains(data?.siteEntry);
}

async function requireOAuthUser() {
    const session = await getSessionUser();
    const userId = session?.userId;
    const agencyId = session?.agencyId;

    if (!userId || !agencyId) {
        return null;
    }

    return { userId, agencyId };
}

export async function handleConnect(request: NextRequest) {
    try {
        const session = await requireOAuthUser();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized - user not authenticated" },
                { status: 401 },
            );
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = getGoogleOAuthRedirectUri(request);

        if (!clientId) {
            return NextResponse.json(
                { error: "OAuth credentials not configured on server" },
                { status: 500 },
            );
        }

        const state = crypto.randomUUID().replace(/-/g, "");
        const stateCookie: OAuthStateCookie = {
            state,
            createdAt: Date.now(),
            agencyId: session.agencyId,
            userId: session.userId,
            redirectUri,
        };

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "https://www.googleapis.com/auth/webmasters.readonly",
            state,
            access_type: "offline",
            prompt: "consent",
        });

        const response = NextResponse.json({
            error: null,
            redirectUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        });
        response.cookies.set(
            OAUTH_STATE_COOKIE,
            encodeCookieValue(stateCookie),
            cookieOptions(OAUTH_COOKIE_MAX_AGE_SECONDS),
        );

        return response;
    } catch (error) {
        console.error("[OAuth Connect] Error:", error);
        return NextResponse.json(
            { error: "Failed to initiate OAuth connection" },
            { status: 500 },
        );
    }
}

export async function handleCallback(request: NextRequest) {
    try {
        const session = await requireOAuthUser();
        if (!session) {
            return NextResponse.redirect(new URL("/login?error=Unauthorized", request.nextUrl.origin));
        }

        const code = request.nextUrl.searchParams.get("code");
        const state = request.nextUrl.searchParams.get("state");
        const error = request.nextUrl.searchParams.get("error");

        if (error === "access_denied") {
            return buildRedirect(request, { error: "oauth_denied" });
        }

        if (!code || !state) {
            return buildRedirect(request, { error: "missing_params" });
        }

        const stateCookie = decodeCookieValue<OAuthStateCookie>(
            request.cookies.get(OAUTH_STATE_COOKIE)?.value,
        );
        const stateExpired = !stateCookie?.createdAt || Date.now() - stateCookie.createdAt > OAUTH_COOKIE_MAX_AGE_SECONDS * 1000;
        const stateMatches =
            stateCookie &&
            !stateExpired &&
            stateCookie.state === state &&
            stateCookie.agencyId === session.agencyId &&
            stateCookie.userId === session.userId;

        if (!stateMatches) {
            const response = buildRedirect(request, { error: "invalid_state" });
            clearCookie(response, OAUTH_STATE_COOKIE);
            return response;
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = stateCookie.redirectUri || getGoogleOAuthRedirectUri(request);

        if (!clientId || !clientSecret || !redirectUri) {
            console.error("[OAuth Callback] Missing OAuth credentials");
            return buildRedirect(request, { error: "server_config" });
        }

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
            cache: "no-store",
        });

        if (!tokenResponse.ok) {
            console.error("[OAuth Callback] Token exchange failed:", await tokenResponse.text());
            return buildRedirect(request, { error: "token_exchange_failed" });
        }

        const tokens = await tokenResponse.json();
        if (!tokens?.refresh_token || !tokens?.access_token) {
            console.error("[OAuth Callback] No tokens received:", tokens);
            return buildRedirect(request, { error: "no_tokens" });
        }

        const domains = await fetchSearchConsoleDomains(tokens.access_token).catch((domainError) => {
            console.error("[OAuth Callback] Failed to fetch Search Console domains:", domainError);
            return null;
        });

        if (!domains) {
            return buildRedirect(request, { error: "failed_fetch_domains" });
        }

        if (domains.length === 0) {
            console.warn("[OAuth Callback] No Search Console properties found for user");
            return buildRedirect(request, { error: "no_properties" });
        }

        const sessionCookie: OAuthSessionCookie = {
            agencyId: session.agencyId,
            userId: session.userId,
            refreshToken: encryptApiKey(tokens.refresh_token),
            accessToken: encryptApiKey(tokens.access_token),
            expiresAt: Date.now() + ((tokens.expires_in || 3600) * 1000),
            createdAt: Date.now(),
        };

        const response = buildRedirect(request, { oauth_complete: "true" });
        clearCookie(response, OAUTH_STATE_COOKIE);
        response.cookies.set(
            OAUTH_SESSION_COOKIE,
            encodeCookieValue(sessionCookie),
            cookieOptions(OAUTH_SESSION_MAX_AGE_SECONDS),
        );
        return response;
    } catch (error) {
        console.error("[OAuth Callback] Error:", error);
        return buildRedirect(request, { error: "oauth_error" });
    }
}

export async function handleSession(request: NextRequest) {
    try {
        const session = await requireOAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionCookie = decodeCookieValue<OAuthSessionCookie>(
            request.cookies.get(OAUTH_SESSION_COOKIE)?.value,
        );
        const sessionExpired =
            !sessionCookie?.createdAt ||
            Date.now() - sessionCookie.createdAt > OAUTH_SESSION_MAX_AGE_SECONDS * 1000;
        const sessionMatches =
            sessionCookie &&
            !sessionExpired &&
            sessionCookie.agencyId === session.agencyId &&
            sessionCookie.userId === session.userId;

        if (!sessionMatches) {
            const response = NextResponse.json({ error: "OAuth session expired." }, { status: 404 });
            clearCookie(response, OAUTH_SESSION_COOKIE);
            return response;
        }

        const accessToken = decryptApiKey(sessionCookie.accessToken);
        const domains = await fetchSearchConsoleDomains(accessToken);

        return NextResponse.json({ domains });
    } catch (error) {
        console.error("[OAuth Session] Error:", error);
        return NextResponse.json({ error: "Failed to load OAuth session" }, { status: 500 });
    }
}

export async function handleSave(request: NextRequest) {
    try {
        const session = await requireOAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const selectedDomain = typeof body?.selectedDomain === "string" ? body.selectedDomain.trim() : "";
        if (!selectedDomain) {
            return NextResponse.json({ error: "Missing selectedDomain" }, { status: 400 });
        }

        const sessionCookie = decodeCookieValue<OAuthSessionCookie>(
            request.cookies.get(OAUTH_SESSION_COOKIE)?.value,
        );
        const sessionExpired =
            !sessionCookie?.createdAt ||
            Date.now() - sessionCookie.createdAt > OAUTH_SESSION_MAX_AGE_SECONDS * 1000;
        const sessionMatches =
            sessionCookie &&
            !sessionExpired &&
            sessionCookie.agencyId === session.agencyId &&
            sessionCookie.userId === session.userId;

        if (!sessionMatches) {
            const response = NextResponse.json(
                { error: "OAuth session expired. Please connect again." },
                { status: 400 },
            );
            clearCookie(response, OAUTH_SESSION_COOKIE);
            return response;
        }

        const accessToken = decryptApiKey(sessionCookie.accessToken);
        const domains = await fetchSearchConsoleDomains(accessToken);
        const allowedDomain = domains.some((domain) => domain.url === selectedDomain);
        if (!allowedDomain) {
            return NextResponse.json(
                { error: "Selected domain was not returned by Google Search Console." },
                { status: 400 },
            );
        }

        await connectDB();
        await BlogStudioSettingsModel.findOneAndUpdate(
            { agencyId: session.agencyId },
            {
                $set: {
                    searchConsoleOAuth: {
                        enabled: true,
                        selectedDomain,
                        refreshToken: sessionCookie.refreshToken,
                        accessToken: sessionCookie.accessToken,
                        accessTokenExpiresAt: sessionCookie.expiresAt,
                        authStatus: "configured",
                        authorizedAt: new Date().toISOString(),
                        oauthProvider: "google",
                    },
                    updatedBy: session.userId,
                    updatedAt: new Date().toISOString(),
                },
            },
            { returnDocument: "after", upsert: true },
        );

        const response = NextResponse.json({
            success: true,
            message: "Search Console connected successfully",
            domain: selectedDomain,
        });
        clearCookie(response, OAUTH_SESSION_COOKIE);
        return response;
    } catch (error) {
        console.error("[OAuth Save] Error:", error);
        return NextResponse.json(
            { error: "Failed to save OAuth configuration" },
            { status: 500 },
        );
    }
}

export async function handleDisconnect() {
    try {
        const session = await requireOAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        await BlogStudioSettingsModel.findOneAndUpdate(
            { agencyId: session.agencyId },
            {
                $set: {
                    searchConsoleOAuth: {
                        enabled: false,
                        authStatus: "not-connected",
                        oauthProvider: "google",
                    },
                    updatedBy: session.userId,
                    updatedAt: new Date().toISOString(),
                },
            },
            { returnDocument: "after" },
        );

        const response = NextResponse.json({
            success: true,
            message: "Search Console disconnected",
        });
        clearCookie(response, OAUTH_SESSION_COOKIE);
        return response;
    } catch (error) {
        console.error("[OAuth Disconnect] Error:", error);
        return NextResponse.json(
            { error: "Failed to disconnect Search Console" },
            { status: 500 },
        );
    }
}
