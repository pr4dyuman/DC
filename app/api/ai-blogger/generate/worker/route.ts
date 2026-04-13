import { NextResponse } from "next/server";

import {
    runBlogStudioDraftResearchPhase,
    runBlogStudioDraftPlanningPhase,
    runBlogStudioDraftWritingPhase,
} from "@/lib/actions/ai-blogger";
import {
    awaitPipelineJobPersistence,
    emitPipelineEvent,
    getPipelineJobSnapshot,
    updatePipelineJobExecution,
} from "@/lib/ai-blogger-pipeline-events";
import type { BlogStudioBrief, BlogStudioTarget } from "@/lib/types-ai-blogger";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Full 300s budget — each worker phase stays within this limit.

type WorkerExecutionRequest = {
    agency: { id: string; name?: string };
    actor: { id: string; name: string; role: string; timezone?: string };
    input: {
        title: string;
        brief?: Partial<BlogStudioBrief>;
        target?: Partial<BlogStudioTarget>;
        wordCount?: number;
    };
};

type WorkerRequestBody = {
    jobId: string;
    agency?: WorkerExecutionRequest["agency"];
    actor?: WorkerExecutionRequest["actor"];
    input?: WorkerExecutionRequest["input"];
};

function isWorkerRequestBody(value: unknown): value is WorkerRequestBody {
    if (!value || typeof value !== "object") return false;
    const body = value as Record<string, unknown>;
    return typeof body.jobId === "string" && Boolean(body.jobId);
}

function isWorkerExecutionRequest(value: unknown): value is WorkerExecutionRequest {
    if (!value || typeof value !== "object") return false;
    const body = value as Record<string, unknown>;
    if (!body.agency || typeof body.agency !== "object") return false;
    if (!body.actor || typeof body.actor !== "object") return false;
    if (!body.input || typeof body.input !== "object") return false;
    return true;
}

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

export async function POST(request: Request) {
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

    const { jobId } = body;
    let snapshot: Awaited<ReturnType<typeof getPipelineJobSnapshot>> | null = null;

    try {
        snapshot = await getPipelineJobSnapshot(jobId);
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
        console.warn(`[WORKER] Could not verify job ${jobId}:`, snapshotError);
    }

    const storedRequest = snapshot?.execution?.request;
    const inlineRequest = body.agency && body.actor && body.input
        ? { agency: body.agency, actor: body.actor, input: body.input }
        : undefined;
    const executionRequest = isWorkerExecutionRequest(storedRequest)
        ? storedRequest
        : isWorkerExecutionRequest(inlineRequest)
            ? inlineRequest
            : null;

    if (!executionRequest) {
        return NextResponse.json(
            { ok: false, error: "Worker request context is missing." },
            { status: 400 },
        );
    }

    const storedPhase = snapshot?.execution?.phase;
    const currentPhase =
        storedPhase === "writing"
            ? "writing"
            : storedPhase === "planning" && snapshot?.execution?.context !== undefined
                ? "planning"
                : "research";
    console.log(`[WORKER] Starting ${currentPhase} phase for job ${jobId}`);

    const dispatchNextPhase = (nextPhase: "planning" | "writing") => {
        const workerUrl = `${getAppBaseUrl()}/api/ai-blogger/generate/worker`;
        fetch(workerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-worker-secret": workerSecret,
            },
            body: JSON.stringify({ jobId }),
        }).catch((dispatchError) => {
            const message = dispatchError instanceof Error ? dispatchError.message : "Unknown dispatch error";
            console.warn(`[WORKER] ${nextPhase} phase dispatch warning for job ${jobId}: ${message}`);
        });
    };

    try {
        if (currentPhase === "research") {
            const researchState = await runBlogStudioDraftResearchPhase(
                executionRequest.agency,
                executionRequest.actor,
                executionRequest.input,
                jobId,
            );

            await updatePipelineJobExecution(jobId, {
                phase: "planning",
                request: executionRequest,
                context: researchState,
            });
            await awaitPipelineJobPersistence(jobId);
            dispatchNextPhase("planning");

            console.log(`[WORKER] Research phase completed for job ${jobId}; planning phase dispatched.`);
            return NextResponse.json({ ok: true, phase: "research", continued: true });
        }

        if (currentPhase === "planning") {
            if (snapshot?.execution?.context === undefined) {
                throw new Error("The planning phase could not start because the research context is missing.");
            }

            const planningState = await runBlogStudioDraftPlanningPhase(
                executionRequest.agency,
                executionRequest.actor,
                executionRequest.input,
                snapshot.execution.context,
                jobId,
            );

            await updatePipelineJobExecution(jobId, {
                phase: "writing",
                request: executionRequest,
                context: planningState,
            });
            await awaitPipelineJobPersistence(jobId);
            dispatchNextPhase("writing");

            console.log(`[WORKER] Planning phase completed for job ${jobId}; writing phase dispatched.`);
            return NextResponse.json({ ok: true, phase: "planning", continued: true });
        }

        if (snapshot?.execution?.context === undefined) {
            throw new Error("The writing phase could not start because the planning context is missing.");
        }

        await runBlogStudioDraftWritingPhase(
            executionRequest.agency,
            executionRequest.actor,
            executionRequest.input,
            snapshot.execution.context,
            jobId,
        );

        await updatePipelineJobExecution(jobId, {
            phase: "",
            clearContext: true,
            clearRequest: true,
        });
        console.log(`[WORKER] Pipeline completed for job ${jobId}`);
        await awaitPipelineJobPersistence(jobId);
        return NextResponse.json({ ok: true, phase: "writing" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown pipeline error";
        console.error(`[WORKER] ${currentPhase} phase fatal error for job ${jobId}:`, message);

        try {
            await emitPipelineEvent(jobId, { type: "error", message });
            await awaitPipelineJobPersistence(jobId);
        } catch (emitError) {
            console.error(`[WORKER] Failed to emit error event for job ${jobId}:`, emitError);
        }

        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
