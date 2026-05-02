/**
 * AI Blogger Webhook Service
 * Handles sending published blogs to agency webhook endpoints
 */

import { buildMarketingBlogHtml } from "./marketing-blog-content";
import type { BlogStudioPost } from "./types-ai-blogger";
import type { BlogStudioWebhookConfig } from "./types-ai-blogger";

/**
 * Webhook payload sent to agency endpoints
 */
export type WebhookPayload = {
    event: "blog.published" | "blog.updated" | "blog.deleted";
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
        image: string;
        imageAlt: string;
        schemaMarkup?: string;
        category: string;
        faqItems?: Array<{
            question: string;
            answer: string;
        }>;
        externalSources?: Array<{
            id?: string;
            title?: string;
            url: string;
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
        internalLinks: Array<{
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
    source: {
        agencyId: string;
        agencyName: string;
        publishedAt: string;
    };
};

/**
 * Result of webhook delivery attempt
 */
export type WebhookDeliveryResult = {
    success: boolean;
    statusCode?: number;
    responseTime: number;
    error?: string;
    timestamp: string;
    attempt: number;
    attempts?: WebhookDeliveryResult[];
};

/**
 * Logs webhook delivery for audit trail
 */
export type WebhookDeliveryLog = {
    id: string;
    agencyId: string;
    webhookUrl: string;
    event: string;
    postId: string;
    postSlug: string;
    payload: WebhookPayload;
    results: WebhookDeliveryResult[];
    finalStatus: "success" | "failed";
    createdAt: string;
    updatedAt: string;
};

function buildWebhookRequestHeaders(event: string, webhookSecret: string, extras?: Record<string, string>) {
    return {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Timestamp": new Date().toISOString(),
        ...(webhookSecret
            ? {
                "X-AI-Blogger-Webhook-Secret": webhookSecret,
                Authorization: `Bearer ${webhookSecret}`,
            }
            : {}),
        ...(extras || {}),
    };
}

function isRetryableStatusCode(statusCode: number): boolean {
    return (
        statusCode === 408 ||
        statusCode === 409 ||
        statusCode === 425 ||
        statusCode === 429 ||
        statusCode >= 500
    );
}

function toWebhookAttempt(result: WebhookDeliveryResult): WebhookDeliveryResult {
    const { attempts: _attempts, ...attempt } = result;
    return attempt;
}

/**
 * Sends blog data to webhook endpoint with retry logic
 * @param webhookConfig Webhook configuration (URL, retries, timeout)
 * @param payload Blog data payload
 * @param retryCount Current retry attempt (starts at 0)
 * @returns Result of webhook delivery
 */
export async function sendWebhookToAgency(
    webhookConfig: BlogStudioWebhookConfig,
    payload: WebhookPayload,
    retryCount: number = 0,
    previousAttempts: WebhookDeliveryResult[] = [],
): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const maxAttempts = webhookConfig.retryAttempts || 3;
    const timeoutMs = (webhookConfig.timeout || 10) * 1000;

    try {
        if (!webhookConfig.url) {
            throw new Error("Webhook URL is not configured");
        }

        // Validate URL is HTTPS for security
        if (!webhookConfig.url.startsWith("https://")) {
            throw new Error("Webhook URL must use HTTPS protocol");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const webhookSecret = webhookConfig.secret?.trim() || "";
            const response = await fetch(webhookConfig.url, {
                method: "POST",
                headers: buildWebhookRequestHeaders(payload.event, webhookSecret, {
                    "X-AI-Blogger-Agency-Id": payload.source.agencyId,
                }),
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const responseTime = Date.now() - startTime;

            // 2xx status codes are success
            if (response.ok) {
                const result: WebhookDeliveryResult = {
                    success: true,
                    statusCode: response.status,
                    responseTime,
                    timestamp: new Date().toISOString(),
                    attempt: retryCount + 1,
                };
                result.attempts = [...previousAttempts, toWebhookAttempt(result)];
                return result;
            }

            // Non-2xx responses may be retryable
            const failedAttempt: WebhookDeliveryResult = {
                success: false,
                statusCode: response.status,
                responseTime,
                error: `HTTP ${response.status}: ${response.statusText}`,
                timestamp: new Date().toISOString(),
                attempt: retryCount + 1,
            };

            if (retryCount < maxAttempts - 1 && isRetryableStatusCode(response.status)) {
                const delay = getExponentialBackoffDelay(retryCount);
                console.log(`[AI-Blogger Webhook] Retry attempt ${retryCount + 2} in ${delay}ms`, {
                    url: webhookConfig.url,
                    statusCode: response.status,
                });

                await new Promise((resolve) => setTimeout(resolve, delay));
                return sendWebhookToAgency(webhookConfig, payload, retryCount + 1, [...previousAttempts, toWebhookAttempt(failedAttempt)]);
            }

            failedAttempt.attempts = [...previousAttempts, toWebhookAttempt(failedAttempt)];
            return failedAttempt;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            if (fetchError instanceof Error && fetchError.name === "AbortError") {
                const timeoutAttempt: WebhookDeliveryResult = {
                    success: false,
                    responseTime,
                    error: `Request timeout after ${timeoutMs / 1000}s`,
                    timestamp: new Date().toISOString(),
                    attempt: retryCount + 1,
                };

                if (retryCount < maxAttempts - 1) {
                    const delay = getExponentialBackoffDelay(retryCount);
                    console.log(`[AI-Blogger Webhook] Retry attempt ${retryCount + 2} in ${delay}ms`, {
                        url: webhookConfig.url,
                        error: "Request timeout",
                    });

                    await new Promise((resolve) => setTimeout(resolve, delay));
                    return sendWebhookToAgency(webhookConfig, payload, retryCount + 1, [...previousAttempts, toWebhookAttempt(timeoutAttempt)]);
                }

                timeoutAttempt.attempts = [...previousAttempts, toWebhookAttempt(timeoutAttempt)];
                return timeoutAttempt;
            }

            throw fetchError;
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        const result: WebhookDeliveryResult = {
            success: false,
            responseTime,
            error: errorMessage,
            timestamp: new Date().toISOString(),
            attempt: retryCount + 1,
        };

        // If we have retries left and error is retryable, retry
        if (retryCount < maxAttempts - 1 && isRetryableError(errorMessage)) {
            const delay = getExponentialBackoffDelay(retryCount);
            console.log(`[AI-Blogger Webhook] Retry attempt ${retryCount + 2} in ${delay}ms`, {
                url: webhookConfig.url,
                error: errorMessage,
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
            return sendWebhookToAgency(webhookConfig, payload, retryCount + 1, [...previousAttempts, toWebhookAttempt(result)]);
        }

        result.attempts = [...previousAttempts, toWebhookAttempt(result)];
        return result;
    }
}

export async function pingWebhookEndpoint(
    webhookConfig: BlogStudioWebhookConfig,
    agencyId?: string,
): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const timeoutMs = (webhookConfig.timeout || 10) * 1000;

    try {
        if (!webhookConfig.url) {
            throw new Error("Webhook URL is not configured");
        }

        if (!webhookConfig.url.startsWith("https://")) {
            throw new Error("Webhook URL must use HTTPS protocol");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const webhookSecret = webhookConfig.secret?.trim() || "";
            const response = await fetch(webhookConfig.url, {
                method: "GET",
                headers: buildWebhookRequestHeaders("webhook.healthcheck", webhookSecret, {
                    "X-AI-Blogger-Test": "healthcheck",
                    ...(agencyId ? { "X-AI-Blogger-Agency-Id": agencyId } : {}),
                }),
                signal: controller.signal,
                cache: "no-store",
            });

            clearTimeout(timeoutId);

            const responseTime = Date.now() - startTime;
            if (response.ok) {
                return {
                    success: true,
                    statusCode: response.status,
                    responseTime,
                    timestamp: new Date().toISOString(),
                    attempt: 1,
                };
            }

            return {
                success: false,
                statusCode: response.status,
                responseTime,
                error: `HTTP ${response.status}: ${response.statusText}`,
                timestamp: new Date().toISOString(),
                attempt: 1,
            };
        } catch (fetchError) {
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            if (fetchError instanceof Error && fetchError.name === "AbortError") {
                return {
                    success: false,
                    responseTime,
                    error: `Request timeout after ${webhookConfig.timeout}s`,
                    timestamp: new Date().toISOString(),
                    attempt: 1,
                };
            }

            throw fetchError;
        }
    } catch (error) {
        return {
            success: false,
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            attempt: 1,
        };
    }
}

/**
 * Determines if an error is retryable (network, timeout, 5xx errors)
 */
function isRetryableError(errorMessage: string): boolean {
    const nonRetryablePatterns = [
        "HTTPS",
        "configured",
        "400",
        "401",
        "403",
        "404",
    ];

    for (const pattern of nonRetryablePatterns) {
        if (errorMessage.includes(pattern)) {
            return false;
        }
    }

    return true;
}

/**
 * Calculates exponential backoff delay with jitter
 * Attempt 0: 2-3s, Attempt 1: 4-8s, Attempt 2: 8-16s
 */
function getExponentialBackoffDelay(retryCount: number): number {
    const baseDelay = Math.pow(2, retryCount + 1) * 1000;
    const jitter = Math.random() * baseDelay * 0.5;
    return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Builds webhook payload from published blog post
 */
export function buildWebhookPayload(
    post: BlogStudioPost,
    agencyId: string,
    agencyName: string,
    options?: {
        category?: string;
        content?: string;
        internalLinks?: BlogStudioPost["internalLinks"];
        metaKeywords?: string;
        peopleAlsoAsk?: string[];
        siteUrl?: string;
        slug?: string;
    },
): WebhookPayload {
    const resolvedSlug = options?.slug?.trim() || post.publishedEntrySlug?.trim() || post.slug;
    const resolvedInternalLinks = options?.internalLinks || post.internalLinks || [];
    const resolvedContent = buildMarketingBlogHtml(options?.content || post.content || "", {
        internalLinks: resolvedInternalLinks,
        siteUrl: options?.siteUrl,
        externalSources: post.externalSources,
    });

    return {
        event: "blog.published",
        blog: {
            id: post.id,
            title: post.title,
            slug: resolvedSlug,
            content: resolvedContent,
            excerpt: post.excerpt,
            metaKeywords: options?.metaKeywords || "",
            metaTitle: post.metaTitle || "",
            metaDescription: post.metaDescription || "",
            canonicalUrl: post.canonicalUrl || "",
            image: post.featuredImageUrl || "",
            imageAlt: post.featuredImageAlt || "",
            schemaMarkup: post.schemaMarkup,
            category: options?.category || "",
            faqItems: (post.faqItems || [])
                .filter((item) => Boolean(item?.question?.trim() && item?.answer?.trim()))
                .map((item) => ({
                    question: item.question.trim(),
                    answer: item.answer.trim(),
                })),
            externalSources: (post.externalSources || [])
                .filter((source) => Boolean(source?.url?.trim()))
                .map((source) => ({
                    id: source.id,
                    title: source.title,
                    url: source.url,
                    domain: source.domain,
                    summary: source.summary,
                    type: source.type,
                    freshness: source.freshness,
                    trustLevel: source.trustLevel,
                    publishedAt: source.publishedAt,
                    keyClaims: source.keyClaims,
                    citationBlock: source.citationBlock,
                })),
            peopleAlsoAsk: (options?.peopleAlsoAsk || [])
                .map((item) => item?.trim() || "")
                .filter(Boolean),
            internalLinks: resolvedInternalLinks.map((link) => ({
                href: link.href,
                title: link.title,
                anchorText: link.anchorText,
                source: link.source,
                relationType: link.relationType,
                score: link.score,
            })),
            contentClusterId: post.contentClusterId,
            parentTopicSlug: post.parentTopicSlug,
            publishedAt: post.publishedAt || new Date().toISOString(),
        },
        source: {
            agencyId,
            agencyName,
            publishedAt: new Date().toISOString(),
        },
    };
}

/**
 * Logs webhook delivery for audit trail and monitoring
 * FIXED: Now persists to MongoDB for audit trail
 */
export async function logWebhookDelivery(
    agencyId: string,
    webhookUrl: string,
    postId: string,
    postSlug: string,
    payload: WebhookPayload,
    results: WebhookDeliveryResult[],
): Promise<void> {
    if (!results || results.length === 0) {
        console.warn("[AI-Blogger Webhook] logWebhookDelivery called with empty results array");
        return;
    }

    // Determine final status
    const finalStatus = results[results.length - 1]?.success ? "success" : "failed";
    const now = new Date().toISOString();

    // Log to console (non-blocking)
    try {
        console.log("[AI-Blogger Webhook] Delivery complete", {
            agencyId,
            webhookUrlDomain: new URL(webhookUrl).hostname,
            postId,
            postSlug,
            event: payload.event,
            finalStatus,
            totalAttempts: Math.max(...results.map((result) => result.attempt)),
            totalResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0),
        });
    } catch (logError) {
        console.warn("[AI-Blogger Webhook] Failed to log delivery to console", logError);
    }

    // Store in MongoDB for persistence (non-blocking, don't fail if it fails)
    try {
        const { BlogStudioWebhookDeliveryLogModel } = await import("./mongodb-blog-studio-models");
        const { randomUUID } = await import("crypto");

        await BlogStudioWebhookDeliveryLogModel.create({
            id: randomUUID(),
            agencyId,
            webhookUrl,
            event: payload.event,
            postId,
            postSlug,
            payload,
            results,
            finalStatus,
            createdAt: now,
            updatedAt: now,
        });
    } catch (mongoError) {
        // Log MongoDB failure but don't fail the entire webhook process
        console.warn(
            "[AI-Blogger Webhook] Failed to persist webhook delivery log to MongoDB:",
            mongoError instanceof Error ? mongoError.message : String(mongoError)
        );
    }
}

/**
 * Gets webhook delivery logs for a specific agency
 * FIXED: Now actually retrieves from MongoDB
 */
export async function getWebhookDeliveryLogs(
    agencyId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
        status?: "success" | "failed";
        postId?: string;
        startDate?: string;
        endDate?: string;
    }
): Promise<{
    logs: WebhookDeliveryLog[];
    total: number;
    hasMore: boolean;
}> {
    try {
        const { BlogStudioWebhookDeliveryLogModel } = await import("./mongodb-blog-studio-models");

        // Bound the limit to prevent DOS
        const safeLimit = Math.min(limit, 100);
        const safeOffset = Math.max(0, offset);

        // Build query
        const query: Record<string, string | { $gte?: string; $lte?: string }> = { agencyId };

        if (filters?.status) {
            query.finalStatus = filters.status;
        }

        if (filters?.postId) {
            query.postId = filters.postId;
        }

        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }

        // Get total count
        const total = await BlogStudioWebhookDeliveryLogModel.countDocuments(query);

        // Get paginated logs
        const logs = await BlogStudioWebhookDeliveryLogModel.find(query)
            .sort({ createdAt: -1 })
            .skip(safeOffset)
            .limit(safeLimit)
            .lean();

        return {
            logs: logs as unknown as WebhookDeliveryLog[],
            total,
            hasMore: safeOffset + safeLimit < total,
        };
    } catch (error) {
        console.error(
            "[AI-Blogger Webhook] Failed to retrieve delivery logs:",
            error instanceof Error ? error.message : String(error)
        );
        // Return empty on error rather than crashing
        return {
            logs: [],
            total: 0,
            hasMore: false,
        };
    }
}
