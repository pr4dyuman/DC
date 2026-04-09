import { requireRole } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";
import { getPipelineJobSnapshot } from "@/lib/ai-blogger-pipeline-events";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai-blogger/generate/status?jobId=xxx
 *
 * Lightweight polling fallback for when SSE is completely unavailable.
 * Returns the current job status, event count, and result/error if finished.
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId") || "";

    if (!jobId) {
        return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const currentUser = await requireRole("admin");
    const agency = await getCurrentAgency();
    if (!agency) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = getAIBloggerAccessState({
        role: currentUser.role,
        plan: agency.plan,
        status: agency.status,
        featureEnabled: agency.features?.aiBlogger,
    });
    if (!access.canAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = await getPipelineJobSnapshot(jobId);
    if (!snapshot.exists || snapshot.agencyId !== agency.id) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Map the internal status to what the client expects.
    let status: "running" | "completed" | "failed";
    if (snapshot.status === "complete") {
        status = "completed";
    } else if (snapshot.status === "error") {
        status = "failed";
    } else {
        // Stale-job guard: Vercel hard-kills the worker at 300s.
        // If a job is still "running" more than 320s after creation and has no
        // completion/error event, the worker died silently. Return "failed" so
        // the client stops polling and shows a meaningful error instead of
        // spinning forever. (The 260s soft-timeout in the worker prevents this
        // for future runs; this guard handles jobs already stuck in MongoDB.)
        const STALE_THRESHOLD_MS = 320_000;
        const createdAtMs = snapshot.createdAt ? new Date(snapshot.createdAt).getTime() : 0;
        const hasTerminal = snapshot.events.some((e) => e.type === "complete" || e.type === "error");
        if (!hasTerminal && createdAtMs > 0 && Date.now() - createdAtMs > STALE_THRESHOLD_MS) {
            status = "failed";
        } else {
            status = "running";
        }
    }

    // Extract result from the completion event if available.
    const completeEvent = snapshot.events.find((e) => e.type === "complete");
    const errorEvent = snapshot.events.find((e) => e.type === "error");
    const staleError =
        status === "failed" && !errorEvent
            ? "The generation worker was stopped by the server before it could complete. " +
              "Website data is now cached — try again and it will be faster this time."
            : null;

    return NextResponse.json({
        status,
        eventCount: snapshot.events.length,
        result: completeEvent?.result ?? null,
        error: errorEvent?.message ?? staleError,
    });
}
