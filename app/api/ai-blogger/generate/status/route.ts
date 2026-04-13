import { NextResponse } from "next/server";

import { requireRole } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";
import { getPipelineJobSnapshot } from "@/lib/ai-blogger-pipeline-events";

export const dynamic = "force-dynamic";

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

    let status: "running" | "completed" | "failed";
    if (snapshot.status === "complete") {
        status = "completed";
    } else if (snapshot.status === "error") {
        status = "failed";
    } else {
        const STALE_THRESHOLD_MS = 320_000;
        const createdAtMs = snapshot.createdAt ? new Date(snapshot.createdAt).getTime() : 0;
        const updatedAtMs = snapshot.updatedAt ? new Date(snapshot.updatedAt).getTime() : 0;
        const lastEventMs = snapshot.events.length > 0
            ? new Date(snapshot.events[snapshot.events.length - 1]?.timestamp || 0).getTime()
            : 0;
        const lastActivityMs = Math.max(createdAtMs, updatedAtMs, lastEventMs);
        const hasTerminal = snapshot.events.some((event) => event.type === "complete" || event.type === "error");

        if (!hasTerminal && lastActivityMs > 0 && Date.now() - lastActivityMs > STALE_THRESHOLD_MS) {
            status = "failed";
        } else {
            status = "running";
        }
    }

    const completeEvent = snapshot.events.find((event) => event.type === "complete");
    const errorEvent = snapshot.events.find((event) => event.type === "error");
    const staleError =
        status === "failed" && !errorEvent
            ? "The generation worker stopped reporting progress before completion. Try again."
            : null;

    return NextResponse.json({
        status,
        eventCount: snapshot.events.length,
        result: completeEvent?.result ?? null,
        error: errorEvent?.message ?? staleError,
    });
}
