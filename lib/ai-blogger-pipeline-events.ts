/**
 * AI Blogger pipeline job store.
 *
 * Live events are still emitted in-memory for low-latency SSE updates, but
 * every job is also persisted so reconnects and cross-instance reads can
 * replay the full pipeline history.
 */

import crypto from "crypto";
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

type PipelineExecutionState = {
    phase?: string;
    request?: unknown;
    context?: unknown;
    claimedPhase?: string;
    claimId?: string;
    claimExpiresAt?: string;
    updatedAt?: string;
};

type PipelineJob = {
    agencyId?: string;
    createdBy?: string;
    events: PipelineEvent[];
    emitter: EventEmitter;
    execution?: PipelineExecutionState;
    status: PipelineJobStatus;
    createdAt: number;
    updatedAt: number;
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
    updatedAt?: string;
    completedAt?: string;
    execution?: PipelineExecutionState;
};

type PipelineJobOwner = {
    agencyId: string;
    createdBy?: string;
};

function hasMeaningfulExecutionState(execution: PipelineExecutionState | undefined): execution is PipelineExecutionState {
    if (!execution) {
        return false;
    }

    return Object.keys(execution).some((key) => key !== "updatedAt");
}

type PipelineGlobalStore = typeof globalThis & {
    __aiBloggerPipelineJobs?: Map<string, PipelineJob>;
    __aiBloggerPipelineCleanup?: ReturnType<typeof setInterval> | null;
    __aiBloggerPipelineSignalsRegistered?: boolean;
    __aiBloggerPipelineWrites?: Map<string, Promise<void>>;
};

const EVENT_TTL_MS = 5 * 60 * 1000;
const JOB_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS_PER_JOB = 200;
const PHASE_CLAIM_LEASE_MS = 10 * 60 * 1000;

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
        updatedAt: Date.now(),
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

function normalizeExecutionState(value: unknown): PipelineExecutionState | undefined {
    if (!value || typeof value !== "object") {
        return undefined;
    }

    const raw = value as Record<string, unknown>;
    const execution: PipelineExecutionState = {};

    if (typeof raw.phase === "string" && raw.phase.trim()) {
        execution.phase = raw.phase;
    }
    if ("request" in raw) {
        execution.request = raw.request;
    }
    if ("context" in raw) {
        execution.context = raw.context;
    }
    if (typeof raw.claimedPhase === "string" && raw.claimedPhase.trim()) {
        execution.claimedPhase = raw.claimedPhase;
    }
    if (typeof raw.claimId === "string" && raw.claimId.trim()) {
        execution.claimId = raw.claimId;
    }
    if (typeof raw.claimExpiresAt === "string") {
        execution.claimExpiresAt = raw.claimExpiresAt;
    }
    if (typeof raw.updatedAt === "string") {
        execution.updatedAt = raw.updatedAt;
    }

    return Object.keys(execution).length > 0 ? execution : undefined;
}

function applySnapshotToMemoryJob(jobId: string, snapshot: PipelineJobSnapshot): void {
    if (!snapshot.exists) {
        return;
    }

    const job = ensureMemoryJob(jobId, {
        agencyId: snapshot.agencyId,
        createdBy: snapshot.createdBy,
    });

    job.status = snapshot.status || "running";
    job.events = [...snapshot.events];
    job.execution = snapshot.execution ? { ...snapshot.execution } : undefined;
    job.createdAt = snapshot.createdAt ? new Date(snapshot.createdAt).getTime() : job.createdAt;
    job.updatedAt = snapshot.updatedAt ? new Date(snapshot.updatedAt).getTime() : job.updatedAt;
    job.completedAt = snapshot.completedAt ? new Date(snapshot.completedAt).getTime() : undefined;
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
    const execution = normalizeExecutionState(docRecord.execution);

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
        updatedAt,
        completedAt,
        execution,
    };
}

export async function createPipelineJob(jobId: string, owner: PipelineJobOwner): Promise<void> {
    const now = new Date().toISOString();
    const job = ensureMemoryJob(jobId, owner);
    job.updatedAt = Date.now();

    await queuePersistence(jobId, async () => {
        await connectDB();
        // BUG-09: updateOne is sufficient — we never used the returned document.
        await BlogStudioPipelineJobModel.updateOne(
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
            { upsert: true },
        );
    });
}

type PipelineExecutionUpdate = {
    phase?: string;
    request?: unknown;
    context?: unknown;
    clearRequest?: boolean;
    clearContext?: boolean;
    clearClaim?: boolean;
};

