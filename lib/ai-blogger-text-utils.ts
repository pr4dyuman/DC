/**
 * AI Blogger Text Utilities
 *
 * Consolidated text sanitization and normalization functions used across AI Blogger.
 * Carefully consolidated from:
 * - lib/ai-blogger-grounded-research.ts
 * - lib/ai-blogger-serp-analysis.ts
 * - lib/ai-blogger-website-intelligence.ts
 * - lib/actions/ai-blogger.ts
 */

/**
 * Sanitizes text by trimming and truncating to specified length
 * Handles undefined/null values with optional fallback
 * Includes optional whitespace normalization
 */
export function sanitizeText(
    value: string | undefined | null,
    maxLength: number,
    fallback = "",
    normalizeWhitespace = true
): string {
    if (!value) {
        return fallback;
    }

    let result = value;
    if (normalizeWhitespace) {
        result = result.replace(/\s+/g, " ");
    }
    return result.trim().slice(0, maxLength);
}

/**
 * Sanitizes an array of strings by deduplicating and filtering
 */
export function sanitizeStringArray(
    values: Array<string | undefined | null>,
    maxItems: number,
    maxLength: number,
    normalizeWhitespace = true
): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => sanitizeText(value, maxLength, "", normalizeWhitespace))
                .filter(Boolean)
        )
    ).slice(0, maxItems);
}

/**
 * Decodes HTML entities to their string equivalents
 * Handles named: &nbsp; &amp; &quot; &#39; &apos; &lt; &gt;
 * Handles hex: &#x27; &#x2019; &#x2018; &#x2013; &#x2014; &#xA0;
 */
export function decodeHtml(value: string): string {
    return value
        .replace(/&nbsp;|&#xA0;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;|&#x27;/gi, "'")
        .replace(/&#x2019;/gi, "\u2019")
        .replace(/&#x2018;/gi, "\u2018")
        .replace(/&#x2013;/gi, "\u2013")
        .replace(/&#x2014;/gi, "\u2014")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

/**
 * Clean text by removing HTML tags, scripts, styles, and normalizing whitespace
 * Decodes HTML entities afterward
 */
export function cleanText(value: string, maxLength = 240): string {
    return sanitizeText(
        decodeHtml(
            value
                .replace(/<script[\s\S]*?<\/script>/gi, " ")
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
                .replace(/<[^>]+>/g, " ")
        ),
        maxLength,
        "",
        true
    );
}

/**
 * Collapses whitespace by replacing multiple spaces with single space and trimming
 */
export function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes a query string for search/comparison
 */
export function normalizeQuery(query: string): string {
    return sanitizeText(query, 180, "", true).toLowerCase();
}

/**
 * Sanitizes location strings for search queries
 */
export function sanitizeLocation(value: string | undefined, fallback = "us"): string {
    return (sanitizeText(value, 12, fallback, true) || fallback).toLowerCase();
}
