import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

const mongoUri: string = MONGODB_URI;

interface MongooseConnection {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

const PRIMARY_DB_CONNECT_DEADLINE_MS = 12_000;
const PRIMARY_DB_RETRY_COOLDOWN_MS = 15_000;

let lastConnectionFailureAt = 0;
let lastConnectionFailureMessage = "";

declare global {
    var mongoose: MongooseConnection | undefined;
}

const cached: MongooseConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

export class MongoConnectionUnavailableError extends Error {
    code?: string;

    constructor(message: string, options?: { cause?: unknown; code?: string }) {
        super(message);
        this.name = "MongoConnectionUnavailableError";
        this.code = options?.code;
        if (options?.cause !== undefined) {
            Object.defineProperty(this, "cause", {
                configurable: true,
                enumerable: false,
                value: options.cause,
                writable: true,
            });
        }
    }
}

function getMongoErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "Unknown MongoDB connection error";
}

function normalizeMongoErrorMessage(message: string): string {
    return message.replace(/^Failed to connect to MongoDB:\s*/i, "");
}

function getMongoErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== "object") {
        return undefined;
    }

    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
        return code;
    }

    if (typeof code === "number") {
        return String(code);
    }

    return undefined;
}

function createMongoConnectionUnavailableError(error: unknown): MongoConnectionUnavailableError {
    if (error instanceof MongoConnectionUnavailableError) {
        return error;
    }

    const message = normalizeMongoErrorMessage(getMongoErrorMessage(error));
    const code = getMongoErrorCode(error);

    return new MongoConnectionUnavailableError(
        `Failed to connect to MongoDB: ${message}`,
        { cause: error, code }
    );
}

export function isMongoConnectionIssue(error: unknown): boolean {
    if (error instanceof MongoConnectionUnavailableError) {
        return true;
    }

    if (!error || typeof error !== "object") {
        return false;
    }

    const err = error as Record<string, unknown>;
    const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
    const name = typeof err.name === "string" ? err.name.toLowerCase() : "";
    const code = typeof err.code === "string" ? err.code.toLowerCase() : "";

    const patterns = [
        "mongodb",
        "mongoose",
        "querysrv",
        "etimedout",
        "server selection timed out",
        "server selection error",
        "replicasetnoprimary",
        "topology was destroyed",
        "network error",
        "tlsv1 alert internal error",
        "ssl alert number 80",
    ];

    return (
        patterns.some((pattern) => message.includes(pattern)) ||
        patterns.some((pattern) => name.includes(pattern)) ||
        patterns.some((pattern) => code.includes(pattern))
    );
}

function withMongoConnectionDeadline<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
            const timeoutError = new Error(
                `connection attempt timed out after ${PRIMARY_DB_CONNECT_DEADLINE_MS}ms`
            ) as Error & { code?: string };
            timeoutError.code = "ETIMEOUT";
            reject(timeoutError);
        }, PRIMARY_DB_CONNECT_DEADLINE_MS);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timer) {
            clearTimeout(timer);
        }
    });
}

