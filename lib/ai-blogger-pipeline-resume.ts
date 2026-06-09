import {
    awaitPipelineJobPersistence,
    emitPipelineEvent,
    failPipelineJobIfRunning,
    preparePipelineJobResume,
    PIPELINE_RESUME_MESSAGE,
    PIPELINE_STALE_RESUME_MAX_ATTEMPTS,
    type PipelineJobSnapshot,
} from "./ai-blogger-pipeline-events";

type ResumeDispatchResult =
    | { status: "resumed"; phase: string; attempts: number }
    | { status: "failed"; message: string }
    | { status: "skipped"; reason: string };

function getAppBaseUrl(request?: Request): string {
    if (request) {
        try {
            return new URL(request.url).origin.replace(/\/$/, "");
        } catch {
            // Fall through to env-based resolution.
        }
    }
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

async function readDispatchFailureMessage(label: string, response: Response): Promise<string> {
    let detail = "";
    try {
        const text = (await response.text()).trim();
        if (text) {
            detail = text.length > 240 ? `${text.slice(0, 240)}...` : text;
        }
    } catch {
        // Ignore response body read errors.
    }

    return detail
        ? `${label} returned ${response.status} ${response.statusText}: ${detail}`
        : `${label} returned ${response.status} ${response.statusText}`;
}

export async function resumeInterruptedPipelineJob(
    jobId: string,
    snapshot: PipelineJobSnapshot,
    request?: Request,
): Promise<ResumeDispatchResult> {
    const prepared = await preparePipelineJobResume(jobId, snapshot);

    if (!prepared.ok) {
        if (prepared.reason === "max-attempts") {
            const message = `Generation was interrupted ${prepared.attempts || PIPELINE_STALE_RESUME_MAX_ATTEMPTS} times while processing the same stage. Retry with a shorter word target or fewer research features enabled.`;
            await failPipelineJobIfRunning(jobId, message);
            await awaitPipelineJobPersistence(jobId);
            return { status: "failed", message };
        }

        return { status: "skipped", reason: prepared.reason };
    }

    await emitPipelineEvent(jobId, {
        type: "log",
        label: "Workflow",
        message: `${PIPELINE_RESUME_MESSAGE} Stage: ${prepared.phase}. Attempt ${prepared.attempts}/${PIPELINE_STALE_RESUME_MAX_ATTEMPTS}.`,
    });
    await awaitPipelineJobPersistence(jobId);

    const workerSecret = process.env.AI_BLOGGER_WORKER_SECRET;
    if (!workerSecret) {
        const message = "AI Blogger worker is not configured, so the interrupted generation cannot resume.";
        await failPipelineJobIfRunning(jobId, message);
        await awaitPipelineJobPersistence(jobId);
        return { status: "failed", message };
    }

    const workerUrl = `${getAppBaseUrl(request)}/api/ai-blogger/generate/worker`;
    try {
        const response = await fetch(workerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-worker-secret": workerSecret,
            },
            body: JSON.stringify({ jobId }),
        });

        if (!response.ok) {
            const message = await readDispatchFailureMessage("Resume worker dispatch", response);
            await failPipelineJobIfRunning(jobId, message);
            await awaitPipelineJobPersistence(jobId);
            return { status: "failed", message };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Resume worker dispatch failed.";
        await failPipelineJobIfRunning(jobId, `Resume worker dispatch failed: ${message}`);
        await awaitPipelineJobPersistence(jobId);
        return { status: "failed", message };
    }

    return { status: "resumed", phase: prepared.phase, attempts: prepared.attempts };
}
