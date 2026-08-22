import { cleanText } from "@/lib/ai-blogger-text-utils";

const MARKETING_SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

const DEFAULT_MARKETING_SITE_URL = "https://digitalcorvids.com";

function normalizeHost(hostname: string) {
    return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function getConfiguredMarketingOrigin() {
    const raw = MARKETING_SITE_URL.trim();
    if (!raw) {
        return "";
    }

    try {
        return new URL(raw).origin;
    } catch {
        return "";
    }
}

function isHttpOrigin(url: URL) {
    return url.protocol === "https:" || url.protocol === "http:";
}

/**
 * Resolve the public marketing origin from trusted application configuration.
 * This deliberately does not accept request headers or an incoming canonical URL.
 */
export function resolveMarketingPublicOrigin(configuredSiteUrl?: string) {
    const raw =
        configuredSiteUrl?.trim() ||
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        DEFAULT_MARKETING_SITE_URL;

    try {
        const parsed = new URL(raw);
        return isHttpOrigin(parsed) ? parsed.origin : DEFAULT_MARKETING_SITE_URL;
    } catch {
        return DEFAULT_MARKETING_SITE_URL;
    }
}

export function buildMarketingBlogUrl(slug: string, configuredSiteUrl?: string) {
    const normalizedSlug = slug.trim();
    const pathname = `/blog/${encodeURIComponent(normalizedSlug)}`;
    return new URL(pathname, resolveMarketingPublicOrigin(configuredSiteUrl)).toString();
}

function isDocumentMarkdown(value: string) {
    return /^\s{0,3}#{1,6}\s+\S/m.test(value);
}

function removeMarkdownFormatting(value: string) {
    return value
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/^\s{0,3}(?:>|[-+*]\s+|\d+[.)]\s+)/gm, "")
        .replace(/[`*_~]+/g, " ");
}

/**
 * Pick a reader-facing short description without persisting document Markdown.
 * A heading-bearing excerpt is treated as raw article content and skipped in
 * favour of metadata or title fallbacks.
 */
export function normalizeMarketingShortDescription(
    candidates: Array<string | null | undefined>,
    maxLength = 260,
) {
    for (const candidate of candidates) {
        const raw = candidate?.trim() || "";
        if (!raw || isDocumentMarkdown(raw)) {
            continue;
        }

        const normalized = cleanText(removeMarkdownFormatting(raw), maxLength);
        if (normalized) {
            return normalized;
        }
    }

    return "Blog article from Digital Corvids.";
}

type MarketingWebhookReceiptInput = {
    id: string;
    slug: string;
    title: string;
    status: string;
};

export function buildMarketingWebhookSuccessReceipt(input: {
    blog: MarketingWebhookReceiptInput;
    isUpdate: boolean;
    processingTime: string;
    configuredSiteUrl?: string;
}) {
    const externalId = input.blog.id;
    const slug = input.blog.slug;

    return {
        success: true,
        message: input.isUpdate ? "Blog updated successfully" : "Blog created successfully",
        externalId,
        externalUrl: buildMarketingBlogUrl(slug, input.configuredSiteUrl),
        slug,
        blog: {
            id: externalId,
            slug,
            title: input.blog.title,
            status: input.blog.status,
        },
        processingTime: input.processingTime,
    };
}

function getRelativeAssetPath(url: URL) {
    const pathname = url.pathname || "/";
    return `${pathname}${url.search}${url.hash}`;
}

export function normalizeMarketingSiteOrigin(value?: string) {
    const raw = value?.trim() || "";
    const configuredOrigin = getConfiguredMarketingOrigin();

    if (!raw) {
        return configuredOrigin;
    }

    try {
        const parsed = new URL(raw);
        if (configuredOrigin) {
            const configured = new URL(configuredOrigin);
            if (normalizeHost(parsed.hostname) === normalizeHost(configured.hostname)) {
                return configured.origin;
            }
        }

        return parsed.origin;
    } catch {
        return configuredOrigin || raw.replace(/\/+$/, "");
    }
}

export function normalizeMarketingCanonicalUrl(value?: string, slug?: string) {
    const raw = value?.trim() || "";
    const configuredOrigin = getConfiguredMarketingOrigin();

    if (raw) {
        try {
            const parsed = new URL(raw);
            const pathname =
                parsed.pathname === "/" && slug
                    ? `/blog/${slug}`
                    : parsed.pathname === "/"
                      ? "/"
                      : parsed.pathname.replace(/\/+$/, "");
            const origin = configuredOrigin
                ? normalizeMarketingSiteOrigin(parsed.origin)
                : parsed.origin;
            return `${origin}${pathname}${parsed.search}${parsed.hash}`;
        } catch {
            // Fall through to generated fallback below.
        }
    }

    if (configuredOrigin && slug) {
        return `${configuredOrigin.replace(/\/+$/, "")}/blog/${slug}`;
    }

    return raw;
}

export function normalizeMarketingImageSrc(value?: string, fallback: string = "/ai-blogger.svg") {
    const raw = value?.trim() || "";
    if (!raw) {
        return fallback;
    }

    const configuredOrigin = getConfiguredMarketingOrigin();

    try {
        if (/^https?:\/\//i.test(raw)) {
            const parsed = new URL(raw);
            if (configuredOrigin) {
                const configured = new URL(configuredOrigin);
                if (normalizeHost(parsed.hostname) === normalizeHost(configured.hostname)) {
                    return getRelativeAssetPath(parsed);
                }
            }

            return parsed.toString();
        }
    } catch {
        return raw;
    }

    return raw.startsWith("/") ? raw : `/${raw}`;
}

export function toAbsoluteMarketingImageUrl(
    value?: string,
    fallback: string = "/ai-blogger.svg",
) {
    const normalized = normalizeMarketingImageSrc(value, fallback);
    if (!normalized) {
        return undefined;
    }

    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    const configuredOrigin = getConfiguredMarketingOrigin();
    if (!configuredOrigin) {
        return normalized;
    }

    return `${configuredOrigin.replace(/\/+$/, "")}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

export function isRemoteMarketingImageSrc(value?: string) {
    const normalized = normalizeMarketingImageSrc(value, "");
    return /^https?:\/\//i.test(normalized);
}

export function isSvgMarketingImageSrc(value?: string) {
    const normalized = normalizeMarketingImageSrc(value, "");
    return /\.svg(?:$|[?#])/i.test(normalized);
}
