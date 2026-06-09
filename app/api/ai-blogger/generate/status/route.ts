import { NextResponse } from "next/server";

import { requireRole } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";
import {
    getPipelineJobSnapshot,
    isPipelineJobStale,
    PIPELINE_TIMEOUT_MESSAGE,
} from "@/lib/ai-blogger-pipeline-events";
import { resumeInterruptedPipelineJob } from "@/lib/ai-blogger-pipeline-resume";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
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

        let snapshot = await getPipelineJobSnapshot(jobId);
        if (!snapshot.exists || snapshot.agencyId !== agency.id) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (isPipelineJobStale(snapshot)) {
            await resumeInterruptedPipelineJob(jobId, snapshot, request);
            snapshot = await getPipelineJobSnapshot(jobId);
        }

        let status: "running" | "completed" | "failed";
        if (snapshot.status === "complete") {
            status = "completed";
        } else if (snapshot.status === "error") {
            status = "failed";
        } else {
            status = "running";
        }

        const completeEvent = snapshot.events.find((event) => event.type === "complete");
        const errorEvent = snapshot.events.find((event) => event.type === "error");
        const staleError =
            status === "failed" && !errorEvent
                ? PIPELINE_TIMEOUT_MESSAGE
                : null;

        return NextResponse.json({
            status,
            eventCount: snapshot.events.length,
            result: completeEvent?.result ?? null,
            error: errorEvent?.message ?? staleError,
        });
    } catch (error) {
        if (isMongoConnectionIssue(error)) {
            return NextResponse.json(
                { error: "Generation status temporarily unavailable." },
                {
                    status: 503,
                    headers: {
                        "Retry-After": "2",
                    },
                },
            );
        }

        throw error;
    }
}
