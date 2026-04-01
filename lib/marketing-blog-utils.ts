const MARKETING_SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

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