export async function connectMongo() {
    const readyState = mongoose.connection.readyState;

    if (readyState === 1) {
        cached.conn = mongoose;
        return cached.conn;
    }

    if (readyState === 2 && cached.promise) {
        cached.conn = await cached.promise;
        return cached.conn;
    }

    if (readyState === 0 || readyState === 3) {
        cached.conn = null;
        cached.promise = null;
    }

    if (
        lastConnectionFailureAt > 0 &&
        Date.now() - lastConnectionFailureAt < PRIMARY_DB_RETRY_COOLDOWN_MS
    ) {
        throw new MongoConnectionUnavailableError(
            `Failed to connect to MongoDB: ${lastConnectionFailureMessage || "recent connection attempt failed"}`,
        );
    }

    if (!cached.promise) {
        const conservativePoolProfile = shouldUseConservativeMongoPoolProfile();
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: conservativePoolProfile ? 5000 : 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: conservativePoolProfile ? 8000 : 10000,
            // TLS/SSL configuration for MongoDB Atlas
            tls: true,
            tlsInsecure: false, // Validate certificates properly
            // Retry configuration for transient failures
            retryWrites: true,
            // Connection pool configuration
            maxPoolSize: conservativePoolProfile ? 3 : 10,
            minPoolSize: 0,
            maxIdleTimeMS: conservativePoolProfile ? 30000 : 60000,
            maxConnecting: conservativePoolProfile ? 2 : 4,
        };

        console.log("Attempting to connect to MongoDB...");

        const connectAttempt = withMongoConnectionDeadline(mongoose.connect(mongoUri, opts));

        cached.promise = connectAttempt
            .then((mongooseInstance) => {
                lastConnectionFailureAt = 0;
                lastConnectionFailureMessage = "";
                console.log("MongoDB connected successfully");
                return mongooseInstance;
            })
            .catch((error) => {
                lastConnectionFailureAt = Date.now();
                lastConnectionFailureMessage = normalizeMongoErrorMessage(getMongoErrorMessage(error));
                console.warn("MongoDB connection attempt failed:", lastConnectionFailureMessage);
                void mongoose.disconnect().catch(() => {
                    // Best effort cleanup after a timed out or failed connection attempt.
                });
                throw createMongoConnectionUnavailableError(error);
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error: unknown) {
        cached.conn = null;
        cached.promise = null;
        const wrappedError = error instanceof MongoConnectionUnavailableError
            ? error
            : createMongoConnectionUnavailableError(error);
        lastConnectionFailureAt = Date.now();
        lastConnectionFailureMessage = wrappedError.message.replace(/^Failed to connect to MongoDB:\s*/, "");
        console.warn("Failed to establish MongoDB connection:", wrappedError.message);
        throw wrappedError;
    }

    return cached.conn;
}

/**
 * Returns true if the given MongoDB/Mongoose error is a transient connection
 * error that is safe to retry (network blip, timeout, pool exhausted…).
 *
 * Used by the pipeline DB retry loop in ai-blogger-pipeline-events.ts so that
 * permanent errors (e.g. auth failures) are NOT retried.
 */
export function isTransientMongoConnectionError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
        return false;
    }

    const err = error as Record<string, unknown>;
    const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
    const code = typeof err.code === "number" ? err.code : -1;

    // Mongoose / MongoDB driver transient error codes & message patterns.
    const transientCodes = new Set([
        6,     // HostUnreachable
        7,     // HostNotFound
        89,    // NetworkTimeout
        91,    // ShutdownInProgress
        189,   // PrimarySteppedDown
        9001,  // SocketException
        10107, // NotMaster
        11600, // InterruptedAtShutdown
        11602, // InterruptedDueToReplStateChange
        13435, // NotMasterNoSlaveOk
        13436, // NotMasterOrSecondary
    ]);

    if (transientCodes.has(code)) {
        return true;
    }

    const transientPatterns = [
        "econnreset",
        "econnrefused",
        "etimedout",
        "querysrv",
        "enotfound",
        "buffering timed out",
        "server selection timed out",
        "server selection error",
        "topology was destroyed",
        "connection pool",
        "network error",
        "replicasetnoprimary",
        "tlsv1 alert internal error",
        "ssl alert number 80",
    ];

    return transientPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Close all mongoose connections gracefully.
 * Called by cleanup code in the workflow runtime before the serverless
 * function exits to free the connection pool.
 */
export async function closeMongoConnections(opts?: { force?: boolean }): Promise<void> {
    try {
        await mongoose.disconnect();
        cached.conn = null;
        cached.promise = null;
        lastConnectionFailureAt = 0;
        lastConnectionFailureMessage = "";
    } catch (error) {
        if (opts?.force) {
            // Swallow errors in force-close mode.
            return;
        }
        throw error;
    }
}

/**
 * Returns true when running in a short-lived serverless execution context
 * (Vercel, AWS Lambda, etc.) and the MongoDB connection pool should be kept
 * as small as possible to avoid connection exhaustion.
 */
export function shouldUseConservativeMongoPoolProfile(): boolean {
    // VERCEL is set automatically on Vercel deployments.
    // AWS_LAMBDA_FUNCTION_NAME is set automatically in Lambda.
    return Boolean(
        process.env.VERCEL ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.SERVERLESS
    );
}
