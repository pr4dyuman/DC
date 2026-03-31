import { NextResponse } from "next/server";

import { runBlogStudioPerformanceSyncImpl } from "@/lib/actions/ai-blogger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getPerformanceSyncSecret() {
    return (
        process.env.AI_BLOGGER_PERFORMANCE_SECRET ||
        process.env.AI_BLOGGER_SCHEDULE_SECRET ||
        process.env.CRON_SECRET ||
        ""
    );
}

function isAuthorized(request: Request) {
    const secret = getPerformanceSyncSecret();

    if (!secret) {
        return {
            ok: false,
            status: 503,
            message: "AI Blogger performance sync secret is not configured.",
        };
    }

    const authorizationHeader = request.headers.get("authorization") || "";
    const bearerToken = authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice("Bearer ".length).trim()
        : "";
    const headerToken = (
        request.headers.get("x-ai-blogger-performance-secret") ||
        request.headers.get("x-ai-blogger-schedule-secret") ||
        ""
    ).trim();

    if (bearerToken === secret || headerToken === secret) {
        return { ok: true, status: 200, message: "" };
    }

    return {
        ok: false,
        status: 401,
        message: "Unauthorized",
    };
}

async function handlePerformanceSync(request: Request) {
    try {
        const auth = isAuthorized(request);
        if (!auth.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: auth.message,
                },
                { status: auth.status },
            );
        }

        const url = new URL(request.url);
        const limitParam = Number.parseInt(url.searchParams.get("limit") || "10", 10);
        const force = url.searchParams.get("force") === "true";
        const agencyId = url.searchParams.get("agencyId") || "";

        // Validate and bound the limit parameter
        if (!Number.isFinite(limitParam) || limitParam < 1) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Limit parameter must be a positive number.",
                },
                { status: 400 },
            );
        }
        const limit = Math.min(limitParam, 100); // Cap at 100 to prevent DOS

        // Validate agencyId if provided
        if (agencyId && agencyId.trim().length === 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "AgencyId must be non-empty if provided.",
                },
                { status: 400 },
            );
        }

        const result = await runBlogStudioPerformanceSyncImpl({
            agencyId: agencyId || undefined,
            force,
            limit,
        });

        return NextResponse.json({
            ok: true,
            ...result,
        });
    } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "Unexpected error during sync";
        console.error("[AI-BLOGGER] [SYNC-PERFORMANCE] Error:", message);
        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            { status: 500 },
        );
    }
}

export async function GET(request: Request) {
    return handlePerformanceSync(request);
}

export async function POST(request: Request) {
    return handlePerformanceSync(request);
}
