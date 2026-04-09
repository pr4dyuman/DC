import { NextResponse } from "next/server";
import crypto from "crypto";

import { requireRole, toActionActor } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";
import { generateBlogStudioDraftImpl } from "@/lib/actions/ai-blogger";
import { createPipelineJob, emitPipelineEvent, releaseLocalPipelineJob } from "@/lib/ai-blogger-pipeline-events";
import type { BlogStudioBrief, BlogStudioTarget } from "@/lib/types-ai-blogger";

/**
 * Resolve the base URL for internal API calls.
 * In development, always use localhost so the worker runs in the same dev server.
 * In production: NEXT_PUBLIC_APP_URL (explicit) → VERCEL_URL (auto) → localhost fallback.
 */
function getAppBaseUrl(): string {
    if (process.env.NODE_ENV === "development") {
        const port = process.env.PORT || "3000";
        return `http://localhost:${port}`;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return "http://localhost:3000";
}

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
export const maxDuration = 30; // Just validates + triggers the worker — completes fast.

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

        const actor = toActionActor(currentUser);
        const pipelineInput = { title: title || "", brief, target, wordCount };

        // Prefer the dedicated worker endpoint when the secret is configured.
        // Falls back to the original in-process execution if not.
        const workerSecret = process.env.AI_BLOGGER_WORKER_SECRET;
        if (workerSecret) {
            const baseUrl = getAppBaseUrl();
            const workerUrl = `${baseUrl}/api/ai-blogger/generate/worker`;
            console.log(`[GENERATE-ROUTE] Dispatching to worker: ${workerUrl}`);

            // Fire the worker — we don't await the full response because the
            // worker takes minutes. We just need to confirm the HTTP request
            // was accepted. The worker runs in its own 300s serverless context.
            fetch(workerUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-worker-secret": workerSecret,
                },
                body: JSON.stringify({
                    jobId,
                    agency: { id: agency.id, name: agency.name },
                    actor,
                    input: pipelineInput,
                }),
            }).catch((fetchError) => {
                // If the fetch itself fails (DNS, network), log and emit error.
                const msg = fetchError instanceof Error ? fetchError.message : "Worker dispatch failed";
                console.error(`[GENERATE-ROUTE] Worker dispatch error: ${msg}`);
                emitPipelineEvent(jobId, { type: "error", message: `Worker dispatch failed: ${msg}` });
            });

            // In production (Vercel), remove the in-memory job so the SSE stream
            // falls back to MongoDB polling — the worker runs on a separate serverless
            // instance and won't share the EventEmitter.
            // In development (localhost), keep the in-memory job because the worker
            // runs in the same Node.js process and events flow via the shared emitter.
            if (process.env.NODE_ENV !== "development") {
                releaseLocalPipelineJob(jobId);
            }
        } else {
            // Fallback: run in-process (original behaviour).
            // This is a dangling promise — less reliable on Vercel.
            console.warn(`[GENERATE-ROUTE] AI_BLOGGER_WORKER_SECRET not set — running pipeline in-process (legacy mode)`);
            generateBlogStudioDraftImpl(
                { id: agency.id, name: agency.name },
                actor,
                pipelineInput,
                jobId,
            ).catch(async (error) => {
                const message = error instanceof Error ? error.message : "Unknown pipeline error";
                console.error("[AI-BLOGGER] [SSE-PIPELINE] Fatal error:", message);
                await emitPipelineEvent(jobId, { type: "error", message });
            });
        }

        return NextResponse.json({ ok: true, jobId });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
