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

function createMarketingConnection() {
    if (!MARKETING_DB_URI) {
        throw new Error(
            "Marketing blog database URI not configured. " +
            "Please set MARKETING_DB_URI or MONGODB_URI environment variable."
        );
    }

    const conservativePoolProfile = shouldUseConservativeMongoPoolProfile();

    return mongoose.createConnection(MARKETING_DB_URI, {
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
    });
}

function createMarketingConnectionPromise(connection: mongoose.Connection): Promise<mongoose.Connection> {
    const promise = connection.asPromise().then(() => {
        console.debug("[Marketing DB] Connected to marketing blog database");
        return connection;
    }).catch((error) => {
        if (cachedConnection === connection) {
            cachedConnection = null;
        }
        if (cachedConnectionPromise === promise) {
            cachedConnectionPromise = null;
        }
        console.error("[Marketing DB] Connection failed:", error);
        throw new Error(
            `Failed to connect to marketing blog database: ${error instanceof Error ? error.message : String(error)}`
        );
    });

    return promise;
}

function ensureMarketingConnectionStarted(): mongoose.Connection {
    if (cachedConnection && cachedConnection.readyState !== 0 && cachedConnection.readyState !== 3) {
        if (cachedConnection.readyState === 2 && !cachedConnectionPromise) {
            cachedConnectionPromise = createMarketingConnectionPromise(cachedConnection);
        }
        return cachedConnection;
    }

    const connection = createMarketingConnection();
    cachedConnection = connection;
    cachedConnectionPromise = createMarketingConnectionPromise(connection);
    return connection;
}

/**
 * Returns the shared marketing DB connection handle synchronously.
 * This is used by models so they bind to the correct database even
 * before a route explicitly awaits the connection.
 */
export function getMarketingDbConnectionHandle(): mongoose.Connection {
    return ensureMarketingConnectionStarted();
}

/**
 * Connects to the marketing blog MongoDB database
 * Handles connection pooling and caching
 */
export default async function dbConnect(): Promise<mongoose.Connection> {
    if (cachedConnection && cachedConnection.readyState === 1) {
        return cachedConnection;
    }

    if (cachedConnection && (cachedConnection.readyState === 0 || cachedConnection.readyState === 3)) {
        cachedConnection = null;
        cachedConnectionPromise = null;
    }

    try {
        if (!cachedConnectionPromise) {
            const connection = ensureMarketingConnectionStarted();
            cachedConnectionPromise = createMarketingConnectionPromise(connection);
        }

        cachedConnection = await cachedConnectionPromise;
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
