"use server";

import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { getSessionUser } from "@/lib/auth";

interface AuditLogEntry {
  _id?: string;
  blogId: string;
  action: "create" | "update" | "publish" | "unpublish" | "delete";
  userId: string;
  userEmail?: string;
  timestamp: Date;
  changes?: {
    field: string;
    before?: unknown;
    after?: unknown;
  }[];
  description: string;
}

type StoredAuditLogEntry = Omit<AuditLogEntry, "_id"> & {
  _id: mongoose.Types.ObjectId;
};

/**
 * Log blog change to audit trail
 */
export async function logBlogAuditChange(
  blogId: string,
  action: AuditLogEntry["action"],
  description: string,
  changes?: AuditLogEntry["changes"]
) {
  try {
    await connectDB();

    // Get current user from Auth0 session
    let userId = "system";
    const userEmail = undefined;

    try {
      const session = await getSessionUser();
      if (session?.userId) {
        userId = session.userId;
      }
    } catch {
      // Session not available, use default
    }

    // Get or create audit log collection
    const db = mongoose.connection.db;
    if (!db) {
      console.warn("Database connection not available for audit logging");
      return;
    }

    const auditCollection = db.collection<Omit<StoredAuditLogEntry, "_id">>("blog_audit_logs");

    // Insert audit log entry
    const logEntry: Omit<StoredAuditLogEntry, "_id"> = {
      blogId,
      action,
      userId,
      userEmail,
      timestamp: new Date(),
      changes,
      description,
    };

    await auditCollection.insertOne(logEntry);
  } catch (error) {
    console.error("Error logging blog audit change:", error);
    // Don't throw - audit logging should not block operations
  }
}

/**
 * Get audit history for a blog
 */
export async function getBlogAuditHistory(
  blogId: string,
  limit: number = 20
): Promise<AuditLogEntry[]> {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      return [];
    }

    const auditCollection = db.collection<StoredAuditLogEntry>("blog_audit_logs");

    const logs = await auditCollection
      .find({ blogId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs.map((log) => ({
      _id: log._id?.toString(),
      blogId: log.blogId,
      action: log.action as AuditLogEntry["action"],
      userId: log.userId,
      userEmail: log.userEmail,
      timestamp: new Date(log.timestamp),
      changes: log.changes,
      description: log.description,
    }));
  } catch (error) {
    console.error("Error fetching blog audit history:", error);
    return [];
  }
}

/**
 * Get system-wide blog audit logs
 */
export async function getSystemBlogAuditLogs(
  limit: number = 100,
  skip: number = 0
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      return { logs: [], total: 0 };
    }

    const auditCollection = db.collection<StoredAuditLogEntry>("blog_audit_logs");

    const [logs, total] = await Promise.all([
      auditCollection
        .find({})
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      auditCollection.countDocuments(),
    ]);

    return {
      logs: logs.map((log) => ({
        _id: log._id?.toString(),
        blogId: log.blogId,
        action: log.action as AuditLogEntry["action"],
        userId: log.userId,
        userEmail: log.userEmail,
        timestamp: new Date(log.timestamp),
        changes: log.changes,
        description: log.description,
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching system blog audit logs:", error);
    return { logs: [], total: 0 };
  }
}

/**
 * Clear old audit logs (older than specified days)
 */
export async function clearOldBlogAuditLogs(days: number = 90): Promise<number> {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      return 0;
    }

    const auditCollection = db.collection("blog_audit_logs");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await auditCollection.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount;
  } catch (error) {
    console.error("Error clearing blog audit logs:", error);
    return 0;
  }
}
