import { requireRole } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";
import { getPipelineJobSnapshot, subscribePipelineEvents, type PipelineEvent } from "@/lib/ai-blogger-pipeline-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId") || "";

    if (!jobId) {
        return new Response("Missing jobId", { status: 400 });
    }

    const currentUser = await requireRole("admin");
    const agency = await getCurrentAgency();
    if (!agency) {
        return new Response("Unauthorized", { status: 401 });
    }

    const access = getAIBloggerAccessState({
        role: currentUser.role,
        plan: agency.plan,
        status: agency.status,
        featureEnabled: agency.features?.aiBlogger,
    });
    if (!access.canAccess) {
        return new Response("Forbidden", { status: 403 });
    }

    const initialSnapshot = await getPipelineJobSnapshot(jobId);
    if (!initialSnapshot.exists || initialSnapshot.agencyId !== agency.id) {
        return new Response("Job not found", { status: 404 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let closed = false;
            let emittedCount = 0;
            let cleanup: (() => void) | null = null;
            let closeTimeout: ReturnType<typeof setTimeout> | null = null;
            let pollInterval: ReturnType<typeof setInterval> | null = null;
            let idleTimeout: ReturnType<typeof setTimeout> | null = null;
            let abortListener: (() => void) | null = null;

            const clearTimers = () => {
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                    closeTimeout = null;
                }
                if (pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
                if (idleTimeout) {
                    clearTimeout(idleTimeout);
                    idleTimeout = null;
                }
            };

            const closeStream = () => {
                if (closed) {
                    return;
                }

                closed = true;
                clearTimers();
                cleanup?.();
                cleanup = null;

                if (abortListener) {
                    try {
                        request.signal.removeEventListener("abort", abortListener);
                    } catch {
                        // Ignore listener cleanup failures.
                    }
                }

                try {
                    controller.close();
                } catch {
                    // Stream is already closed.
                }
            };

            const scheduleClose = () => {
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                }
                closeTimeout = setTimeout(() => {
                    closeTimeout = null;
                    closeStream();
                }, 500);
            };

            const resetIdleTimeout = () => {
                if (idleTimeout) {
                    clearTimeout(idleTimeout);
                }

                idleTimeout = setTimeout(() => {
                    try {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                                type: "error",
                                message: "The generation job stopped reporting progress. Please retry if it does not complete.",
                            })}\n\n`),
                        );
                    } catch {
                        // Ignore enqueue failures on close.
                    }
                    closeStream();
                }, 150_000);
            };

            const sendEvent = (event: PipelineEvent) => {
                if (closed) {
                    return;
                }

                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                );
                emittedCount += 1;

                if (event.type === "complete" || event.type === "error") {
                    scheduleClose();
                    return;
                }

                resetIdleTimeout();
            };

            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "connected", jobId })}\n\n`),
            );

            for (const event of initialSnapshot.events) {
                sendEvent(event);
            }

            if (initialSnapshot.status !== "running") {
                scheduleClose();
                return;
            }

            resetIdleTimeout();

            cleanup = subscribePipelineEvents(jobId, sendEvent, { replayPastEvents: false });

            if (!cleanup) {
                const pollSnapshot = async () => {
                    const snapshot = await getPipelineJobSnapshot(jobId);
                    if (!snapshot.exists || snapshot.agencyId !== agency.id) {
                        sendEvent({
                            type: "error",
                            message: "Job expired or is no longer available.",
                            timestamp: new Date().toISOString(),
                        });
                        return;
                    }

                    const nextEvents = snapshot.events.slice(emittedCount);
                    for (const event of nextEvents) {
                        sendEvent(event);
                    }

                    if (snapshot.status !== "running" && nextEvents.length === 0) {
                        scheduleClose();
                    }
                };

                void pollSnapshot();
                pollInterval = setInterval(() => {
                    void pollSnapshot();
                }, 750);
            }

            abortListener = () => {
                closeStream();
            };
            request.signal.addEventListener("abort", abortListener);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