export async function updatePipelineJobExecution(jobId: string, update: PipelineExecutionUpdate): Promise<void> {
    const now = new Date().toISOString();
    const job = ensureMemoryJob(jobId);
    const nextExecution: PipelineExecutionState = {
        ...(job.execution || {}),
    };

    delete nextExecution.updatedAt;

    if (update.phase !== undefined) {
        if (update.phase.trim()) {
            nextExecution.phase = update.phase;
        } else {
            delete nextExecution.phase;
        }
    }
    if ("request" in update) {
        if (update.request === undefined) {
            delete nextExecution.request;
        } else {
            nextExecution.request = update.request;
        }
    }
    if ("context" in update) {
        if (update.context === undefined) {
            delete nextExecution.context;
        } else {
            nextExecution.context = update.context;
        }
    }
    if (update.clearRequest) {
        delete nextExecution.request;
    }
    if (update.clearContext) {
        delete nextExecution.context;
    }
    if (update.clearClaim) {
        delete nextExecution.claimedPhase;
        delete nextExecution.claimId;
        delete nextExecution.claimExpiresAt;
    }

    if (hasMeaningfulExecutionState(nextExecution)) {
        nextExecution.updatedAt = now;
        job.execution = nextExecution;
    } else {
        delete job.execution;
    }
    job.updatedAt = Date.now();

    await queuePersistence(jobId, async () => {
        await connectDB();

        const setPayload: Record<string, unknown> = {
            updatedAt: now,
            expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
        };
        const unsetPayload: Record<string, number> = {};

        if (job.execution) {
            setPayload.execution = job.execution;
        } else {
            unsetPayload.execution = 1;
        }

        const updateDoc: Record<string, unknown> = {
            $set: setPayload,
            $setOnInsert: {
                id: jobId,
                agencyId: job.agencyId || "unknown",
                createdBy: job.createdBy,
                createdAt: new Date(job.createdAt).toISOString(),
                events: [],
            },
        };
        if (Object.keys(unsetPayload).length > 0) {
            updateDoc.$unset = unsetPayload;
        }

        await BlogStudioPipelineJobModel.updateOne({ id: jobId }, updateDoc, { upsert: true });
    });
}

type PipelineJobPhaseClaimResult =
    | {
        ok: true;
        claimId: string;
        phase: string;
        claimExpiresAt: string;
    }
    | {
        ok: false;
        reason: "not-found" | "not-running" | "phase-mismatch" | "already-claimed";
        status?: PipelineJobStatus;
        execution?: PipelineExecutionState;
    };

