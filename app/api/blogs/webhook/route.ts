/**
 * Webhook Receiver for AI Blogger
 * Receives published blogs from AI Blogger system and stores them locally
 */

import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import dbConnect from "@/lib/marketing-db";
import { decryptApiKey } from "@/lib/mongodb";
import Blog from "@/models/marketing/Blog";

/**
 * Type for incoming webhook payload
 */
type IncomingWebhookPayload = {
    event: string;
    blog: {
        id?: string;
        title: string;
        slug: string;
        content: string;
        excerpt: string;
        metaTitle: string;
        metaDescription: string;
        canonicalUrl: string;
        image: string;
        imageAlt: string;
        schemaMarkup?: string;
        category?: string;
        internalLinks?: Array<{
            href: string;
            title: string;
            anchorText: string;
            source: string;
            relationType: string;
            score: number;
        }>;
        contentClusterId?: string;
        parentTopicSlug?: string;
        publishedAt: string;
    };
    source?: {
        agencyId?: string;
        agencyName?: string;
        publishedAt?: string;
    };
};

function hasNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function isValidDateString(value: string): boolean {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
}

let cachedMainMongoClientPromise: Promise<MongoClient> | null = null;

function getPresentedWebhookSecret(request: NextRequest) {
    const headerSecret = request.headers.get("x-ai-blogger-webhook-secret")?.trim() || "";
    const authorizationHeader = request.headers.get("authorization") || "";
    const bearerToken = authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice("Bearer ".length).trim()
        : "";

    return headerSecret || bearerToken;
}

function getWebhookAgencyId(request: NextRequest, payload?: unknown) {
    const headerAgencyId = request.headers.get("x-ai-blogger-agency-id")?.trim() || "";
    if (headerAgencyId) {
        return headerAgencyId;
    }

    const queryAgencyId = request.nextUrl.searchParams.get("agencyId")?.trim() || "";
    if (queryAgencyId) {
        return queryAgencyId;
    }

    if (payload && typeof payload === "object" && "source" in payload) {
        const source = (payload as { source?: { agencyId?: unknown } }).source;
        if (source && hasNonEmptyString(source.agencyId)) {
            return source.agencyId.trim();
        }
    }

    return "";
}

function getPrimaryDatabaseName() {
    const mongoUri = process.env.MONGODB_URI?.trim();
    if (!mongoUri) {
        return "";
    }

    try {
        const parsed = new URL(mongoUri);
        return parsed.pathname.replace(/^\/+/, "").trim();
    } catch {
        return "";
    }
}

async function getMainMongoClient() {
    const mongoUri = process.env.MONGODB_URI?.trim();
    if (!mongoUri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    if (!cachedMainMongoClientPromise) {
        const client = new MongoClient(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });
        cachedMainMongoClientPromise = client.connect().catch((error) => {
            cachedMainMongoClientPromise = null;
            throw error;
        });
    }

    return cachedMainMongoClientPromise;
}

async function getStoredWebhookSecretForAgency(agencyId: string) {
    const normalizedAgencyId = agencyId.trim();
    if (!normalizedAgencyId) {
        return "";
    }

    try {
        const client = await getMainMongoClient();
        const databaseName = getPrimaryDatabaseName();
        const db = databaseName ? client.db(databaseName) : client.db();
        const settings = await db.collection("blogstudiosettings").findOne(
            { agencyId: normalizedAgencyId },
            {
                projection: {
                    _id: 0,
                    "publishing.defaultTarget.webhookConfig.secret": 1,
                },
            },
        );
        const storedSecret = (settings as {
            publishing?: {
                defaultTarget?: {
                    webhookConfig?: {
                        secret?: unknown;
                    };
                };
            };
        } | null)?.publishing?.defaultTarget?.webhookConfig?.secret;

        return hasNonEmptyString(storedSecret) ? decryptApiKey(storedSecret.trim()) : "";
    } catch (error) {
        console.warn("[Webhook] Failed to load stored agency secret", {
            agencyId: normalizedAgencyId,
            error: error instanceof Error ? error.message : String(error),
        });
        return "";
    }
}

