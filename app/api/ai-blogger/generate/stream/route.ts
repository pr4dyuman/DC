import { requireRole } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";
import {
    getPipelineJobSnapshot,
    isPipelineJobStale,
    PIPELINE_TIMEOUT_MESSAGE,
    subscribePipelineEvents,
    type PipelineEvent,
} from "@/lib/ai-blogger-pipeline-events";
import { resumeInterruptedPipelineJob } from "@/lib/ai-blogger-pipeline-resume";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes - SSE connections need to stay open

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const jobId = url.searchParams.get("jobId") || "";
        const cursorParam = url.searchParams.get("cursor");
        const headerLastEventId = request.headers.get("last-event-id");
        const cursorFromQuery = cursorParam ? Math.max(0, Math.floor(Number(cursorParam)) || 0) : 0;
        const cursorFromLastEventId = headerLastEventId
            ? Math.max(0, Math.floor(Number(headerLastEventId)) + 1 || 0)
            : 0;
        const cursor = Math.max(cursorFromQuery, cursorFromLastEventId);

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

        console.log(
            `[SSE] Initial snapshot: status=${initialSnapshot.status}, events=${initialSnapshot.events.length}, cursor=${cursor}, queryCursor=${cursorFromQuery}, lastEventId=${headerLastEventId || "none"}, jobId=${jobId}`,
        );

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            start(controller) {
            let closed = false;
            let emittedCount = cursor;
            let cleanup: (() => void) | null = null;
            let closeTimeout: ReturnType<typeof setTimeout> | null = null;
            let maxStreamLifetimeTimeout: ReturnType<typeof setTimeout> | null = null;
            let pollInterval: ReturnType<typeof setInterval> | null = null;
            let idleTimeout: ReturnType<typeof setTimeout> | null = null;
            let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
            let abortListener: (() => void) | null = null;
            const startTime = Date.now();

            console.log(`[SSE] Stream start for ${jobId}`);

            const clearTimers = () => {
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                    closeTimeout = null;
                }
                if (maxStreamLifetimeTimeout) {
                    clearTimeout(maxStreamLifetimeTimeout);
                    maxStreamLifetimeTimeout = null;
                }
                if (pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
                if (idleTimeout) {
                    clearTimeout(idleTimeout);
                    idleTimeout = null;
                }
                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                    keepAliveInterval = null;
                }
            };

            const closeStream = () => {
                if (closed) {
                    return;
                }

                closed = true;
                console.log(`[SSE] closeStream called for ${jobId}`);
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
                    console.log(`[SSE] Idle timeout reached for ${jobId}; closing stream so the client can reconnect`);
                    closeStream();
                // Long AI stages like live trend discovery and deep research can exceed
                // 90s without emitting intermediate step events. Closing quietly lets the
                // client reconnect without surfacing a false workflow error.
                }, 210_000);
            };

            const sendEvent = (event: PipelineEvent) => {
                if (closed) {
                    return;
                }

                controller.enqueue(
                    encoder.encode(`id: ${emittedCount}\ndata: ${JSON.stringify(event)}\n\n`),
                );
                emittedCount += 1;

                // Only close on final completion, not on step-complete
                if (event.type === "complete" || event.type === "error") {
                    console.log(`[SSE] Scheduling close because of ${event.type} event`);
                    scheduleClose();
                    return;
                }

                resetIdleTimeout();
            };

            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "connected", jobId })}\n\n`),
            );
            console.log(`[SSE] Sent connected event for ${jobId}`);

            // Replay events from the cursor position to avoid duplicates on reconnect.
            const eventsToReplay = cursor > 0
                ? initialSnapshot.events.slice(cursor)
                : initialSnapshot.events;
            for (const event of eventsToReplay) {
                sendEvent(event);
            }
            console.log(`[SSE] Sent ${eventsToReplay.length} events (skipped ${cursor}) for ${jobId}`);

            if (initialSnapshot.status !== "running") {
                scheduleClose();
                return;
            }

            resetIdleTimeout();
            maxStreamLifetimeTimeout = setTimeout(() => {
                console.log(
                    `[SSE] Max stream lifetime reached for ${jobId}; closing stream so the client can reconnect before Vercel times out`,
                );
                closeStream();
            }, 270_000);

            // BUG-17: 15s keep-alive is more than sufficient to satisfy any proxy or
            // browser timeout. The old 300ms generated ~600 writes per 3-minute run.
            let keepAliveCount = 0;
            console.log(`[SSE] Starting keep-alive comments (every 15s) for ${jobId}`);
            keepAliveInterval = setInterval(() => {
                if (!closed) {
                    try {
                        controller.enqueue(encoder.encode(": keep-alive\n\n"));
                        keepAliveCount += 1;
                        if (keepAliveCount % 10 === 0) {
                            console.log(`[SSE] Keep-alive #${keepAliveCount} sent for ${jobId}`);
                        }
                    } catch {
                        // Stream closed, interval will be cleared by closeStream
                    }
                }
            }, 15_000);

            // Send first keep-alive immediately to signal data is flowing
            try {
                controller.enqueue(encoder.encode(": keep-alive\n\n"));
                console.log(`[SSE] Immediate keep-alive sent for ${jobId}`);
            } catch {
                // Ignore if stream is already closed
            }

            cleanup = subscribePipelineEvents(jobId, sendEvent, { replayPastEvents: false });

            console.log(`[SSE] subscribePipelineEvents returned: ${cleanup ? 'cleanup function' : 'null'} for ${jobId}`);

            if (!cleanup) {
                console.log(`[SSE] No live subscription available, setting up polling for ${jobId}`);
                let consecutiveErrors = 0;
                const MAX_CONSECUTIVE_ERRORS = 3;
                let pollCount = 0;

                const pollSnapshot = async () => {
                    pollCount += 1;
                    try {
                        let snapshot = await getPipelineJobSnapshot(jobId);
                        if (!snapshot.exists || snapshot.agencyId !== agency.id) {
                            console.log(`[SSE] Poll #${pollCount}: Job not found or unauthorized`);
                            sendEvent({
                                type: "error",
                                message: "Job expired or is no longer available.",
                                timestamp: new Date().toISOString(),
                            });
                            if (pollInterval) {
                                clearInterval(pollInterval);
                                pollInterval = null;
                            }
                            return;
                        }

                        if (isPipelineJobStale(snapshot)) {
                            console.warn(`[SSE] Poll #${pollCount}: Job ${jobId} is stale; attempting resume.`);
                            await resumeInterruptedPipelineJob(jobId, snapshot, request);
                            snapshot = await getPipelineJobSnapshot(jobId);
                        }

                        const nextEvents = snapshot.events.slice(emittedCount);
                        console.log(`[SSE] Poll #${pollCount}: Found ${nextEvents.length} new events (total: ${snapshot.events.length}, status: ${snapshot.status})`);
                        consecutiveErrors = 0; // Reset on successful poll

                        for (const event of nextEvents) {
                            sendEvent(event);
                        }

                        // BUG-03: do NOT close until the client has actually received
                        // a terminal event. MongoDB $push (events) and $set (status) are
                        // persisted via separate queued writes, so status can flip to
                        // "complete" before the events array is visible to a polling read.
                        // Closing on status-only would leave the client stuck on "running".
                        const hasTerminalEvent = snapshot.events.some(
                            (e) => e.type === "complete" || e.type === "error",
                        );
                        if (snapshot.status === "error" && !hasTerminalEvent) {
                            sendEvent({
                                type: "error",
                                message: PIPELINE_TIMEOUT_MESSAGE,
                                timestamp: new Date().toISOString(),
                            });
                        }
                        if (snapshot.status !== "running" && hasTerminalEvent && nextEvents.length === 0) {
                            if (pollInterval) {
                                clearInterval(pollInterval);
                                pollInterval = null;
                            }
                            scheduleClose();
                        }
                    } catch (error) {
                        consecutiveErrors += 1;
                        console.error(`[SSE] Poll #${pollCount} error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

                        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                            console.error(`[SSE] Max polling errors reached, closing stream for ${jobId}`);
                            sendEvent({
                                type: "error",
                                message: "Generation service unavailable. Please try again.",
                                timestamp: new Date().toISOString(),
                            });
                            if (pollInterval) {
                                clearInterval(pollInterval);
                                pollInterval = null;
                            }
                            scheduleClose();
                        }
                    }
                };

                void pollSnapshot();
                pollInterval = setInterval(() => {
                    void pollSnapshot();
                }, 750);
            }

            abortListener = () => {
                const elapsed = Date.now() - startTime;
                console.log(`[SSE] Abort signal for ${jobId}, closed=${closed}, emitted=${emittedCount} events after ${elapsed}ms`);
                if (!closed) {
                    closeStream();
                }
            };
            request.signal.addEventListener("abort", abortListener);
            console.log(`[SSE] Stream setup complete for ${jobId}, cleanup=${cleanup ? 'live' : 'polling'}`);
            },
            cancel() {
                // Client disconnected - cleanup will be handled by abort listener or stream close
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
    } catch (error) {
        if (isMongoConnectionIssue(error)) {
            return new Response("Generation stream temporarily unavailable.", {
                status: 503,
                headers: {
                    "Retry-After": "2",
                },
            });
        }

        throw error;
    }
}
