/**
 * Webhook Receiver for AI Blogger
 * Receives published blogs from AI Blogger system and stores them locally
 */

import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import dbConnect from "@/lib/marketing-db";
import { stripStandaloneFaqSection } from "@/lib/marketing-blog-content";
import { normalizeMarketingCanonicalUrl, normalizeMarketingImageSrc } from "@/lib/marketing-blog-utils";
import { decryptApiKey } from "@/lib/mongodb";
import Blog from "@/models/marketing/Blog";
import BlogPublishingAudit from "@/models/marketing/BlogPublishingAudit";

/**
 * Type for incoming webhook payload
 */
type IncomingWebhookPayload = {
    event: string;
    blog: {
        id: string;
        title: string;
        slug: string;
        content: string;
        excerpt: string;
        metaKeywords?: string;
        metaTitle: string;
        metaDescription: string;
        canonicalUrl: string;
        image?: string;
        imageAlt?: string;
        schemaMarkup?: string;
        category?: string;
        faqItems?: Array<{
            question?: string;
            answer?: string;
        }>;
        externalSources?: Array<{
            id?: string;
            title?: string;
            url?: string;
            domain?: string;
            summary?: string;
            type?: string;
            freshness?: string;
            trustLevel?: string;
            publishedAt?: string;
            keyClaims?: string[];
            citationBlock?: string;
        }>;
        peopleAlsoAsk?: string[];
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
        targetKey?: string;
        targetLabel?: string;
        targetWebsiteUrl?: string;
    };
};

const ZSEO_SIGNATURE_WINDOW_MS = 15 * 60 * 1000;

type ZseoPayloadRecord = Record<string, unknown>;

function hasNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is ZseoPayloadRecord {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown, fallback = "") {
    return hasNonEmptyString(value) ? value.trim() : fallback;
}

function getRecord(value: unknown): ZseoPayloadRecord {
    return isRecord(value) ? value : {};
}

function getArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function getNumber(value: unknown, fallback = 0) {
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string"
              ? Number.parseFloat(value)
              : Number.NaN;

    return Number.isFinite(parsed) ? parsed : fallback;
}

function isValidDateString(value: string): boolean {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
}

function normalizeFaqItems(
    items?: Array<{ question?: string; answer?: string }>,
) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map((item) => ({
            question: hasNonEmptyString(item?.question) ? normalizeBrandSpelling(item.question.trim()) : "",
            answer: hasNonEmptyString(item?.answer) ? normalizeBrandSpelling(item.answer.trim()) : "",
        }))
        .filter((item) => item.question && item.answer);
}

function normalizeQuestionList(items?: string[]) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .filter((item) => hasNonEmptyString(item))
        .map((item) => normalizeBrandSpelling(item.trim()))
        .filter(Boolean);
}

function normalizeBrandSpelling(value: string) {
    return value.replace(/\bDigitalcorvids\b(?!\.)/gi, "Digital Corvids");
}

function normalizeExternalSources(
    items?: IncomingWebhookPayload["blog"]["externalSources"],
) {
    if (!Array.isArray(items)) {
        return [];
    }

    const seenUrls = new Set<string>();

    return items
        .map((item) => {
            const url = hasNonEmptyString(item?.url) ? item.url.trim() : "";
            if (!url || seenUrls.has(url)) {
                return null;
            }

            seenUrls.add(url);

            return {
                id: hasNonEmptyString(item?.id) ? item.id.trim() : undefined,
                title: hasNonEmptyString(item?.title) ? item.title.trim() : url,
                url,
                domain: hasNonEmptyString(item?.domain) ? item.domain.trim() : "",
                summary: hasNonEmptyString(item?.summary) ? item.summary.trim() : "",
                type: hasNonEmptyString(item?.type) ? item.type.trim() : "",
                freshness: hasNonEmptyString(item?.freshness) ? item.freshness.trim() : "",
                trustLevel: hasNonEmptyString(item?.trustLevel) ? item.trustLevel.trim() : "",
                publishedAt: hasNonEmptyString(item?.publishedAt) ? item.publishedAt.trim() : "",
                keyClaims: Array.isArray(item?.keyClaims)
                    ? item.keyClaims
                        .filter((claim) => hasNonEmptyString(claim))
                        .map((claim) => claim.trim())
                        .slice(0, 5)
                    : [],
                citationBlock: hasNonEmptyString(item?.citationBlock) ? item.citationBlock.trim() : "",
            };
        })
        .filter((item) => item !== null);
}

