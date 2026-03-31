import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, getSessionAgencyId } from "@/lib/auth";
import { BlogStudioSettingsModel, connectDB } from "@/lib/mongodb";

/**
 * Disconnect Google Search Console
 * Removes tokens from database
 * POST /api/ai-blogger/search-console-oauth/disconnect
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

        // Connect to database
        await connectDB();

        // Clear OAuth tokens
        await BlogStudioSettingsModel.findOneAndUpdate(
            { agencyId },
            {
                $set: {
                    searchConsoleOAuth: {
                        enabled: false,
                        authStatus: "not-connected",
                        oauthProvider: "google",
                    },
                    updatedBy: userId,
                    updatedAt: new Date().toISOString(),
                },
            }
        );

        return NextResponse.json({
            success: true,
            message: "Search Console disconnected",
        });

    } catch (error) {
        console.error("[OAuth Disconnect] Error:", error);
        return NextResponse.json(
            { error: "Failed to disconnect Search Console" },
            { status: 500 }
        );
    }
}
