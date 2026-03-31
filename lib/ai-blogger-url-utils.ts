/**
 * AI Blogger URL Utilities
 *
 * Consolidated URL parsing and validation functions used across AI Blogger.
 * Safely handles URL parsing with fallbacks for invalid URLs.
 */

/**
 * Extracts the hostname from a URL string, removing 'www.' prefix if present
 * Returns empty string if URL is invalid
 */
export function extractHostname(urlString: string): string {
    try {
        const url = new URL(urlString);
        return url.hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

/**
 * Parses a URL string safely, returning null if invalid
 */
export function parseUrlSafely(urlString: string): URL | null {
    try {
        return new URL(urlString);
    } catch {
        return null;
    }
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(urlString: string): boolean {
    try {
        new URL(urlString);
        return true;
    } catch {
        return false;
    }
}

/**
 * Resolves a URL relative to a base URL
 * Returns the absolute URL or the original string if resolution fails
 */
export function resolveUrl(urlString: string, baseUrl?: string): string {
    if (!baseUrl) {
        return urlString;
    }

    try {
        return new URL(urlString, baseUrl).href;
    } catch {
        return urlString;
    }
}

/**
 * Normalizes a URL by:
 * 1. Ensuring it starts with http:// or https://
 * 2. Removing trailing slashes (except root)
 * 3. Resolving relative URLs against a base
 */
export function normalizeUrl(
    urlString: string,
    baseUrl?: string,
    ensureHttps = false
): string | null {
    let url = urlString?.trim();

    if (!url) {
        return null;
    }

    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `http://${url}`;
    }

    try {
        const parsed = new URL(url, baseUrl);
        let href = parsed.href;

        // Remove trailing slash except for root path
        if (href !== parsed.origin + "/" && href.endsWith("/")) {
            href = href.slice(0, -1);
        }

        // Convert to HTTPS if requested
        if (ensureHttps && parsed.protocol === "http:") {
            href = href.replace(/^http:/, "https:");
        }

        return href;
    } catch {
        return null;
    }
}

/**
 * Checks if a URL belongs to the same domain as another URL
 */
export function isSameDomain(url1: string, url2: string): boolean {
    try {
        const parsed1 = new URL(url1);
        const parsed2 = new URL(url2);
        return parsed1.hostname === parsed2.hostname;
    } catch {
        return false;
    }
}

/**
 * Gets the path from a URL
 */
export function getUrlPath(urlString: string): string {
    try {
        const url = new URL(urlString);
        return url.pathname + url.search + url.hash;
    } catch {
        return "";
    }
}
