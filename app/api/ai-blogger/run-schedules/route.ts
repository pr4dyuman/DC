import { NextResponse } from "next/server";

import { runDueBlogStudioSchedulesImpl } from "@/lib/actions/ai-blogger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getScheduleRunnerSecret() {
    return process.env.AI_BLOGGER_SCHEDULE_SECRET || process.env.CRON_SECRET || "";
}

function isAuthorized(request: Request) {
    const secret = getScheduleRunnerSecret();

    if (!secret) {
        return {
            ok: false,
            status: 503,
            message: "AI Blogger schedule runner secret is not configured.",
        };
    }

    const authorizationHeader = request.headers.get("authorization") || "";
    const bearerToken = authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice("Bearer ".length).trim()
        : "";
    const headerToken = (request.headers.get("x-ai-blogger-schedule-secret") || "").trim();

    if (bearerToken === secret || headerToken === secret) {
        return { ok: true, status: 200, message: "" };
    }

    return {
        ok: false,
        status: 401,
        message: "Unauthorized",
    };
}

async function handleScheduleRun(request: Request) {
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

        // Validate and bound the limit parameter (must be 1-100)
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

        const result = await runDueBlogStudioSchedulesImpl(limit);

        return NextResponse.json({
            ok: true,
            ...result,
        });
    } catch (scheduleError) {
        const message = scheduleError instanceof Error ? scheduleError.message : "Unexpected error running schedules";
        console.error("[AI-BLOGGER] [RUN-SCHEDULES] Error:", message);
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
    return handleScheduleRun(request);
}

export async function POST(request: Request) {
    return handleScheduleRun(request);
}
