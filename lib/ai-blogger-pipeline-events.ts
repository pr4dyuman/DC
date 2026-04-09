/**
 * AI Blogger pipeline job store.
 *
 * Live events are still emitted in-memory for low-latency SSE updates, but
 * every job is also persisted so reconnects and cross-instance reads can
 * replay the full pipeline history.
 */

import { EventEmitter } from "events";

import { BlogStudioPipelineJobModel, connectDB } from "./mongodb";

export type PipelineEventType =
    | "step-start"
    | "step-complete"
    | "step-fail"
    | "step-skip"
    | "log"
    | "complete"
    | "error";

export type PipelineEvent = {
    type: PipelineEventType;
    step?: string;
    label?: string;
    notes?: string;
    message?: string;
    result?: unknown;
    timestamp: string;
};

type PipelinePersistedEvent = Omit<PipelineEvent, "result">;

type PipelineJobStatus = "running" | "complete" | "error";

type PipelineJob = {
    agencyId?: string;
    createdBy?: string;
    events: PipelineEvent[];
    emitter: EventEmitter;
    status: PipelineJobStatus;
    createdAt: number;
    completedAt?: number;
};

type PipelineJobSnapshot = {
    exists: boolean;
    jobId?: string;
    agencyId?: string;
    createdBy?: string;
    status?: PipelineJobStatus;
    events: PipelineEvent[];
    createdAt?: string;
    completedAt?: string;
};

type PipelineJobOwner = {
    agencyId: string;
    createdBy?: string;
};

type PipelineGlobalStore = typeof globalThis & {
    __aiBloggerPipelineJobs?: Map<string, PipelineJob>;
    __aiBloggerPipelineCleanup?: ReturnType<typeof setInterval> | null;
    __aiBloggerPipelineSignalsRegistered?: boolean;
    __aiBloggerPipelineWrites?: Map<string, Promise<void>>;
};

const EVENT_TTL_MS = 5 * 60 * 1000;
const JOB_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS_PER_JOB = 200;

const pipelineGlobal = globalThis as PipelineGlobalStore;
const jobs = pipelineGlobal.__aiBloggerPipelineJobs ?? (pipelineGlobal.__aiBloggerPipelineJobs = new Map<string, PipelineJob>());
const writes = pipelineGlobal.__aiBloggerPipelineWrites ?? (pipelineGlobal.__aiBloggerPipelineWrites = new Map<string, Promise<void>>());

let cleanupInterval = pipelineGlobal.__aiBloggerPipelineCleanup ?? null;

function setCleanupInterval(value: ReturnType<typeof setInterval> | null) {
    cleanupInterval = value;
    pipelineGlobal.__aiBloggerPipelineCleanup = value;
}

function shutdownPipelineStore() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        setCleanupInterval(null);
    }

    for (const [, job] of jobs) {
        try {
            job.emitter.removeAllListeners();
        } catch {
            // Best-effort cleanup only.
        }
    }

    jobs.clear();
    writes.clear();
}

function ensureCleanup() {
    if (cleanupInterval) {
        return;
    }

    setCleanupInterval(setInterval(() => {
        const now = Date.now();

        for (const [jobId, job] of jobs) {
            if (job.status !== "running" && job.completedAt && now - job.completedAt > EVENT_TTL_MS) {
                try {
                    job.emitter.removeAllListeners();
                } catch {
                    // Ignore listener cleanup failures.
                }
                jobs.delete(jobId);
            }
        }

        if (jobs.size === 0 && cleanupInterval) {
            clearInterval(cleanupInterval);
            setCleanupInterval(null);
        }
    }, 60_000));

    if (cleanupInterval) {
        try {
            const nodeInterval = cleanupInterval as NodeJS.Timeout & { unref?: () => void };
            nodeInterval.unref?.();
        } catch {
            // `unref` is not guaranteed in every runtime.
        }
    }

    if (typeof process !== "undefined" && process.on && !pipelineGlobal.__aiBloggerPipelineSignalsRegistered) {
        process.on("SIGTERM", shutdownPipelineStore);
        process.on("SIGINT", shutdownPipelineStore);
        pipelineGlobal.__aiBloggerPipelineSignalsRegistered = true;
    }
}

