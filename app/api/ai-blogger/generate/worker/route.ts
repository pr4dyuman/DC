import { NextResponse } from "next/server";

import { generateBlogStudioDraftImpl } from "@/lib/actions/ai-blogger";
import { emitPipelineEvent, getPipelineJobSnapshot } from "@/lib/ai-blogger-pipeline-events";
import type { BlogStudioBrief, BlogStudioTarget } from "@/lib/types-ai-blogger";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Full 300s budget — this is where the pipeline actually runs.

/**
 * POST /api/ai-blogger/generate/worker
 *
 * Internal-only endpoint that runs the generateBlogStudioDraftImpl pipeline
 * inside a dedicated serverless invocation with its own 300s execution budget.
 *
 * This is called internally by the /api/ai-blogger/generate route via fetch().
 * It is NOT meant to be called by the browser. Protected by a shared secret.
 */

type WorkerRequestBody = {
    jobId: string;
    agency: { id: string; name?: string };
    actor: { id: string; name: string; role: string; timezone?: string };
    input: {
        title: string;
        brief?: Partial<BlogStudioBrief>;
        target?: Partial<BlogStudioTarget>;
        wordCount?: number;
    };
};

function isWorkerRequestBody(value: unknown): value is WorkerRequestBody {
    if (!value || typeof value !== "object") return false;
    const body = value as Record<string, unknown>;
    if (typeof body.jobId !== "string" || !body.jobId) return false;
    if (!body.agency || typeof body.agency !== "object") return false;
    if (!body.actor || typeof body.actor !== "object") return false;
    if (!body.input || typeof body.input !== "object") return false;
    return true;
}

export async function POST(request: Request) {
    // ── Auth: shared secret ────────────────────────────────────────────
    const workerSecret = process.env.AI_BLOGGER_WORKER_SECRET;
    if (!workerSecret) {
        console.error("[WORKER] AI_BLOGGER_WORKER_SECRET is not configured.");
        return NextResponse.json(
            { ok: false, error: "Worker not configured." },
            { status: 500 },
        );
    }

    const providedSecret = request.headers.get("x-worker-secret");
    if (providedSecret !== workerSecret) {
        return NextResponse.json(
            { ok: false, error: "Unauthorized." },
            { status: 401 },
        );
    }

    // ── Parse request body ─────────────────────────────────────────────
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { ok: false, error: "Invalid request body." },
            { status: 400 },
        );
    }

    if (!isWorkerRequestBody(body)) {
        return NextResponse.json(
            { ok: false, error: "Invalid worker payload shape." },
            { status: 400 },
        );
    }

    const { jobId, agency, actor, input } = body;

    // ── Guard: make sure the job still exists and is running ───────────
    try {
        const snapshot = await getPipelineJobSnapshot(jobId);
        if (!snapshot.exists) {
            console.warn(`[WORKER] Job ${jobId} not found. Possibly expired.`);
            return NextResponse.json(
                { ok: false, error: "Job not found." },
                { status: 404 },
            );
        }
        if (snapshot.status !== "running") {
            console.warn(`[WORKER] Job ${jobId} is already ${snapshot.status}. Skipping.`);
            return NextResponse.json({ ok: true, skipped: true });
        }
    } catch (snapshotError) {
        // Non-fatal: proceed anyway — the pipeline will handle missing jobs.
        console.warn(`[WORKER] Could not verify job ${jobId}:`, snapshotError);
    }

    // ── Run the pipeline ───────────────────────────────────────────────
    console.log(`[WORKER] Starting pipeline for job ${jobId}`);
    try {
        // Race the pipeline against a 260-second soft timeout.
        // Vercel hard-kills this serverless function at 300s with no cleanup,
        // leaving the MongoDB job permanently stuck at status="running".
        // Firing 40s early lets us write a proper error event to MongoDB
        // so the client sees "timed out" instead of spinning forever.
        const WORKER_SOFT_TIMEOUT_MS = 260_000;
        await Promise.race([
            generateBlogStudioDraftImpl(agency, actor, input, jobId),
            new Promise<never>((_, reject) =>
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                "The AI generation pipeline exceeded the 260-second server time limit. " +
                                "Website data is now cached so the next run will be significantly faster. " +
                                "Try again — it should complete in time.",
                            ),
                        ),
                    WORKER_SOFT_TIMEOUT_MS,
                ),
            ),
        ]);
        console.log(`[WORKER] Pipeline completed for job ${jobId}`);
        return NextResponse.json({ ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown pipeline error";
        console.error(`[WORKER] Pipeline fatal error for job ${jobId}:`, message);

        // Emit the error event so the SSE stream / status polling can deliver it to the client.
        try {
            await emitPipelineEvent(jobId, { type: "error", message });
        } catch (emitError) {
            console.error(`[WORKER] Failed to emit error event for job ${jobId}:`, emitError);
        }

        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
