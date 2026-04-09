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

declare global {
    var mongoose: MongooseConnection | undefined;
}

const cached: MongooseConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

export async function connectMongo() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            // TLS/SSL configuration for MongoDB Atlas
            tls: true,
            tlsInsecure: false, // Validate certificates properly
            // Retry configuration for transient failures
            retryWrites: true,
            // Connection pool configuration
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 60000,
        };

        console.log("Attempting to connect to MongoDB...");

        cached.promise = mongoose.connect(mongoUri, opts)
            .then((mongooseInstance) => {
                console.log("MongoDB connected successfully");
                return mongooseInstance;
            })
            .catch((error) => {
                console.error("MongoDB connection error:", error.message);
                throw error;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error: unknown) {
        cached.promise = null;
        console.error("Failed to establish MongoDB connection:", error instanceof Error ? error.message : String(error));
        throw error;
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
        "enotfound",
        "buffering timed out",
        "server selection timed out",
        "topology was destroyed",
        "connection pool",
        "network error",
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