function secretsMatch(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

async function authorizeWebhookRequest(request: NextRequest, payload?: unknown) {
    const presentedSecret = getPresentedWebhookSecret(request);
    if (!presentedSecret) {
        return {
            ok: false,
            status: 401,
            message: "Missing webhook secret.",
        };
    }

    const expectedSecrets = new Set<string>();
    const envSecret = process.env.AI_BLOGGER_WEBHOOK_SECRET?.trim();
    if (envSecret) {
        expectedSecrets.add(envSecret);
    }

    const agencyId = getWebhookAgencyId(request, payload);
    if (agencyId) {
        const storedSecret = await getStoredWebhookSecretForAgency(agencyId);
        if (storedSecret) {
            expectedSecrets.add(storedSecret);
        }
    }

    if (expectedSecrets.size === 0) {
        return {
            ok: false,
            status: 503,
            message: "AI Blogger webhook secret is not configured.",
        };
    }

    for (const expectedSecret of expectedSecrets) {
        if (secretsMatch(presentedSecret, expectedSecret)) {
            return { ok: true, status: 200, message: "" };
        }
    }

    return {
        ok: false,
        status: 401,
        message: "Unauthorized webhook request",
    };
}

/**
 * Validates webhook payload structure
 */
function validateWebhookPayload(payload: unknown): payload is IncomingWebhookPayload {
    if (!payload || typeof payload !== "object") {
        return false;
    }

    const p = payload as Record<string, unknown>;

    // Check required top-level fields
    if (typeof p.event !== "string" || !p.blog || typeof p.blog !== "object") {
        return false;
    }

    const blog = p.blog as Record<string, unknown>;

    // Check required blog fields
    const requiredStringFields = ["title", "slug", "content", "excerpt", "metaTitle", "metaDescription", "image", "publishedAt"];
    if (!requiredStringFields.every((field) => hasNonEmptyString(blog[field]))) {
        return false;
    }

    if (!isValidDateString(blog.publishedAt as string)) {
        return false;
    }

    // Validate slug format (no spaces, lowercase recommended)
    if (typeof blog.slug === "string" && !/^[a-z0-9-]+$/.test(blog.slug)) {
        console.warn("[Webhook] Slug has unexpected format:", blog.slug);
    }

    return true;
}

/**
 * POST /api/blogs/webhook
 * Receives blog from AI Blogger and stores locally
 */
export async function POST(request: NextRequest) {
    try {
        const startTime = Date.now();

        // Parse request body
        let payload: unknown;
        try {
            payload = await request.json();
        } catch (e) {
            console.warn("[Webhook] Invalid JSON payload", e);
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const auth = await authorizeWebhookRequest(request, payload);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.message }, { status: auth.status });
        }

        // Validate payload structure
        if (!validateWebhookPayload(payload)) {
            console.warn("[Webhook] Invalid payload structure", payload);
            return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
        }

        // Log incoming webhook
        console.log("[Webhook] Received blog", {
            event: payload.event,
            title: payload.blog.title,
            slug: payload.blog.slug,
            source: payload.source?.agencyName || "Unknown",
        });

        // Connect to database
        await dbConnect();

        // Check if blog already exists by slug
        const existingBlog = await Blog.findOne({ slug: payload.blog.slug });
        const isUpdate = !!existingBlog;

        // Prepare blog data
        const blogData = {
            title: payload.blog.title,
            slug: payload.blog.slug,
            content: payload.blog.content,
            image: payload.blog.image,
            imageAlt: payload.blog.imageAlt || payload.blog.title,
            shortDescription: payload.blog.excerpt,
            category: payload.blog.category || "AI Blogger",
            status: "published",
            metaKeywords: "",
            metaTitle: payload.blog.metaTitle,
            metaDescription: payload.blog.metaDescription,
            canonicalUrl: payload.blog.canonicalUrl,
            schemaMarkup: payload.blog.schemaMarkup,
            internalLinks: payload.blog.internalLinks || [],
            contentClusterId: payload.blog.contentClusterId,
            parentTopicSlug: payload.blog.parentTopicSlug,
            publishedAt: new Date(payload.blog.publishedAt),
            updatedAt: new Date(),
        };

        let savedBlog;

        if (isUpdate) {
            // Update existing blog
            savedBlog = await Blog.findOneAndUpdate({ slug: payload.blog.slug }, blogData, { returnDocument: 'after' });
            console.log("[Webhook] Updated blog", {
                slug: payload.blog.slug,
                duration: `${Date.now() - startTime}ms`,
            });
        } else {
            // Create new blog
            savedBlog = await Blog.create(blogData);
            console.log("[Webhook] Created blog", {
                slug: payload.blog.slug,
                duration: `${Date.now() - startTime}ms`,
            });
        }

        // Revalidate blog pages for ISR (Incremental Static Regeneration)
        try {
            revalidatePath("/blog");
            revalidatePath(`/blog/${payload.blog.slug}`);
            console.log("[Webhook] Revalidated paths", { slug: payload.blog.slug });
        } catch (revalidateError) {
            console.warn("[Webhook] Revalidation failed (non-blocking)", revalidateError);
            // Non-blocking error - don't fail the response
        }

        // Return success response
        return NextResponse.json(
            {
                success: true,
                message: isUpdate ? "Blog updated successfully" : "Blog created successfully",
                blog: {
                    id: savedBlog._id.toString(),
                    slug: savedBlog.slug,
                    title: savedBlog.title,
                    status: savedBlog.status,
                },
                processingTime: `${Date.now() - startTime}ms`,
            },
            { status: isUpdate ? 200 : 201 },
        );
    } catch (error) {
        console.error("[Webhook] Error processing webhook", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            {
                success: false,
                error: "Failed to process webhook",
                details: errorMessage,
            },
            { status: 500 },
        );
    }
}

/**
 * GET /api/blogs/webhook
 * Health check endpoint for verifying webhook receiver is working
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await authorizeWebhookRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.message }, { status: auth.status });
        }

        await dbConnect();

        return NextResponse.json(
            {
                status: "ok",
                service: "AI Blogger Webhook Receiver",
                database: "connected",
                timestamp: new Date().toISOString(),
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("[Webhook] Health check failed", error);

        return NextResponse.json(
            {
                status: "error",
                service: "AI Blogger Webhook Receiver",
                database: "disconnected",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 503 },
        );
    }
}
