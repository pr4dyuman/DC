/**
 * AI Blogger Published Page Metadata Validation
 * Validates that published blog posts have correct metadata rendering
 */

import type { BlogStudioPost } from "./types-ai-blogger";

export type MetadataValidationIssue = {
    type: "error" | "warning";
    code: string;
    message: string;
    severity: "blocker" | "minor";
};

export type MetadataValidationResult = {
    isValid: boolean;
    issues: MetadataValidationIssue[];
    checkedAt: string;
    postSlug: string;
    postId: string;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasSchemaContext(node: Record<string, unknown>) {
    return typeof node["@context"] === "string" && node["@context"].trim().length > 0;
}

function hasSchemaType(node: Record<string, unknown>) {
    const type = node["@type"];
    return (
        (typeof type === "string" && type.trim().length > 0) ||
        (Array.isArray(type) && type.some((item) => typeof item === "string" && item.trim().length > 0))
    );
}

/**
 * Validates metadata for a published post
 * Checks: title, description, schema markup, canonical URL
 */
export function validatePublishedMetadata(post: BlogStudioPost): MetadataValidationResult {
    const issues: MetadataValidationIssue[] = [];
    const now = new Date().toISOString();

    // Check: metaTitle exists and is reasonable length
    if (!post.metaTitle?.trim()) {
        issues.push({
            type: "error",
            code: "MISSING_META_TITLE",
            message: "Meta title is missing or empty",
            severity: "blocker",
        });
    } else if (post.metaTitle.length < 30) {
        issues.push({
            type: "warning",
            code: "SHORT_META_TITLE",
            message: `Meta title is ${post.metaTitle.length} chars (recommended 30-60)`,
            severity: "minor",
        });
    } else if (post.metaTitle.length > 60) {
        issues.push({
            type: "warning",
            code: "LONG_META_TITLE",
            message: `Meta title is ${post.metaTitle.length} chars (recommended 30-60, will be truncated)`,
            severity: "minor",
        });
    }

    // Check: metaDescription exists and is reasonable length
    if (!post.metaDescription?.trim()) {
        issues.push({
            type: "error",
            code: "MISSING_META_DESCRIPTION",
            message: "Meta description is missing or empty",
            severity: "blocker",
        });
    } else if (post.metaDescription.length < 120) {
        issues.push({
            type: "warning",
            code: "SHORT_META_DESCRIPTION",
            message: `Meta description is ${post.metaDescription.length} chars (recommended 120-160)`,
            severity: "minor",
        });
    } else if (post.metaDescription.length > 160) {
        issues.push({
            type: "warning",
            code: "LONG_META_DESCRIPTION",
            message: `Meta description is ${post.metaDescription.length} chars (recommended 120-160, will be truncated)`,
            severity: "minor",
        });
    }

    // Check: schema markup is valid JSON-LD if present
    if (post.schemaMarkup) {
        try {
            const parsed = JSON.parse(post.schemaMarkup);
            const schemaNodes = Array.isArray(parsed)
                ? parsed.filter(isJsonObject)
                : isJsonObject(parsed)
                  ? [parsed]
                  : [];

            if (schemaNodes.length === 0) {
                issues.push({
                    type: "error",
                    code: "INVALID_SCHEMA_MARKUP",
                    message: "Schema markup is not a valid JSON-LD object or object array",
                    severity: "blocker",
                });
            } else if (!schemaNodes.some(hasSchemaContext)) {
                issues.push({
                    type: "warning",
                    code: "MISSING_SCHEMA_CONTEXT",
                    message: "Schema markup missing @context",
                    severity: "minor",
                });
            } else if (!schemaNodes.every(hasSchemaType)) {
                issues.push({
                    type: "warning",
                    code: "MISSING_SCHEMA_TYPE",
                    message: "One or more schema markup objects are missing @type",
                    severity: "minor",
                });
            }
        } catch (parseError) {
            issues.push({
                type: "error",
                code: "INVALID_JSON_SCHEMA",
                message: `Schema markup is not valid JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
                severity: "blocker",
            });
        }
    }

    // Check: canonical URL is valid if present
    if (post.canonicalUrl) {
        try {
            new URL(post.canonicalUrl);
        } catch {
            issues.push({
                type: "error",
                code: "INVALID_CANONICAL_URL",
                message: `Canonical URL is not a valid URL: ${post.canonicalUrl}`,
                severity: "blocker",
            });
        }
    }

    // Check: featured image exists
    if (!post.featuredImageUrl?.trim()) {
        issues.push({
            type: "warning",
            code: "MISSING_FEATURED_IMAGE",
            message: "Featured image is missing",
            severity: "minor",
        });
    } else {
        // Validate image URL format
        try {
            new URL(post.featuredImageUrl, "https://example.com");
        } catch {
            issues.push({
                type: "error",
                code: "INVALID_IMAGE_URL",
                message: `Featured image URL is not valid: ${post.featuredImageUrl}`,
                severity: "blocker",
            });
        }
    }

    // Check: featured image alt text
    if (!post.featuredImageAlt?.trim()) {
        issues.push({
            type: "warning",
            code: "MISSING_IMAGE_ALT",
            message: "Featured image alt text is missing",
            severity: "minor",
        });
    } else if (post.featuredImageAlt.length < 10) {
        issues.push({
            type: "warning",
            code: "SHORT_IMAGE_ALT",
            message: `Image alt text is ${post.featuredImageAlt.length} chars (should be descriptive)`,
            severity: "minor",
        });
    }

    // Check: content exists and has reasonable length
    if (!post.content?.trim()) {
        issues.push({
            type: "error",
            code: "MISSING_CONTENT",
            message: "Post content is missing",
            severity: "blocker",
        });
    } else {
        const wordCount = post.content.trim().split(/\s+/).length;
        if (wordCount < 300) {
            issues.push({
                type: "warning",
                code: "SHORT_CONTENT",
                message: `Content is ${wordCount} words (recommended 800+)`,
                severity: "minor",
            });
        }
    }

    // Check: excerpt exists
    if (!post.excerpt?.trim()) {
        issues.push({
            type: "warning",
            code: "MISSING_EXCERPT",
            message: "Post excerpt is missing",
            severity: "minor",
        });
    }

    const hasBlockers = issues.some((i) => i.severity === "blocker");

    return {
        isValid: !hasBlockers,
        issues,
        checkedAt: now,
        postSlug: post.slug,
        postId: post.id,
    };
}

/**
 * Format validation result for logging
 */
export function formatMetadataValidationResult(result: MetadataValidationResult): string {
    if (result.isValid) {
        return `Metadata validation passed (${result.issues.length} info items)`;
    }

    const blockers = result.issues.filter((i) => i.severity === "blocker");
    const warnings = result.issues.filter((i) => i.severity === "minor");

    return `Metadata validation failed: ${blockers.length} blockers, ${warnings.length} warnings`;
}
