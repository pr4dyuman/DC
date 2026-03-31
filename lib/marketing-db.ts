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

/**
 * Connects to the marketing blog MongoDB database
 * Handles connection pooling and caching
 */
export default async function dbConnect(): Promise<mongoose.Connection> {
    if (cachedConnection && cachedConnection.readyState === 1) {
        return cachedConnection;
    }

    if (!MARKETING_DB_URI) {
        throw new Error(
            "Marketing blog database URI not configured. " +
            "Please set MARKETING_DB_URI or MONGODB_URI environment variable."
        );
    }

    try {
        const conn = await mongoose.connect(MARKETING_DB_URI, {
            dbName: "marketing-blog",
            // Connection options for production stability
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        cachedConnection = conn.connection;
        console.debug("[Marketing DB] Connected to marketing blog database");
        return cachedConnection;
    } catch (error) {
        console.error("[Marketing DB] Connection failed:", error);
        throw new Error(
            `Failed to connect to marketing blog database: ${error instanceof Error ? error.message : String(error)}`
        );
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
        console.debug("[Marketing DB] Disconnected from marketing blog database");
    }
}