function inferInternalLinkSource(href: string): "service" | "page" | "blog" {
    try {
        const parsed = new URL(href, "https://digitalcorvids.com");
        const pathname = parsed.pathname.toLowerCase();

        if (pathname.startsWith("/blog")) {
            return "blog";
        }

        if (pathname.startsWith("/services")) {
            return "service";
        }
    } catch {
        // Fall back to a generic page link below.
    }

    return "page";
}

function normalizeZseoRelationType(
    value: string,
    href: string,
): NonNullable<IncomingWebhookPayload["blog"]["internalLinks"]>[number]["relationType"] {
    const normalized = value.trim().toLowerCase();
    const source = inferInternalLinkSource(href);

    switch (normalized) {
        case "cluster-pillar":
        case "cluster-parent":
            return "cluster-parent";
        case "cluster-support":
        case "cluster-supporting":
            return "cluster-supporting";
        case "pillar-parent":
            return "pillar-parent";
        case "pillar-supporting":
            return "pillar-supporting";
        case "service-authority":
            return "service-authority";
        case "related-reading":
        case "contextual":
            return "related-reading";
        case "site-supporting":
            return "site-supporting";
        case "conversion":
            return source === "service" ? "service-authority" : "related-reading";
        default:
            if (source === "service") {
                return "service-authority";
            }

            return source === "blog" ? "related-reading" : "site-supporting";
    }
}

function getJsonString(value: unknown) {
    if (!value) {
        return undefined;
    }

    if (typeof value === "string") {
        return value.trim() || undefined;
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return undefined;
        }
    }

    return undefined;
}

function collectFaqItemsFromSchemaNode(value: unknown): Array<{ question: string; answer: string }> {
    if (!isRecord(value)) {
        return [];
    }

    const type = value["@type"];
    const types = Array.isArray(type) ? type : [type];
    const isFaqPage = types.some((item) => getString(item).toLowerCase() === "faqpage");

    if (isFaqPage) {
        return getArray(value.mainEntity)
            .map((item) => {
                const question = getRecord(item);
                const acceptedAnswer = getRecord(question.acceptedAnswer);
                const answerText =
                    getString(acceptedAnswer.text) ||
                    getString(acceptedAnswer.answer) ||
                    getString(question.answer);

                return {
                    question: getString(question.name),
                    answer: answerText,
                };
            })
            .filter((item) => item.question && item.answer);
    }

    return [
        ...getArray(value["@graph"]).flatMap(collectFaqItemsFromSchemaNode),
        ...getArray(value.mainEntity).flatMap(collectFaqItemsFromSchemaNode),
    ];
}

function normalizeZseoInternalLinks(
    items: unknown,
): NonNullable<IncomingWebhookPayload["blog"]["internalLinks"]> {
    const seenHrefs = new Set<string>();

    return getArray(items)
        .map((item) => {
            const link = getRecord(item);
            const href = getString(link.targetUrl) || getString(link.href);
            const anchorText = getString(link.anchorText);

            if (!href || !anchorText || seenHrefs.has(href)) {
                return null;
            }

            seenHrefs.add(href);

            return {
                href,
                title: getString(link.targetTitle) || anchorText || href,
                anchorText: anchorText || getString(link.placementText) || href,
                source: inferInternalLinkSource(href),
                relationType: normalizeZseoRelationType(
                    getString(link.relationType),
                    href,
                ),
                score: getNumber(link.score, 0),
                matchReason: getString(link.placementText),
            };
        })
        .filter((link) => link !== null);
}