function ensureMemoryJob(jobId: string, owner?: Partial<PipelineJobOwner>) {
    const existing = jobs.get(jobId);
    if (existing) {
        if (owner?.agencyId && !existing.agencyId) {
            existing.agencyId = owner.agencyId;
        }
        if (owner?.createdBy && !existing.createdBy) {
            existing.createdBy = owner.createdBy;
        }
        return existing;
    }

    const emitter = new EventEmitter();
    emitter.setMaxListeners(0); // Unlimited listeners (each SSE reconnection adds one)

    const job: PipelineJob = {
        agencyId: owner?.agencyId,
        createdBy: owner?.createdBy,
        events: [],
        emitter,
        status: "running",
        createdAt: Date.now(),
    };

    jobs.set(jobId, job);
    ensureCleanup();
    return job;
}

function queuePersistence(jobId: string, task: () => Promise<void>) {
    const previous = writes.get(jobId) ?? Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(task);

    writes.set(jobId, current);
    current.finally(() => {
        if (writes.get(jobId) === current) {
            writes.delete(jobId);
        }
    }).catch(() => undefined);

    return current;
}

function toPersistedEvent(event: PipelineEvent): PipelinePersistedEvent {
    return {
        type: event.type,
        step: event.step,
        label: event.label,
        notes: event.notes,
        message: event.message,
        timestamp: event.timestamp,
    };
}

function normalizePipelineEvent(value: unknown, result?: unknown): PipelineEvent | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const raw = value as Record<string, unknown>;
    if (typeof raw.type !== "string" || typeof raw.timestamp !== "string") {
        return null;
    }

    const event: PipelineEvent = {
        type: raw.type as PipelineEventType,
        timestamp: raw.timestamp,
    };

    if (typeof raw.step === "string") {
        event.step = raw.step;
    }
    if (typeof raw.label === "string") {
        event.label = raw.label;
    }
    if (typeof raw.notes === "string") {
        event.notes = raw.notes;
    }
    if (typeof raw.message === "string") {
        event.message = raw.message;
    }
    if (result !== undefined) {
        event.result = result;
    }

    return event;
}

async function readPersistedJob(jobId: string): Promise<PipelineJobSnapshot> {
    await connectDB();

    const doc = await BlogStudioPipelineJobModel.findOne({ id: jobId }).lean();
    if (!doc) {
        return { exists: false, events: [] };
    }

    const rawEvents = Array.isArray((doc as { events?: unknown[] }).events)
        ? ((doc as { events?: unknown[] }).events ?? [])
        : [];
    const events = rawEvents
        .map((event) => normalizePipelineEvent(event))
        .filter((event): event is PipelineEvent => Boolean(event));

    const docRecord = doc as Record<string, unknown>;
    const status = (typeof docRecord.status === "string" ? docRecord.status : "running") as PipelineJobStatus;
    const completedAt = typeof docRecord.completedAt === "string" ? docRecord.completedAt : undefined;
    const updatedAt = typeof docRecord.updatedAt === "string" ? docRecord.updatedAt : undefined;
    const createdAt = typeof docRecord.createdAt === "string" ? docRecord.createdAt : undefined;
    const result = docRecord.result;
    const errorMessage = typeof docRecord.errorMessage === "string" ? docRecord.errorMessage : undefined;

    if (status === "complete" && result !== undefined) {
        const completeIndex = [...events].reverse().findIndex((event) => event.type === "complete");
        if (completeIndex >= 0) {
            const index = events.length - 1 - completeIndex;
            events[index] = {
                ...events[index],
                result,
            };
        } else {
            events.push({
                type: "complete",
                message: "Draft generated.",
                result,
                timestamp: completedAt || updatedAt || createdAt || new Date().toISOString(),
            });
        }
    }

    if (status === "error" && !events.some((event) => event.type === "error") && errorMessage) {
        events.push({
            type: "error",
            message: errorMessage,
            timestamp: completedAt || updatedAt || createdAt || new Date().toISOString(),
        });
    }

    return {
        exists: true,
        jobId,
        agencyId: typeof docRecord.agencyId === "string" ? docRecord.agencyId : undefined,
        createdBy: typeof docRecord.createdBy === "string" ? docRecord.createdBy : undefined,
        status,
        events,
        createdAt,
        completedAt,
    };
}

export async function createPipelineJob(jobId: string, owner: PipelineJobOwner): Promise<void> {
    const now = new Date().toISOString();
    ensureMemoryJob(jobId, owner);

    await queuePersistence(jobId, async () => {
        await connectDB();
        await BlogStudioPipelineJobModel.findOneAndUpdate(
            { id: jobId },
            {
                $set: {
                    agencyId: owner.agencyId,
                    createdBy: owner.createdBy,
                    status: "running",
                    updatedAt: now,
                    expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
                },
                $setOnInsert: {
                    id: jobId,
                    events: [],
                    createdAt: now,
                },
            },
            { upsert: true, returnDocument: 'before' },
        );
    });
}

