/**
 * OAuth token management and Search Console API integration
 * Handles token refresh, encryption, and Search Console API calls
 */

import { decryptApiKey, encryptApiKey } from "./mongodb";
import { BlogStudioSettingsModel, connectDB } from "./mongodb";

interface OAuthConfig {
    refreshToken: string;
    accessToken: string;
    expiresAt: number;
    selectedDomain: string;
}

function normalizeSearchConsolePropertyUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    if (trimmed.startsWith("sc-domain:") || /^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `sc-domain:${trimmed}`;
}

/**
 * Refresh OAuth access token using refresh token
 * Updates database with new access token and expiry
 */
export async function refreshGoogleOAuthToken(
    agencyId: string,
    encryptedRefreshToken: string
): Promise<{ accessToken: string; expiresAt: number } | null> {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error("[OAuth Refresh] Missing Google OAuth credentials in environment");
            return null;
        }

        // Decrypt refresh token
        const refreshToken = decryptApiKey(encryptedRefreshToken);

        // Request new access token from Google
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }).toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("[OAuth Refresh] Token refresh failed:", error);

            // Mark token as expired in database
            await connectDB();
            await BlogStudioSettingsModel.findOneAndUpdate(
                { agencyId },
                {
                    $set: {
                        "searchConsoleOAuth.authStatus": "token-expired",
                        updatedAt: new Date().toISOString(),
                    },
                }
            );

            return null;
        }

        const data = await response.json();
        if (!data.access_token) {
            console.error("[OAuth Refresh] No access token in response");
            return null;
        }

        const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

        // Update database with new access token
        await connectDB();
        await BlogStudioSettingsModel.findOneAndUpdate(
            { agencyId },
            {
                $set: {
                    "searchConsoleOAuth.accessToken": encryptApiKey(data.access_token),
                    "searchConsoleOAuth.accessTokenExpiresAt": expiresAt,
                    "searchConsoleOAuth.lastTokenRefreshAt": Date.now(),
                    "searchConsoleOAuth.authStatus": "configured",
                    updatedAt: new Date().toISOString(),
                },
            }
        );

        return {
            accessToken: data.access_token,
            expiresAt,
        };
    } catch (error) {
        console.error("[OAuth Refresh] Error:", error);
        return null;
    }
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidSearchConsoleAccessToken(
    agencyId: string,
    encryptedOAuthConfig: {
        refreshToken: string;
        accessToken: string;
        expiresAt: number;
        selectedDomain: string;
    }
): Promise<string | null> {
    try {
        // Decrypt tokens
        const refreshToken = decryptApiKey(encryptedOAuthConfig.refreshToken);
        const accessToken = decryptApiKey(encryptedOAuthConfig.accessToken);

        // Check if token needs refresh
        if (Date.now() > encryptedOAuthConfig.expiresAt - 300000) {
            // Refresh if within 5 minutes of expiry
            const refreshed = await refreshGoogleOAuthToken(
                agencyId,
                encryptedOAuthConfig.refreshToken
            );

            if (!refreshed) {
                return null;
            }

            return refreshed.accessToken;
        }

        // Token is still valid
        return accessToken;
    } catch (error) {
        console.error("[OAuth Token] Error getting valid token:", error);
        return null;
    }
}

/**
 * Fetch Search Console data for a domain using OAuth token
 */
export async function fetchSearchConsoleData(
    domain: string,
    accessToken: string,
    startDate: string,
    endDate: string
): Promise<{
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topCountries: Array<{ country: string; clicks: number; impressions: number; ctr: number }>;
    topDevices: Array<{ device: string; clicks: number; impressions: number; ctr: number }>;
} | null> {
    try {
        const propertyUrl = normalizeSearchConsolePropertyUrl(domain);
        if (!propertyUrl) {
            console.error("[Search Console] Missing Search Console property URL");
            return null;
        }

        const baseUrl = "https://www.googleapis.com/webmasters/v3";
        const encodedUrl = encodeURIComponent(propertyUrl);

        // Fetch top queries
        const queriesRes = await fetch(
            `${baseUrl}/sites/${encodedUrl}/searchanalytics/query`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    dimensions: ["query"],
                    rowLimit: 5,
                    orderBy: [{ columnName: "clicks", sortOrder: "DESCENDING" }],
                }),
            }
        );

        if (!queriesRes.ok) {
            console.error("[Search Console] Failed to fetch queries:", await queriesRes.text());
            return null;
        }

        const queriesData = await queriesRes.json();

        // Fetch by country
        const countriesRes = await fetch(
            `${baseUrl}/sites/${encodedUrl}/searchanalytics/query`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    dimensions: ["country"],
                    rowLimit: 3,
                    orderBy: [{ columnName: "impressions", sortOrder: "DESCENDING" }],
                }),
            }
        );

        const countriesData = countriesRes.ok ? await countriesRes.json() : { rows: [] };

        // Fetch by device
        const devicesRes = await fetch(
            `${baseUrl}/sites/${encodedUrl}/searchanalytics/query`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    dimensions: ["device"],
                    rowLimit: 10,
                    orderBy: [{ columnName: "impressions", sortOrder: "DESCENDING" }],
                }),
            }
        );

        const devicesData = devicesRes.ok ? await devicesRes.json() : { rows: [] };

        return {
            topQueries: (queriesData.rows || []).map((row: any) => ({
                query: row.keys[0],
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position,
            })),
            topCountries: (countriesData.rows || []).map((row: any) => ({
                country: row.keys[0],
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
            })),
            topDevices: (devicesData.rows || []).map((row: any) => ({
                device: row.keys[0],
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
            })),
        };
    } catch (error) {
        console.error("[Search Console] Error fetching data:", error);
        return null;
    }
}
