/**
 * Marketing Blog Database Connection
 *
 * This module provides database connection to the marketing blog MongoDB database.
 * Used by AI Blogger to:
 * 1. Query published blog posts for internal link candidates
 * 2. Update marketing blog posts with metadata when publishing
 */

import mongoose from "mongoose";
import { shouldUseConservativeMongoPoolProfile } from "./mongodb-connection";

const MARKETING_DB_URI = process.env.MARKETING_DB_URI || process.env.MONGODB_URI;

if (!MARKETING_DB_URI) {
    console.warn("[Marketing DB] Warning: MARKETING_DB_URI not configured, falling back to MONGODB_URI");
}

let cachedConnection: mongoose.Connection | null = null;
let cachedConnectionPromise: Promise<mongoose.Connection> | null = null;
let lastConnectionFailureAt = 0;
let lastConnectionFailureMessage = "";

const MARKETING_DB_RETRY_COOLDOWN_MS = 15_000;
const MARKETING_DB_CONNECT_DEADLINE_MS = 12_000;

function withMarketingConnectionDeadline<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
            const timeoutError = new Error(
                `connection attempt timed out after ${MARKETING_DB_CONNECT_DEADLINE_MS}ms`
            ) as Error & { code?: string };
            timeoutError.code = "ETIMEOUT";
            reject(timeoutError);
        }, MARKETING_DB_CONNECT_DEADLINE_MS);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timer) {
            clearTimeout(timer);
        }
    });
}

function getMarketingConnectionOptions(): mongoose.ConnectOptions {
    if (!MARKETING_DB_URI) {
        throw new Error(
            "Marketing blog database URI not configured. " +
            "Please set MARKETING_DB_URI or MONGODB_URI environment variable."
        );
    }

    const conservativePoolProfile = shouldUseConservativeMongoPoolProfile();

    return {
        dbName: "marketing-blog",
        // Fail fast instead of buffering queries on a half-open connection.
        bufferCommands: false,
        // Connection options for production stability
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
}

function createMarketingConnectionHandle() {
    return mongoose.createConnection();
}

function createMarketingConnectionPromise(
    connection: mongoose.Connection,
    options: { startConnection: boolean } = { startConnection: true }
): Promise<mongoose.Connection> {
    const connectionAttempt = options.startConnection
        ? connection.openUri(MARKETING_DB_URI!, getMarketingConnectionOptions())
        : connection.asPromise();

    const promise = withMarketingConnectionDeadline(connectionAttempt).then(() => {
        lastConnectionFailureAt = 0;
        lastConnectionFailureMessage = "";
        console.debug("[Marketing DB] Connected to marketing blog database");
        return connection;
    }).catch((error) => {
        if (cachedConnection === connection) {
            cachedConnection = null;
        }
        if (cachedConnectionPromise === promise) {
            cachedConnectionPromise = null;
        }
        lastConnectionFailureAt = Date.now();
        lastConnectionFailureMessage = error instanceof Error ? error.message : String(error);
        console.warn("[Marketing DB] Connection attempt failed:", lastConnectionFailureMessage);
        throw new Error(
            `Failed to connect to marketing blog database: ${error instanceof Error ? error.message : String(error)}`
        );
    });

    return promise;
}

function getOrCreateMarketingConnectionHandle(): mongoose.Connection {
    if (!cachedConnection) {
        cachedConnection = createMarketingConnectionHandle();
    }

    return cachedConnection;
}

function ensureMarketingConnectionStarted(): Promise<mongoose.Connection> {
    let connection = getOrCreateMarketingConnectionHandle();

    if (connection.readyState === 3) {
        cachedConnection = createMarketingConnectionHandle();
        cachedConnectionPromise = null;
        connection = cachedConnection;
    }

    if (connection.readyState === 2) {
        if (!cachedConnectionPromise) {
            cachedConnectionPromise = createMarketingConnectionPromise(connection, {
                startConnection: false,
            });
        }
        return cachedConnectionPromise;
    }

    if (connection.readyState === 1) {
        return Promise.resolve(connection);
    }

    if (!cachedConnectionPromise) {
        cachedConnectionPromise = createMarketingConnectionPromise(connection);
    }

    return cachedConnectionPromise;
}

/**
 * Returns the shared marketing DB connection handle synchronously.
 * This is used by models so they bind to the correct database even
 * before a route explicitly awaits the connection.
 */
export function getMarketingDbConnectionHandle(): mongoose.Connection {
    return getOrCreateMarketingConnectionHandle();
}

/**
 * Connects to the marketing blog MongoDB database
 * Handles connection pooling and caching
 */
export default async function dbConnect(): Promise<mongoose.Connection> {
    if (cachedConnection && cachedConnection.readyState === 1) {
        return cachedConnection;
    }

    if (cachedConnection && cachedConnection.readyState === 3) {
        cachedConnection = null;
        cachedConnectionPromise = null;
    }

    if (
        lastConnectionFailureAt > 0 &&
        Date.now() - lastConnectionFailureAt < MARKETING_DB_RETRY_COOLDOWN_MS
    ) {
        throw new Error(
            `Failed to connect to marketing blog database: ${lastConnectionFailureMessage || "recent connection attempt failed"}`
        );
    }

    try {
        cachedConnection = await ensureMarketingConnectionStarted();
        return cachedConnection;
    } catch (error) {
        throw error instanceof Error
            ? error
            : new Error(`Failed to connect to marketing blog database: ${String(error)}`);
    }
}

/**
 * Gets the current connection status
 */
export function isConnected(): boolean {
    return cachedConnection?.readyState === 1;
}

/**
 * Closes the marketing database connection (for cleanup/shutdown)
 */
export async function closeConnection(): Promise<void> {
    if (cachedConnection) {
        await cachedConnection.close();
        cachedConnection = null;
        cachedConnectionPromise = null;
        console.debug("[Marketing DB] Disconnected from marketing blog database");
    }
}
