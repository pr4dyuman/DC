import { NextResponse } from "next/server";
import crypto from "crypto";

import { requireRole, toActionActor } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";
import { generateBlogStudioDraftImpl } from "@/lib/actions/ai-blogger";
import { createPipelineJob, emitPipelineEvent } from "@/lib/ai-blogger-pipeline-events";
import type { BlogStudioBrief, BlogStudioTarget } from "@/lib/types-ai-blogger";

type GenerateDraftRequestBody = {
    title?: string;
    brief?: BlogStudioBrief;
    target?: BlogStudioTarget;
    wordCount?: number;
};

function isGenerateDraftRequestBody(value: unknown): value is GenerateDraftRequestBody {
    if (!value || typeof value !== "object") {
        return false;
    }

    const body = value as Record<string, unknown>;

    if ("title" in body && body.title !== undefined && typeof body.title !== "string") {
        return false;
    }

    if ("wordCount" in body && body.wordCount !== undefined && typeof body.wordCount !== "number") {
        return false;
    }

    return true;
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
    try {
        const currentUser = await requireRole("admin");
        const agency = await getCurrentAgency();
        if (!agency) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const access = getAIBloggerAccessState({
            role: currentUser.role,
            plan: agency.plan,
            status: agency.status,
            featureEnabled: agency.features?.aiBlogger,
        });
        if (!access.canAccess) {
            return NextResponse.json(
                { ok: false, error: "AI Blogger is not available for this account." },
                { status: 403 },
            );
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { ok: false, error: "Invalid request body: must be valid JSON" },
                { status: 400 },
            );
        }

        if (!isGenerateDraftRequestBody(body)) {
            return NextResponse.json(
                { ok: false, error: "Invalid request body shape." },
                { status: 400 },
            );
        }

        const { title, brief, target, wordCount } = body;

        // Validate required fields
        if (!brief || typeof brief !== "object") {
            return NextResponse.json(
                { ok: false, error: "Brief is required and must be an object." },
                { status: 400 },
            );
        }

        if (!brief.sourceValue || typeof brief.sourceValue !== "string" || !brief.sourceValue.trim()) {
            return NextResponse.json(
                { ok: false, error: "Source detail is required." },
                { status: 400 },
            );
        }

        if (!target || typeof target !== "object") {
            return NextResponse.json(
                { ok: false, error: "Target is required and must be an object." },
                { status: 400 },
            );
        }

        if (!target.type || typeof target.type !== "string") {
            return NextResponse.json(
                { ok: false, error: "Target type is required and must be a string." },
                { status: 400 },
            );
        }

        // Validate wordCount if provided
        if (wordCount !== undefined && wordCount !== null) {
            if (typeof wordCount !== "number" || wordCount < 500 || wordCount > 8000) {
                return NextResponse.json(
                    { ok: false, error: "Word count must be between 500 and 8000." },
                    { status: 400 },
                );
            }
        }

        // Validate title if provided (optional)
        if (title !== undefined && title !== null && typeof title !== "string") {
            return NextResponse.json(
                { ok: false, error: "Title must be a string if provided." },
                { status: 400 },
            );
        }

        const jobId = crypto.randomUUID();
        console.log(`[GENERATE-ROUTE] Creating pipeline job: ${jobId}`);
        await createPipelineJob(jobId, {
            agencyId: agency.id,
            createdBy: currentUser.id,
        });
        console.log(`[GENERATE-ROUTE] Pipeline job created: ${jobId}`);

        // Fire-and-forget: the pipeline runs in the background.
        // Results are streamed via SSE on /api/ai-blogger/generate/stream.
        generateBlogStudioDraftImpl(
            { id: agency.id, name: agency.name },
            toActionActor(currentUser),
            { title: title || "", brief, target, wordCount },
            jobId,
        ).catch(async (error) => {
            const message = error instanceof Error ? error.message : "Unknown pipeline error";
            console.error("[AI-BLOGGER] [SSE-PIPELINE] Fatal error:", message);
            await emitPipelineEvent(jobId, { type: "error", message });
        });

        return NextResponse.json({ ok: true, jobId });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
