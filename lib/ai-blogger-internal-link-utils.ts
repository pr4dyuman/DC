/**
 * Shared internal-link counting utility used by both
 * the SEO audit engine and the post editor form.
 */

const DEFAULT_INTERNAL_LINK_BASE_URL = "https://example.com";

function getInternalLinkBaseUrl(siteUrl?: string) {
    const value = siteUrl?.trim();

    if (!value) {
        return DEFAULT_INTERNAL_LINK_BASE_URL;
    }

    try {
        return new URL(value).origin;
    } catch {
        return DEFAULT_INTERNAL_LINK_BASE_URL;
    }
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildInternalLinkPresenceRegex(siteUrl?: string) {
    const baseUrl = getInternalLinkBaseUrl(siteUrl);
    const hostname = new URL(baseUrl).hostname.replace(/^www\./, "");
    const hostnamePattern = escapeRegex(hostname);

    return new RegExp(
        `\\]\\((\\/[^)]*|https?:\\/\\/(?:www\\.)?${hostnamePattern}\\/[^)]*)\\)|href=["'](\\/[^"']*|https?:\\/\\/(?:www\\.)?${hostnamePattern}\\/[^"']*)["']`,
        "i",
    );
}

export function normalizeInternalLinkHref(rawHref?: string, siteUrl?: string): string | null {
    const href = rawHref?.trim();

    if (!href) {
        return null;
    }

    try {
        const url = new URL(href, getInternalLinkBaseUrl(siteUrl));
        const hostname = url.hostname.replace(/^www\./, "");
        const expectedHostname = new URL(getInternalLinkBaseUrl(siteUrl)).hostname.replace(/^www\./, "");

        if (hostname !== expectedHostname) {
            return null;
        }

        url.hash = "";

        const normalizedPathname =
            url.pathname !== "/" && url.pathname.endsWith("/")
                ? url.pathname.slice(0, -1)
                : url.pathname || "/";

        return `${normalizedPathname}${url.search}`;
    } catch {
        return null;
    }
}

export function extractInternalLinkTargets(content?: string, siteUrl?: string): string[] {
    if (!content?.trim()) {
        return [];
    }

    const matches = new Set<string>();
    const baseUrl = getInternalLinkBaseUrl(siteUrl);
    const hostname = new URL(baseUrl).hostname.replace(/^www\./, "");
    const hostnamePattern = escapeRegex(hostname);
    const linkPatterns: Array<{ pattern: RegExp; groupIndex: number }> = [
        {
            pattern: new RegExp(`\\[[^\\]]+\\]\\((\\/[^)\\s]*|https?:\\/\\/(?:www\\.)?${hostnamePattern}(?:\\/[^)\\s]*)?)\\)`, "gi"),
            groupIndex: 1,
        },
        {
            pattern: new RegExp(`href=["'](\\/[^"']*|https?:\\/\\/(?:www\\.)?${hostnamePattern}(?:\\/[^"']*)?)["']`, "gi"),
            groupIndex: 1,
        },
        {
            pattern: new RegExp(`https?:\\/\\/(?:www\\.)?${hostnamePattern}(?:\\/[^\\s)"']*|(?=[\\s)"']))`, "gi"),
            groupIndex: 0,
        },
    ];

    for (const { pattern, groupIndex } of linkPatterns) {
        pattern.lastIndex = 0;
        for (const match of content.matchAll(pattern)) {
            const normalizedHref = normalizeInternalLinkHref(match[groupIndex], baseUrl);
            if (normalizedHref) {
                matches.add(normalizedHref);
            }
        }
    }

    return Array.from(matches);
}

export function hasInternalLinks(content?: string, siteUrl?: string): boolean {
    if (!content) {
        return false;
    }

    return buildInternalLinkPresenceRegex(siteUrl).test(content);
}

export function countInternalLinks(content?: string, siteUrl?: string): number {
    if (!content?.trim()) {
        return 0;
    }

    return extractInternalLinkTargets(content, siteUrl).length;
}
