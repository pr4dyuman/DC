/**
 * Marketing Blog Database Connection
 *
 * This module provides database connection to the marketing blog MongoDB database.
 * Used by AI Blogger to:
 * 1. Query published blog posts for internal link candidates
 * 2. Update marketing blog posts with metadata when publishing
 */

import mongoose from "mongoose";

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

    return mongoose.createConnection(MARKETING_DB_URI, {
        dbName: "marketing-blog",
        // Connection options for production stability
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
    });
}

/**
 * Returns the shared marketing DB connection handle synchronously.
 * This is used by models so they bind to the correct database even
 * before a route explicitly awaits the connection.
 */
export function getMarketingDbConnectionHandle(): mongoose.Connection {
    if (cachedConnection) {
        return cachedConnection;
    }

    const connection = createMarketingConnection();
    cachedConnection = connection;
    return connection;
}

/**
 * Connects to the marketing blog MongoDB database
 * Handles connection pooling and caching
 */
export default async function dbConnect(): Promise<mongoose.Connection> {
    if (cachedConnection && cachedConnection.readyState === 1) {
        return cachedConnection;
    }

    try {
        if (!cachedConnectionPromise) {
            const connection = getMarketingDbConnectionHandle();
            cachedConnectionPromise = connection.asPromise().then(() => {
                console.debug("[Marketing DB] Connected to marketing blog database");
                return connection;
            }).catch((error) => {
                cachedConnectionPromise = null;
                cachedConnection = null;
                console.error("[Marketing DB] Connection failed:", error);
                throw new Error(
                    `Failed to connect to marketing blog database: ${error instanceof Error ? error.message : String(error)}`
                );
            });
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
