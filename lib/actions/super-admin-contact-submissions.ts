"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/marketing-db";
import Contact from "@/models/marketing/Contact";
import { sanitizeString } from "@/lib/validation";
import { verifySuperAdmin } from "./super-admin-shared";

export type ContactEmailStatus = "pending" | "sent" | "failed" | "skipped";

export type ContactSubmission = {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    message: string;
    source: string;
    userEmailStatus: ContactEmailStatus;
    adminEmailStatus: ContactEmailStatus;
    emailError: string;
    readAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ContactSubmissionFilters = {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: "all" | "unread" | "email_failed";
};

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePage(value: unknown, fallback: number) {
    const page = Number(value);
    return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : fallback;
}

function toSubmission(contact: Record<string, unknown>): ContactSubmission {
    return {
        id: String(contact._id || ""),
        fullName: String(contact.fullName || ""),
        email: String(contact.email || ""),
        phone: String(contact.phone || ""),
        companyName: String(contact.companyName || ""),
        message: String(contact.message || ""),
        source: String(contact.source || "contact_page"),
        userEmailStatus: normalizeEmailStatus(contact.userEmailStatus),
        adminEmailStatus: normalizeEmailStatus(contact.adminEmailStatus),
        emailError: String(contact.emailError || ""),
        readAt: contact.readAt ? new Date(String(contact.readAt)).toISOString() : null,
        createdAt: contact.createdAt ? new Date(String(contact.createdAt)).toISOString() : "",
        updatedAt: contact.updatedAt ? new Date(String(contact.updatedAt)).toISOString() : "",
    };
}

function normalizeEmailStatus(value: unknown): ContactEmailStatus {
    return value === "sent" || value === "failed" || value === "skipped" || value === "pending"
        ? value
        : "pending";
}

function buildContactQuery(filters: ContactSubmissionFilters) {
    const query: Record<string, unknown> = {};

    if (filters.status === "unread") {
        query.readAt = { $exists: false };
    }

    if (filters.status === "email_failed") {
        query.$or = [
            { userEmailStatus: "failed" },
            { adminEmailStatus: "failed" },
        ];
    }

    const search = sanitizeString(filters.search || "", 120).trim();
    if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");
        const searchOr = [
            { fullName: pattern },
            { email: pattern },
            { phone: pattern },
            { companyName: pattern },
            { message: pattern },
        ];

        if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: searchOr }];
            delete query.$or;
        } else {
            query.$or = searchOr;
        }
    }

    return query;
}

export async function getContactSubmissions(filters: ContactSubmissionFilters = {}) {
    await verifySuperAdmin();
    await dbConnect();

    const page = normalizePage(filters.page, 1);
    const pageSize = Math.min(100, Math.max(10, normalizePage(filters.pageSize, 25)));
    const query = buildContactQuery(filters);

    const [total, contacts] = await Promise.all([
        Contact.countDocuments(query),
        Contact.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
    ]);

    return {
        submissions: contacts.map((contact: Record<string, unknown>) => toSubmission(contact)),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}

export async function getContactSubmissionStats() {
    await verifySuperAdmin();
    await dbConnect();

    const [total, unread, emailFailures] = await Promise.all([
        Contact.countDocuments({}),
        Contact.countDocuments({ readAt: { $exists: false } }),
        Contact.countDocuments({
            $or: [
                { userEmailStatus: "failed" },
                { adminEmailStatus: "failed" },
            ],
        }),
    ]);

    return { total, unread, emailFailures };
}

export async function markContactSubmissionRead(id: string) {
    await verifySuperAdmin();
    await dbConnect();

    await Contact.updateOne(
        { _id: id },
        { $set: { readAt: new Date() } },
    );

    revalidatePath("/super-admin/contact-submissions");
}