function normalizeZseoCitations(
    items: unknown,
): NonNullable<IncomingWebhookPayload["blog"]["externalSources"]> {
    return getArray(items)
        .map((item) => {
            const source = getRecord(item);
            const url = getString(source.sourceUrl) || getString(source.url);
            if (!url) {
                return null;
            }

            return {
                id: getString(source.sourceKey) || undefined,
                title: getString(source.sourceTitle) || url,
                url,
                domain: (() => {
                    try {
                        return new URL(url).hostname;
                    } catch {
                        return "";
                    }
                })(),
                summary: getString(source.claimSummary),
                type: "citation",
                freshness: "",
                trustLevel: "",
                publishedAt: "",
                keyClaims: getString(source.claimSummary)
                    ? [getString(source.claimSummary)].slice(0, 1)
                    : [],
                citationBlock: getString(source.citationLabel),
            };
        })
        .filter((source) => source !== null);
}

function isZseoIntegrationTestPayload(payload: unknown) {
    return isRecord(payload) && payload.event === "zseo.integration.test";
}

function isZseoPublishPayload(payload: unknown) {
    return isRecord(payload) && payload.event === "zseo.content.publish";
}

function normalizeZseoPublishPayload(payload: unknown): IncomingWebhookPayload | null {
    if (!isRecord(payload)) {
        return null;
    }

    const content = getRecord(payload.payload);
    const title = getString(content.title);
    const slug = getString(content.slug);
    const canonicalUrl = getString(content.canonicalUrl);
    const bodyHtml = getString(content.bodyHtml);
    const bodyMarkdown = getString(content.bodyMarkdown);
    const contentHtml = bodyHtml || bodyMarkdown;
    const image = getRecord(content.image);
    const imageUrl = getString(image.url);
    const openGraph = getRecord(content.openGraph);
    const publishedAt = new Date().toISOString();

    if (!title || !slug || !canonicalUrl || !contentHtml) {
        return null;
    }

    return {
        event: "blog.published",
        blog: {
            id:
                getString(payload.deliveryHash) ||
                getString(payload.idempotencyKey) ||
                `zseo-${slug}`,
            title,
            slug,
            content: contentHtml,
            excerpt: getString(content.excerpt) || bodyMarkdown.slice(0, 260) || title,
            metaTitle: getString(openGraph.title) || title,
            metaDescription: getString(content.metaDescription),
            canonicalUrl,
            ...(imageUrl
                ? {
                    image: imageUrl,
                    imageAlt: getString(image.altText) || title,
                }
                : {}),
            schemaMarkup: getJsonString(content.schemaJson),
            category: "zSEO Content Studio",
            faqItems: collectFaqItemsFromSchemaNode(content.schemaJson),
            externalSources: normalizeZseoCitations(content.citations),
            peopleAlsoAsk: collectFaqItemsFromSchemaNode(content.schemaJson).map(
                (item) => item.question,
            ),
            internalLinks: normalizeZseoInternalLinks(content.internalLinks),
            contentClusterId: getString(content.contentClusterId) || undefined,
            parentTopicSlug: getString(content.parentTopicSlug) || undefined,
            publishedAt,
        },
        source: {
            agencyId: "zseo",
            agencyName: "zSEO.ai",
            publishedAt,
            targetKey: getString(payload.idempotencyKey),
            targetLabel: "zSEO Content Studio",
            targetWebsiteUrl: (() => {
                try {
                    return new URL(canonicalUrl).origin;
                } catch {
                    return undefined;
                }
            })(),
        },
    };
}

