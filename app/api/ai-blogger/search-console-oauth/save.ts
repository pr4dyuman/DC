import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, getSessionAgencyId } from "@/lib/auth";
import { BlogStudioSettingsModel, connectDB, encryptApiKey } from "@/lib/mongodb";

/**
 * Save OAuth tokens and selected domain to database
 * Called after Google OAuth callback when user selects domain
 * POST /api/ai-blogger/search-console-oauth/save
 */
export async function POST(req: NextRequest) {
    try {
        // Verify user is authenticated
        const userId = await getSessionUserId();
        const agencyId = await getSessionAgencyId();

        if (!userId || !agencyId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await req.json();
        const { refreshToken, accessToken, expiresAt, selectedDomain } = body;

        if (!refreshToken || !accessToken || !expiresAt || !selectedDomain) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();

        // Encrypt sensitive tokens
        const encryptedRefreshToken = encryptApiKey(refreshToken);
        const encryptedAccessToken = encryptApiKey(accessToken);

        // Update or create BlogStudioSettings with OAuth config
        const updated = await BlogStudioSettingsModel.findOneAndUpdate(
            { agencyId },
            {
                $set: {
                    searchConsoleOAuth: {
                        enabled: true,
                        selectedDomain,
                        refreshToken: encryptedRefreshToken,
                        accessToken: encryptedAccessToken,
                        accessTokenExpiresAt: expiresAt,
                        authStatus: "connected",
                        authorizedAt: new Date().toISOString(),
                        oauthProvider: "google",
                    },
                    updatedBy: userId,
                    updatedAt: new Date().toISOString(),
                },
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({
            success: true,
            message: "Search Console connected successfully",
            domain: selectedDomain,
        });

    } catch (error) {
        console.error("[OAuth Save] Error:", error);
        return NextResponse.json(
            { error: "Failed to save OAuth configuration" },
            { status: 500 }
        );
    }
}