export async function claimPipelineJobPhase(
    jobId: string,
    phase: string,
): Promise<PipelineJobPhaseClaimResult> {
    const trimmedPhase = phase.trim();
    if (!trimmedPhase) {
        return { ok: false, reason: "phase-mismatch" };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const claimExpiresAt = new Date(now.getTime() + PHASE_CLAIM_LEASE_MS).toISOString();
    const claimId = crypto.randomUUID();

    await connectDB();

    const claimedDoc = await BlogStudioPipelineJobModel.findOneAndUpdate(
        {
            id: jobId,
            status: "running",
            "execution.phase": trimmedPhase,
            $or: [
                { "execution.claimId": { $exists: false } },
                { "execution.claimId": null },
                { "execution.claimExpiresAt": { $lte: nowIso } },
            ],
        },
        {
            $set: {
                updatedAt: nowIso,
                expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
                "execution.updatedAt": nowIso,
                "execution.claimedPhase": trimmedPhase,
                "execution.claimId": claimId,
                "execution.claimExpiresAt": claimExpiresAt,
            },
        },
        { new: true },
    ).lean();

    if (claimedDoc) {
        const execution = normalizeExecutionState((claimedDoc as Record<string, unknown>).execution);
        applySnapshotToMemoryJob(jobId, {
            exists: true,
            jobId,
            agencyId: typeof (claimedDoc as Record<string, unknown>).agencyId === "string"
                ? ((claimedDoc as Record<string, unknown>).agencyId as string)
                : undefined,
            createdBy: typeof (claimedDoc as Record<string, unknown>).createdBy === "string"
                ? ((claimedDoc as Record<string, unknown>).createdBy as string)
                : undefined,
            status: (typeof (claimedDoc as Record<string, unknown>).status === "string"
                ? (claimedDoc as Record<string, unknown>).status
                : "running") as PipelineJobStatus,
            events: Array.isArray((claimedDoc as { events?: unknown[] }).events)
                ? (((claimedDoc as { events?: unknown[] }).events ?? [])
                    .map((event) => normalizePipelineEvent(event))
                    .filter((event): event is PipelineEvent => Boolean(event)))
                : [],
            createdAt: typeof (claimedDoc as Record<string, unknown>).createdAt === "string"
                ? ((claimedDoc as Record<string, unknown>).createdAt as string)
                : undefined,
            updatedAt: typeof (claimedDoc as Record<string, unknown>).updatedAt === "string"
                ? ((claimedDoc as Record<string, unknown>).updatedAt as string)
                : nowIso,
            completedAt: typeof (claimedDoc as Record<string, unknown>).completedAt === "string"
                ? ((claimedDoc as Record<string, unknown>).completedAt as string)
                : undefined,
            execution,
        });

        return {
            ok: true,
            claimId,
            phase: trimmedPhase,
            claimExpiresAt,
        };
    }

    const snapshot = await readPersistedJob(jobId);
    applySnapshotToMemoryJob(jobId, snapshot);

    if (!snapshot.exists) {
        return { ok: false, reason: "not-found" };
    }

    if (snapshot.status !== "running") {
        return { ok: false, reason: "not-running", status: snapshot.status, execution: snapshot.execution };
    }

    if ((snapshot.execution?.phase || "") !== trimmedPhase) {
        return { ok: false, reason: "phase-mismatch", status: snapshot.status, execution: snapshot.execution };
    }

    return { ok: false, reason: "already-claimed", status: snapshot.status, execution: snapshot.execution };
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
    job.updatedAt = Date.now();

    if (fullEvent.type === "complete") {
        job.status = "complete";
        job.completedAt = Date.now();
        delete job.execution;
    } else if (fullEvent.type === "error") {
        job.status = "error";
        job.completedAt = Date.now();
        delete job.execution;
    }

    job.emitter.emit("event", fullEvent);

    return queuePersistence(jobId, async () => {
        await connectDB();

        const setPayload: Record<string, unknown> = {
            updatedAt: fullEvent.timestamp,
            expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
        };

        // BUG-02: track fields to $unset separately — setting `undefined` inside $set is a
        // Mongoose no-op and leaves stale values in MongoDB on retries.
        const unsetPayload: Record<string, number> = {};

        if (fullEvent.type === "complete") {
            setPayload.status = "complete";
            setPayload.completedAt = fullEvent.timestamp;
            setPayload.result = fullEvent.result;
            unsetPayload.errorMessage = 1; // properly clear any previous error
            unsetPayload.execution = 1;
        } else if (fullEvent.type === "error") {
            setPayload.status = "error";
            setPayload.completedAt = fullEvent.timestamp;
            setPayload.errorMessage = fullEvent.message || "Pipeline failed.";
            unsetPayload.execution = 1;
            unsetPayload.result = 1;
        }

        // BUG-09: updateOne is sufficient — we never used the returned document.
        const updateDoc: Record<string, unknown> = {
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
        };
        if (Object.keys(unsetPayload).length > 0) {
            updateDoc.$unset = unsetPayload;
        }

        await BlogStudioPipelineJobModel.updateOne({ id: jobId }, updateDoc, { upsert: true });
    }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[PIPELINE] Failed to persist event for ${jobId}: ${message}`);
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
            updatedAt: new Date(memoryJob.updatedAt).toISOString(),
            completedAt: memoryJob.completedAt ? new Date(memoryJob.completedAt).toISOString() : undefined,
            execution: memoryJob.execution ? { ...memoryJob.execution } : undefined,
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

/**
 * Attach a workflow run ID to an existing pipeline job.
 * Called by the WorkflowKit step route after the workflow has been created.
 */
export async function attachPipelineWorkflowRun(jobId: string, workflowRunId: string): Promise<void> {
    const job = ensureMemoryJob(jobId);
    (job as PipelineJob & { workflowRunId?: string }).workflowRunId = workflowRunId;

    await queuePersistence(jobId, async () => {
        await connectDB();
        // BUG-09: updateOne is sufficient — we never used the returned document.
        await BlogStudioPipelineJobModel.updateOne(
            { id: jobId },
            {
                $set: {
                    workflowRunId,
                    updatedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + JOB_RETENTION_MS),
                },
                $setOnInsert: {
                    id: jobId,
                    agencyId: job.agencyId || "unknown",
                    createdBy: job.createdBy,
                    createdAt: new Date(job.createdAt).toISOString(),
                    events: [],
                },
            },
            { upsert: true },
        );
    });
}

/**
 * Wait for any pending MongoDB write for the given job to settle.
 * Used by cleanup code to ensure events are persisted before a serverless
 * function exits.
 */
export async function awaitPipelineJobPersistence(jobId: string): Promise<void> {
    if (!jobId) {
        return;
    }
    const pending = writes.get(jobId);
    if (!pending) {
        return;
    }
    await pending.catch(() => undefined);
}