function normalizeIncomingWebhookPayload(payload: unknown): unknown {
    if (isZseoPublishPayload(payload)) {
        return normalizeZseoPublishPayload(payload);
    }

    return payload;
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

function getWebhookTargetKey(request: NextRequest, payload?: unknown) {
    const headerTargetKey = request.headers.get("x-ai-blogger-target-key")?.trim() || "";
    if (headerTargetKey) {
        return headerTargetKey;
    }

    if (payload && typeof payload === "object" && "source" in payload) {
        const source = (payload as { source?: { targetKey?: unknown } }).source;
        if (source && hasNonEmptyString(source.targetKey)) {
            return source.targetKey.trim();
        }
    }

    return "";
}

function normalizeTargetSelectionValue(value: unknown) {
    return hasNonEmptyString(value) ? value.trim().toLowerCase() : "";
}

function targetMatchesSelection(target: {
    externalId?: unknown;
    websiteUrl?: unknown;
    label?: unknown;
    webhookConfig?: {
        url?: unknown;
    };
} | undefined, selectionKey: string) {
    const normalizedSelection = normalizeTargetSelectionValue(selectionKey);
    if (!target || !normalizedSelection) {
        return false;
    }

    return [
        target.externalId,
        target.webhookConfig?.url,
        target.websiteUrl,
        target.label,
    ].some((value) => normalizeTargetSelectionValue(value) === normalizedSelection);
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
        cachedMainMongoClientPromise = client.connect().catch((error) => {
            cachedMainMongoClientPromise = null;
            throw error;
        });
    }

    return cachedMainMongoClientPromise;
}