/**
 * Remove the in-memory job entry for a given jobId.
 *
 * Call this after dispatching the pipeline to a separate worker endpoint so
 * the SSE stream route falls back to MongoDB polling instead of subscribing
 * to a local EventEmitter that will never receive events.
 */
export function releaseLocalPipelineJob(jobId: string): void {
    const job = jobs.get(jobId);
    if (job) {
        try {
            job.emitter.removeAllListeners();
        } catch {
            // Best-effort cleanup.
        }
        jobs.delete(jobId);
    }
}

export function emitPipelineEvent(jobId: string, event: Omit<PipelineEvent, "timestamp">) {
    console.log(`[PIPELINE] emitPipelineEvent: ${jobId} - ${event.type}${event.step ? ` (${event.step})` : ''}`);
    const job = ensureMemoryJob(jobId);
    const fullEvent: PipelineEvent = {
        ...event,
        timestamp: new Date().toISOString(),
    };

    if (job.events.length < MAX_EVENTS_PER_JOB) {
        job.events.push(fullEvent);
    }

    if (fullEvent.type === "complete") {
        job.status = "complete";
        job.completedAt = Date.now();
    } else if (fullEvent.type === "error") {
        job.status = "error";
        job.completedAt = Date.now();
    }

    job.emitter.emit("event", fullEvent);

    return queuePersistence(jobId, async () => {
        await connectDB();

        const setPayload: Record<string, unknown> = {
            updatedAt: fullEvent.timestamp,
            expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
        };

        if (fullEvent.type === "complete") {
            setPayload.status = "complete";
            setPayload.completedAt = fullEvent.timestamp;
            setPayload.result = fullEvent.result;
            setPayload.errorMessage = undefined;
        } else if (fullEvent.type === "error") {
            setPayload.status = "error";
            setPayload.completedAt = fullEvent.timestamp;
            setPayload.errorMessage = fullEvent.message || "Pipeline failed.";
        }

        await BlogStudioPipelineJobModel.findOneAndUpdate(
            { id: jobId },
            {
                $push: {
                    events: {
                        $each: [toPersistedEvent(fullEvent)],
                        $slice: -MAX_EVENTS_PER_JOB,
                    },
                },
                $set: setPayload,
                $setOnInsert: {
                    id: jobId,
                    agencyId: job.agencyId || "unknown",
                    createdBy: job.createdBy,
                    createdAt: new Date(job.createdAt).toISOString(),
                },
            },
            { upsert: true, returnDocument: 'before' },
        );
    });
}

export function subscribePipelineEvents(
    jobId: string,
    onEvent: (event: PipelineEvent) => void,
    options?: { replayPastEvents?: boolean },
): (() => void) | null {
    const job = jobs.get(jobId);
    if (!job) {
        console.log(`[PIPELINE] subscribePipelineEvents: Job ${jobId} not found in memory. Available jobs: ${Array.from(jobs.keys()).join(', ')}`);
        return null;
    }

    const replayPastEvents = options?.replayPastEvents ?? true;
    if (replayPastEvents) {
        for (const event of job.events) {
            onEvent(event);
        }
    }

    if (job.status !== "running") {
        return () => {};
    }

    const handler = (event: PipelineEvent) => onEvent(event);
    job.emitter.on("event", handler);

    return () => {
        job.emitter.off("event", handler);
    };
}

export async function getPipelineJobSnapshot(jobId: string): Promise<PipelineJobSnapshot> {
    const memoryJob = jobs.get(jobId);
    if (memoryJob) {
        return {
            exists: true,
            jobId,
            agencyId: memoryJob.agencyId,
            createdBy: memoryJob.createdBy,
            status: memoryJob.status,
            events: [...memoryJob.events],
            createdAt: new Date(memoryJob.createdAt).toISOString(),
            completedAt: memoryJob.completedAt ? new Date(memoryJob.completedAt).toISOString() : undefined,
        };
    }

    return readPersistedJob(jobId);
}

export async function getPipelineJobStatus(jobId: string): Promise<{ exists: boolean; status?: PipelineJobStatus; agencyId?: string }> {
    const snapshot = await getPipelineJobSnapshot(jobId);
    return {
        exists: snapshot.exists,
        status: snapshot.status,
        agencyId: snapshot.agencyId,
    };
}