async function getStoredWebhookSecretsForAgency(agencyId: string, targetKey = "") {
    const normalizedAgencyId = agencyId.trim();
    if (!normalizedAgencyId) {
        return [];
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
                    "publishing.defaultTarget": 1,
                    "publishing.targets": 1,
                },
            },
        );
        const publishing = (settings as {
            publishing?: {
                defaultTarget?: StoredWebhookTarget;
                targets?: StoredWebhookTarget[];
            };
        } | null)?.publishing;
        const allTargets = [
            publishing?.defaultTarget,
            ...(Array.isArray(publishing?.targets) ? publishing.targets : []),
        ].filter((target): target is StoredWebhookTarget => Boolean(target));
        const matchingTargets = targetKey
            ? allTargets.filter((target) => targetMatchesSelection(target, targetKey))
            : allTargets;
        const targetsToUse = targetKey ? matchingTargets : allTargets;
        const secrets = targetsToUse
            .map((target) => target.webhookConfig?.secret)
            .filter((secret): secret is string => hasNonEmptyString(secret))
            .map((secret) => {
                try {
                    return decryptApiKey(secret.trim());
                } catch {
                    return "";
                }
            })
            .filter(Boolean);

        return Array.from(new Set(secrets));
    } catch (error) {
        console.warn("[Webhook] Failed to load stored agency secret", {
            agencyId: normalizedAgencyId,
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}

type StoredWebhookTarget = {
    externalId?: unknown;
    websiteUrl?: unknown;
    label?: unknown;
    webhookConfig?: {
        url?: unknown;
        secret?: unknown;
    };
};

async function addStoredWebhookSecretsForAgency(expectedSecrets: Set<string>, agencyId: string, targetKey: string) {
    const storedSecrets = await getStoredWebhookSecretsForAgency(agencyId, targetKey);

    for (const storedSecret of storedSecrets) {
        expectedSecrets.add(storedSecret);
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

function getConfiguredZseoWebhookSecrets() {
    const expectedSecrets = new Set<string>();
    const explicitSecrets = [
        process.env.ZSEO_WEBHOOK_SECRET,
        process.env.CONTENT_STUDIO_WEBHOOK_SECRET,
        process.env.CONTENT_STUDIO_WEBHOOK_SECRET_DIGITALCORVIDS,
        process.env.AI_BLOGGER_WEBHOOK_SECRET,
    ];

    for (const secret of explicitSecrets) {
        if (secret?.trim()) {
            expectedSecrets.add(secret.trim());
        }
    }

    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith("CONTENT_STUDIO_WEBHOOK_SECRET_") && value?.trim()) {
            expectedSecrets.add(value.trim());
        }
    }

    return Array.from(expectedSecrets);
}

function isZseoSignedRequest(request: NextRequest, payload?: unknown) {
    return Boolean(
        request.headers.get("x-zseo-signature") ||
        isZseoPublishPayload(payload) ||
        isZseoIntegrationTestPayload(payload),
    );
}

function authorizeZseoWebhookRequest(request: NextRequest, rawBody?: string) {
    if (!rawBody) {
        return {
            ok: false,
            status: 400,
            message: "zSEO webhook requests require a raw JSON body.",
        };
    }

    const signatureHeader = request.headers.get("x-zseo-signature")?.trim() || "";
    const timestamp = request.headers.get("x-zseo-timestamp")?.trim() || "";
    const providedSignature = signatureHeader.startsWith("sha256=")
        ? signatureHeader.slice("sha256=".length).trim().toLowerCase()
        : "";

    if (!/^[a-f0-9]{64}$/.test(providedSignature)) {
        return {
            ok: false,
            status: 401,
            message: "Missing or invalid zSEO webhook signature.",
        };
    }

    const timestampMs = Date.parse(timestamp);
    if (
        !Number.isFinite(timestampMs) ||
        Math.abs(Date.now() - timestampMs) > ZSEO_SIGNATURE_WINDOW_MS
    ) {
        return {
            ok: false,
            status: 401,
            message: "zSEO webhook timestamp is missing, invalid, or expired.",
        };
    }

    const expectedSecrets = getConfiguredZseoWebhookSecrets();
    if (expectedSecrets.length === 0) {
        return {
            ok: false,
            status: 503,
            message:
                "zSEO webhook secret is not configured. Add CONTENT_STUDIO_WEBHOOK_SECRET_DIGITALCORVIDS or ZSEO_WEBHOOK_SECRET.",
        };
    }

    for (const secret of expectedSecrets) {
        const expectedSignature = createHmac("sha256", secret)
            .update(`${timestamp}.${rawBody}`)
            .digest("hex");

        if (secretsMatch(providedSignature, expectedSignature)) {
            return { ok: true, status: 200, message: "" };
        }
    }

    return {
        ok: false,
        status: 401,
        message: "Unauthorized zSEO webhook request.",
    };
}

async function authorizeWebhookRequest(request: NextRequest, payload?: unknown, rawBody?: string) {
    if (isZseoSignedRequest(request, payload)) {
        return authorizeZseoWebhookRequest(request, rawBody);
    }

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
        await addStoredWebhookSecretsForAgency(
            expectedSecrets,
            agencyId,
            getWebhookTargetKey(request, payload),
        );
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
    const requiredStringFields = [
        "id",
        "title",
        "slug",
        "content",
        "excerpt",
        "metaTitle",
        "metaDescription",
        "canonicalUrl",
        "publishedAt",
    ];
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

function isMongoDuplicateKeyError(error: unknown): error is {
    code?: number;
    keyPattern?: Record<string, unknown>;
    keyValue?: Record<string, unknown>;
} {
    return Boolean(
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: unknown }).code === 11000,
    );
}

function getDuplicateKeyField(error: unknown): string | null {
    if (!isMongoDuplicateKeyError(error)) {
        return null;
    }

    const keyPattern = error.keyPattern && typeof error.keyPattern === "object"
        ? Object.keys(error.keyPattern)
        : [];
    if (keyPattern.length > 0) {
        return keyPattern[0] || null;
    }

    const keyValue = error.keyValue && typeof error.keyValue === "object"
        ? Object.keys(error.keyValue)
        : [];
    return keyValue[0] || null;
}

async function resolveExistingWebhookBlog(input: {
    sourcePostId: string;
    slug: string;
    canonicalUrl?: string;
}) {
    const existingBySourcePostId = await Blog.findOne({ sourcePostId: input.sourcePostId });
    if (existingBySourcePostId) {
        return {
            existingBlog: existingBySourcePostId,
            matchedBy: "sourcePostId" as const,
        };
    }

    const slugBackfillMatch = await Blog.findOne({
        slug: input.slug,
        $or: [
            { sourcePostId: { $exists: false } },
            { sourcePostId: null },
            { sourcePostId: "" },
        ],
    });

    if (!slugBackfillMatch) {
        return {
            existingBlog: null,
            matchedBy: null,
        };
    }

    const existingCanonicalUrl = normalizeMarketingCanonicalUrl(
        slugBackfillMatch.canonicalUrl,
        slugBackfillMatch.slug,
    );
    if (
        input.canonicalUrl &&
        existingCanonicalUrl &&
        existingCanonicalUrl !== input.canonicalUrl
    ) {
        throw new Error(
            `Slug ${input.slug} is already attached to a different canonical URL.`,
        );
    }

    return {
        existingBlog: slugBackfillMatch,
        matchedBy: "slug-backfill" as const,
    };
}

/**
 * POST /api/blogs/webhook
 * Receives blog from AI Blogger and stores locally
 */
export async function POST(request: NextRequest) {
    try {
        const startTime = Date.now();

        // Parse request body. zSEO signatures are calculated over the exact raw
        // JSON body, so do not use request.json() before authorization.
        let payload: unknown;
        let rawBody = "";
        try {
            rawBody = await request.text();
            payload = JSON.parse(rawBody);
        } catch (e) {
            console.warn("[Webhook] Invalid JSON payload", e);
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const auth = await authorizeWebhookRequest(request, payload, rawBody);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.message }, { status: auth.status });
        }

        if (isZseoIntegrationTestPayload(payload)) {
            return NextResponse.json(
                {
                    success: true,
                    message: "zSEO signed webhook test accepted.",
                    service: "Digital Corvids Blog Webhook Receiver",
                    timestamp: new Date().toISOString(),
                },
                { status: 200 },
            );
        }

        payload = normalizeIncomingWebhookPayload(payload);

        // Validate payload structure
        if (!validateWebhookPayload(payload)) {
            console.warn("[Webhook] Invalid payload structure", payload);
            return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
        }

        // Log incoming webhook with data completeness check
        console.log("[Webhook] Received blog", {
            event: payload.event,
            title: payload.blog.title,
            slug: payload.blog.slug,
            source: payload.source?.agencyName || "Unknown",
            dataCheck: {
                hasFaqItems: (payload.blog.faqItems?.length || 0) > 0,
                faqCount: payload.blog.faqItems?.length || 0,
                hasExternalSources: (payload.blog.externalSources?.length || 0) > 0,
                externalSourceCount: payload.blog.externalSources?.length || 0,
                hasPeopleAlsoAsk: (payload.blog.peopleAlsoAsk?.length || 0) > 0,
                paaCount: payload.blog.peopleAlsoAsk?.length || 0,
                hasInternalLinks: (payload.blog.internalLinks?.length || 0) > 0,
                linkCount: payload.blog.internalLinks?.length || 0,
                hasSchemaMarkup: !!payload.blog.schemaMarkup,
                hasContentCluster: !!payload.blog.contentClusterId,
                contentLength: payload.blog.content?.length || 0,
            },
        });

        // Connect to database
        await dbConnect();

        // Prepare blog data
        const normalizedImage = normalizeMarketingImageSrc(payload.blog.image, "");
        const normalizedCanonicalUrl = normalizeMarketingCanonicalUrl(
            payload.blog.canonicalUrl,
            payload.blog.slug,
        );
        const normalizedFaqItems = normalizeFaqItems(payload.blog.faqItems);
        const normalizedExternalSources = normalizeExternalSources(payload.blog.externalSources);
        const normalizedPeopleAlsoAsk = normalizeQuestionList(payload.blog.peopleAlsoAsk);
        const normalizedSourcePostId = hasNonEmptyString(payload.blog.id)
            ? payload.blog.id.trim()
            : "";
        const normalizedContent =
            normalizedFaqItems.length > 0
                ? normalizeBrandSpelling(stripStandaloneFaqSection(payload.blog.content))
                : normalizeBrandSpelling(payload.blog.content);

        const { existingBlog, matchedBy } = await resolveExistingWebhookBlog({
            sourcePostId: normalizedSourcePostId,
            slug: payload.blog.slug,
            canonicalUrl: normalizedCanonicalUrl || undefined,
        });
        const isUpdate = !!existingBlog;
        const previousSlug = existingBlog?.slug || "";

        if (normalizedCanonicalUrl) {
            const canonicalConflict = await Blog.findOne({
                canonicalUrl: normalizedCanonicalUrl,
                ...(existingBlog ? { _id: { $ne: existingBlog._id } } : {}),
            })
                .select("_id slug sourcePostId canonicalUrl")
                .lean();

            if (canonicalConflict) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Canonical URL already exists",
                        details: `Marketing blog "${canonicalConflict.slug}" already uses ${normalizedCanonicalUrl}.`,
                    },
                    { status: 409 },
                );
            }
        }

        if (!existingBlog) {
            const slugConflict = await Blog.findOne({ slug: payload.blog.slug })
                .select("_id slug sourcePostId canonicalUrl")
                .lean();

            if (slugConflict) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Slug already exists",
                        details: `Marketing blog "${slugConflict.slug}" is already linked to ${slugConflict.sourcePostId || "another source"}.`,
                    },
                    { status: 409 },
                );
            }
        }

        const blogData = {
            sourcePostId: normalizedSourcePostId || undefined,
            title: normalizeBrandSpelling(payload.blog.title),
            slug: payload.blog.slug,
            content: normalizedContent,
            image: normalizedImage,
            imageAlt: normalizedImage
                ? normalizeBrandSpelling(payload.blog.imageAlt || payload.blog.title)
                : "",
            shortDescription: normalizeBrandSpelling(payload.blog.excerpt),
            category: normalizeBrandSpelling(payload.blog.category || "AI Blogger"),
            status: "published",
            metaKeywords: hasNonEmptyString(payload.blog.metaKeywords) ? normalizeBrandSpelling(payload.blog.metaKeywords.trim()) : "",
            metaTitle: normalizeBrandSpelling(payload.blog.metaTitle),
            metaDescription: normalizeBrandSpelling(payload.blog.metaDescription),
            canonicalUrl: normalizedCanonicalUrl || undefined,
            schemaMarkup: payload.blog.schemaMarkup ? normalizeBrandSpelling(payload.blog.schemaMarkup) : payload.blog.schemaMarkup,
            faqItems: normalizedFaqItems,
            externalSources: normalizedExternalSources,
            peopleAlsoAsk: normalizedPeopleAlsoAsk,
            internalLinks: payload.blog.internalLinks || [],
            contentClusterId: payload.blog.contentClusterId,
            parentTopicSlug: payload.blog.parentTopicSlug,
            publishedAt: new Date(payload.blog.publishedAt),
            updatedAt: new Date(),
        };

        let savedBlog;

        if (isUpdate) {
            // Update existing blog
            savedBlog = await Blog.findByIdAndUpdate(
                existingBlog._id,
                blogData,
                { returnDocument: 'after' },
            );
            console.log("[Webhook] Updated blog", {
                slug: payload.blog.slug,
                duration: `${Date.now() - startTime}ms`,
                sourcePostId: normalizedSourcePostId || "missing",
                matchedBy,
            });
        } else {
            // Create new blog
            savedBlog = await Blog.create(blogData);
            console.log("[Webhook] Created blog", {
                slug: payload.blog.slug,
                duration: `${Date.now() - startTime}ms`,
                sourcePostId: normalizedSourcePostId || "missing",
                matchedBy: "create",
            });
        }

        // Create publishing audit record
        try {
            const auditData = {
                blogSlug: payload.blog.slug,
                blogId: savedBlog._id,
                sourcePostId: payload.blog.id,
                agencyId: payload.source?.agencyId || "unknown",
                agencyName: payload.source?.agencyName || "Unknown",
                publishingEvent: payload.event || "blog.published",
                publishedByAIBlogger: payload.source?.publishedAt ? new Date(payload.source.publishedAt) : new Date(),
                receivedByDC: new Date(),
                webhookStatus: "success",
                contentSnapshot: {
                    title: payload.blog.title,
                    wordCount: payload.blog.content?.split(/\s+/).length || 0,
                    hasInternalLinks: (payload.blog.internalLinks?.length || 0) > 0,
                    internalLinkCount: payload.blog.internalLinks?.length || 0,
                    hasFaqItems: (payload.blog.faqItems?.length || 0) > 0,
                    faqItemCount: payload.blog.faqItems?.length || 0,
                    hasExternalSources: normalizedExternalSources.length > 0,
                    externalSourceCount: normalizedExternalSources.length,
                    hasSchemaMarkup: !!payload.blog.schemaMarkup,
                    metaKeywordsCount: payload.blog.metaKeywords?.split(',').length || 0,
                },
                webhookRequestSnapshot: {
                    method: request.method,
                    path: request.nextUrl.pathname,
                    agencyId: payload.source?.agencyId || getWebhookAgencyId(request, payload) || "unknown",
                    contentLength: request.headers.get("content-length") || "",
                    userAgent: request.headers.get("user-agent") || "",
                    receivedAt: new Date(),
                },
                webhookPayloadSnapshot: payload,
                storageResultSnapshot: {
                    operation: isUpdate ? "update" : "create",
                    blogId: savedBlog._id?.toString(),
                    slug: savedBlog.slug,
                    previousSlug,
                    normalizedCanonicalUrl,
                    normalizedImage,
                    faqItemCount: normalizedFaqItems.length,
                    externalSourceCount: normalizedExternalSources.length,
                    peopleAlsoAskCount: normalizedPeopleAlsoAsk.length,
                    internalLinkCount: payload.blog.internalLinks?.length || 0,
                },
                status: "published",
            };

            await BlogPublishingAudit.create(auditData);
            console.log("[Webhook] Created audit record", {
                slug: payload.blog.slug,
                agencyId: auditData.agencyId,
            });
        } catch (auditError) {
            console.warn("[Webhook] Failed to create audit record (non-blocking)", {
                slug: payload.blog.slug,
                error: auditError instanceof Error ? auditError.message : String(auditError),
            });
            // Non-blocking error - audit failure shouldn't fail the webhook
        }

        // Revalidate blog pages for ISR (Incremental Static Regeneration)
        try {
            revalidatePath("/blog");
            revalidatePath("/sitemap.xml");
            if (previousSlug && previousSlug !== payload.blog.slug) {
                revalidatePath(`/blog/${previousSlug}`);
            }
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

        if (isMongoDuplicateKeyError(error)) {
            const duplicateField = getDuplicateKeyField(error);
            const details =
                duplicateField === "canonicalUrl"
                    ? "Another marketing blog already uses this canonical URL."
                    : duplicateField === "slug"
                      ? "Another marketing blog already uses this slug."
                      : duplicateField === "sourcePostId"
                        ? "This AI Blogger post is already linked to a different marketing blog."
                        : errorMessage;

            return NextResponse.json(
                {
                    success: false,
                    error: "Conflicting blog data",
                    details,
                },
                { status: 409 },
            );
        }

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
