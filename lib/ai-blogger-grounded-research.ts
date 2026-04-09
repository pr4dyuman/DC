import "server-only";

import { BlogStudioGroundedResearchSnapshotModel, connectDB } from "./mongodb";
import type { AIBloggerConfig } from "./types";
import type {
    BlogStudioExternalSource,
    BlogStudioExternalSourceFreshness,
    BlogStudioExternalSourceTrustLevel,
    BlogStudioExternalSourceType,
    BlogStudioGroundedResearchSnapshot,
} from "./types-ai-blogger";
import {
    sanitizeText,
    sanitizeStringArray,
    normalizeQuery,
    sanitizeLocation,
    cleanText,
} from "./ai-blogger-text-utils";

export type AIBloggerGroundedResearch = {
    query: string;
    normalizedQuery: string;
    location: string;
    sources: BlogStudioExternalSource[];
    summary: string;
    cacheStatus: "live" | "cached";
    refreshedAt: string;
};

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BOT_BLOCK_SIGNATURES = [
    "<title>Just a moment...</title>",
    "<title>Attention Required</title>",
    "<title>Access Denied</title>",
    "<title>403 Forbidden</title>",
    "cf-browser-verification",
    "_cf_chl_opt",
    "challenges.cloudflare.com",
    "Checking your browser",
    "Please enable cookies",
    "<title>Security Check</title>",
];

function isBotBlocked(html: string): boolean {
    const lowerHtml = html.slice(0, 8000).toLowerCase();
    return BOT_BLOCK_SIGNATURES.some((sig) => lowerHtml.includes(sig.toLowerCase()));
}

function logSourceFetch(url: string, status: string, detail?: string) {
    const domain = extractDomain(url);
    const message = detail ? `[grounded-research] ${domain}: ${status} — ${detail}` : `[grounded-research] ${domain}: ${status}`;
    console.log(message);
}

const BLOCKED_HOST_PATTERNS = [
    /(^|\.)google\./i,
    /(^|\.)youtube\.com$/i,
    /(^|\.)facebook\.com$/i,
    /(^|\.)instagram\.com$/i,
    /(^|\.)linkedin\.com$/i,
    /(^|\.)x\.com$/i,
    /(^|\.)twitter\.com$/i,
    /(^|\.)pinterest\.com$/i,
    /(^|\.)reddit\.com$/i,
];

function extractDomain(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return "";
    }
}

function isAllowedSourceUrl(url: string, blockedDomains: string[] = []) {
    try {
        const parsed = new URL(url);
        if (!/^https?:$/i.test(parsed.protocol)) {
            return false;
        }

        if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip)$/i.test(parsed.pathname)) {
            return false;
        }

        const hostname = parsed.hostname.replace(/^www\./, "");
        if (blockedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
            return false;
        }

        return !BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
    } catch {
        return false;
    }
}

function pickDiverseUrls(urls: string[], maxItems: number, blockedDomains: string[] = []) {
    const seenDomains = new Set<string>();
    const selected: string[] = [];
    const fallbackPool: string[] = [];

    for (const url of urls) {
        if (!isAllowedSourceUrl(url, blockedDomains)) {
            continue;
        }

        const domain = extractDomain(url);
        if (!domain) {
            continue;
        }

        if (seenDomains.has(domain)) {
            fallbackPool.push(url);
            continue;
        }

        seenDomains.add(domain);
        selected.push(url);

        if (selected.length >= maxItems) {
            break;
        }
    }

    if (selected.length < maxItems) {
        for (const url of fallbackPool) {
            if (selected.includes(url)) {
                continue;
            }

            selected.push(url);

            if (selected.length >= maxItems) {
                break;
            }
        }
    }

    return selected;
}

function extractMetaContent(html: string, keys: string[]) {
    for (const key of keys) {
        const metaTagPattern = new RegExp(
            `<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
            "i",
        );
        const contentFirstPattern = new RegExp(
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["'][^>]*>`,
            "i",
        );
        const matchedValue = html.match(metaTagPattern)?.[1] || html.match(contentFirstPattern)?.[1];
        if (matchedValue) {
            return cleanText(matchedValue, 280);
        }
    }

    return "";
}

function extractTitle(html: string) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch?.[1]) {
        return cleanText(titleMatch[1], 180);
    }

    const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return cleanText(headingMatch?.[1] || "", 180);
}

function extractHeadings(html: string) {
    return sanitizeStringArray(
        Array.from(
            html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi),
            (match) => cleanText(match[1], 160),
        ),
        5,
        160,
    );
}

function extractParagraphs(html: string) {
    return sanitizeStringArray(
        Array.from(
            html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi),
            (match) => cleanText(match[1], 240),
        ).filter((paragraph) => paragraph.length >= 60),
        3,
        240,
    );
}

function normalizeIsoDate(value: string | undefined) {
    if (!value) {
        return undefined;
    }

    const normalizedDate = new Date(value);
    if (Number.isNaN(normalizedDate.getTime())) {
        return undefined;
    }

    return normalizedDate.toISOString();
}

function extractPublishedAt(html: string, lastModifiedHeader: string | null) {
    const metaDate =
        extractMetaContent(html, [
            "article:published_time",
            "article:modified_time",
            "og:updated_time",
            "date",
            "publish-date",
            "last-modified",
        ]) || sanitizeText(lastModifiedHeader, 64);

    const directIsoMatch = metaDate.match(/\d{4}-\d{2}-\d{2}(?:[tT ][\d:.+-Z]*)?/);
    if (directIsoMatch?.[0]) {
        return normalizeIsoDate(directIsoMatch[0]);
    }

    const timeTagMatch = html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1];
    if (timeTagMatch) {
        return normalizeIsoDate(timeTagMatch);
    }

    return undefined;
}

function getSourceType(domain: string, url: string, title: string, description: string): BlogStudioExternalSourceType {
    const combined = `${domain} ${url} ${title} ${description}`.toLowerCase();

    if (domain.endsWith(".gov")) {
        return "government";
    }

    if (domain.endsWith(".edu")) {
        return "education";
    }

    if (/\b(news|press|magazine|journal|daily|times|wire)\b/.test(combined)) {
        return "news";
    }

    if (/\b(docs|documentation|guide|support|help center|academy|developers)\b/.test(combined)) {
        return "official";
    }

    if (/\b(competitor|alternative|compare)\b/.test(combined)) {
        return "competitor";
    }

    if (domain.endsWith(".org") || /\b(wikipedia|reference|encyclopedia|research)\b/.test(combined)) {
        return "reference";
    }

    if (/\b(official|google search central|hubspot|semrush|ahrefs|moz)\b/.test(combined)) {
        return "official";
    }

    return "industry";
}

function getFreshness(
    publishedAt: string | undefined,
    type: BlogStudioExternalSourceType,
): BlogStudioExternalSourceFreshness {
    if (publishedAt) {
        const ageMs = Date.now() - new Date(publishedAt).getTime();
        const dayMs = 24 * 60 * 60 * 1000;

        if (ageMs <= 90 * dayMs) {
            return "current";
        }

        if (ageMs <= 730 * dayMs) {
            return "recent";
        }

        return "dated";
    }

    if (type === "government" || type === "education" || type === "official" || type === "reference") {
        return "evergreen";
    }

    return "unknown";
}

function getTrustLevel(
    type: BlogStudioExternalSourceType,
    domain: string,
    publishedAt: string | undefined,
): BlogStudioExternalSourceTrustLevel {
    if (type === "government" || type === "education") {
        return "high";
    }

    if (type === "official" || type === "reference") {
        return "high";
    }

    if (type === "news") {
        return publishedAt ? "medium" : "low";
    }

    if (type === "industry") {
        return /\b(google|hubspot|semrush|ahrefs|moz)\b/i.test(domain) ? "high" : "medium";
    }

    return "medium";
}

function buildSourceSummary(title: string, description: string, headings: string[], paragraphs: string[]) {
    return sanitizeText(
        [description, ...headings.slice(0, 2), ...paragraphs.slice(0, 2)]
            .filter(Boolean)
            .join(" "),
        420,
        title,
    );
}

// ─── Source-to-Claim Mapping ─────────────────────────────────────────

const CLAIM_PATTERNS = [
    /\b\d+(?:\.\d+)?\s*%/,
    /\b\d{1,3}(?:,\d{3})+\b/,
    /\b(?:increase|decrease|grow|decline|rise|fell|dropped|surged)\s+(?:by\s+)?\d/i,
    /\b(?:according to|research shows|studies show|data shows|survey found|report found)\b/i,
    /\b(?:more than|less than|over|under|approximately|nearly|about)\s+\d/i,
    /\b(?:\d+x|\d+-fold|double|triple|quadruple)\b/i,
];

function extractKeyClaims(paragraphs: string[]) {
    const claims: string[] = [];

    for (const paragraph of paragraphs) {
        if (paragraph.length < 30) {
            continue;
        }

        const hasClaimSignal = CLAIM_PATTERNS.some((pattern) => pattern.test(paragraph));
        if (hasClaimSignal) {
            claims.push(sanitizeText(paragraph, 200));
        }
    }

    return sanitizeStringArray(claims, 3, 200);
}

// ─── Citation Block Builder ──────────────────────────────────────────

function buildCitationBlock(
    title: string,
    url: string,
    domain: string,
    publishedAt: string | undefined,
    type: BlogStudioExternalSourceType,
) {
    const parts = [title];

    if (publishedAt) {
        const date = new Date(publishedAt);
        if (!Number.isNaN(date.getTime())) {
            parts.push(`(${date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })})`);
        }
    }

    parts.push(`[${domain}]`);
    parts.push(`Source type: ${type}`);
    parts.push(url);

    return parts.join(" — ");
}

function buildGroundedResearchSummary(query: string, sources: BlogStudioExternalSource[]) {
    const highTrustCount = sources.filter((source) => source.trustLevel === "high").length;
    const sourceTypes = sanitizeStringArray(sources.map((source) => source.type), 4, 40);
    const uniqueDomains = new Set(sources.map((source) => source.domain)).size;
    const freshSources = sources.filter((source) =>
        source.freshness === "current" || source.freshness === "recent",
    ).length;
    const totalClaims = sources.reduce((sum, source) => sum + (source.keyClaims?.length || 0), 0);

    const diversityLabel = uniqueDomains >= sources.length * 0.8
        ? "High diversity"
        : uniqueDomains >= sources.length * 0.5
            ? "Moderate diversity"
            : "Low diversity";

    return sanitizeText(
        [
            `Captured ${sources.length} grounded sources for "${query}".`,
            `High-trust: ${highTrustCount}. Fresh: ${freshSources}. Claims extracted: ${totalClaims}.`,
            `Source diversity: ${diversityLabel} (${uniqueDomains} unique domains).`,
            `Coverage mix: ${sourceTypes.join(", ") || "general reference"}.`,
        ].join(" "),
        400,
    );
}

const FETCH_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "User-Agent": USER_AGENT,
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
};

const FETCH_TIMEOUT_MS = 15_000;

function parseHtmlToSource(html: string, url: string, lastModifiedHeader: string | null): BlogStudioExternalSource | null {
    const domain = extractDomain(url);
    const title = extractTitle(html);
    const description = extractMetaContent(html, [
        "description",
        "og:description",
        "twitter:description",
    ]);
    const headings = extractHeadings(html);
    const paragraphs = extractParagraphs(html);
    const publishedAt = extractPublishedAt(html, lastModifiedHeader);
    const type = getSourceType(domain, url, title, description);
    const freshness = getFreshness(publishedAt, type);
    const trustLevel = getTrustLevel(type, domain, publishedAt);
    const summary = buildSourceSummary(title, description, headings, paragraphs);
    const keyClaims = extractKeyClaims(paragraphs);
    const citationBlock = buildCitationBlock(title, url, domain, publishedAt, type);

    if (!title || !summary) {
        return null;
    }

    return {
        id: crypto.randomUUID(),
        title,
        url,
        domain,
        summary,
        type,
        freshness,
        trustLevel,
        publishedAt,
        keyClaims,
        citationBlock,
    };
}

async function fetchFromWebCache(url: string): Promise<string | null> {
    try {
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const response = await fetch(cacheUrl, {
            method: "GET",
            cache: "no-store",
            headers: {
                ...FETCH_HEADERS,
                "Referer": "https://www.google.com/",
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("text/html")) {
            return null;
        }

        const html = await response.text();
        if (isBotBlocked(html) || html.length < 500) {
            return null;
        }

        return html;
    } catch {
        return null;
    }
}

async function fetchGroundedSource(url: string): Promise<BlogStudioExternalSource | null> {
    // ─── Direct fetch ────────────────────────────────────────────────
    try {
        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                ...FETCH_HEADERS,
                "Referer": "https://www.google.com/",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            logSourceFetch(url, "http-error", `status ${response.status}`);
        } else {
            const contentType = response.headers.get("content-type") || "";
            if (!contentType.toLowerCase().includes("text/html")) {
                logSourceFetch(url, "non-html", contentType);
            } else {
                const html = await response.text();

                if (isBotBlocked(html)) {
                    logSourceFetch(url, "bot-blocked", "Cloudflare/WAF challenge detected");
                } else if (html.length < 500) {
                    logSourceFetch(url, "empty-body", `${html.length} bytes`);
                } else {
                    const source = parseHtmlToSource(html, url, response.headers.get("last-modified"));
                    if (source) {
                        logSourceFetch(url, "ok", `title: ${source.title.slice(0, 60)}`);
                        return source;
                    }
                    logSourceFetch(url, "parse-failed", "no title or summary extracted");
                }
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        logSourceFetch(url, "fetch-error", message.slice(0, 100));
    }

    // ─── WebCache fallback ───────────────────────────────────────────
    try {
        logSourceFetch(url, "trying-webcache");
        const cachedHtml = await fetchFromWebCache(url);
        if (cachedHtml) {
            const source = parseHtmlToSource(cachedHtml, url, null);
            if (source) {
                logSourceFetch(url, "webcache-ok", `title: ${source.title.slice(0, 60)}`);
                return source;
            }
            logSourceFetch(url, "webcache-parse-failed", "no title or summary extracted");
        } else {
            logSourceFetch(url, "webcache-miss", "not available in cache");
        }
    } catch {
        logSourceFetch(url, "webcache-error");
    }

    return null;
}

function applyGroundedResearchFilters(
    sources: BlogStudioExternalSource[],
    config: Pick<
        AIBloggerConfig["groundedResearch"],
        "allowedSourceTypes" | "trustPreference" | "freshnessPreference" | "maxSources"
    >,
) {
    const allowedSourceTypes = new Set(config.allowedSourceTypes);

    return sources
        .filter((source) => allowedSourceTypes.has(source.type))
        .filter((source) => {
            if (config.trustPreference === "high-only") {
                return source.trustLevel === "high";
            }

            return true;
        })
        .filter((source) => {
            if (config.freshnessPreference === "recent-first") {
                return source.freshness === "current" || source.freshness === "recent";
            }

            if (config.freshnessPreference === "evergreen-ok") {
                return source.freshness !== "dated";
            }

            return true;
        })
        .sort((left, right) => {
            const trustRank: Record<BlogStudioExternalSourceTrustLevel, number> = {
                high: 3,
                medium: 2,
                low: 1,
            };
            const freshnessRank: Record<BlogStudioExternalSourceFreshness, number> = {
                current: 5,
                recent: 4,
                evergreen: 3,
                unknown: 2,
                dated: 1,
            };

            return (
                trustRank[right.trustLevel] - trustRank[left.trustLevel] ||
                freshnessRank[right.freshness] - freshnessRank[left.freshness]
            );
        })
        .slice(0, config.maxSources);
}

function toGroundedResearch(
    snapshot: Pick<
        BlogStudioGroundedResearchSnapshot,
        "query" | "normalizedQuery" | "location" | "sources" | "summary" | "refreshedAt"
    >,
): AIBloggerGroundedResearch {
    return {
        query: snapshot.query,
        normalizedQuery: snapshot.normalizedQuery,
        location: snapshot.location,
        sources: snapshot.sources,
        summary: snapshot.summary,
        cacheStatus: "cached",
        refreshedAt: snapshot.refreshedAt,
    };
}

async function getCachedGroundedResearch(
    agencyId: string,
    normalizedQuery: string,
    location: string,
    refreshWindowHours: number,
) {
    await connectDB();

    const snapshot = await BlogStudioGroundedResearchSnapshotModel.findOne({
        agencyId,
        normalizedQuery,
        location,
    }).lean();

    if (!snapshot?.refreshedAt) {
        return null;
    }

    const refreshedAtMs = new Date(snapshot.refreshedAt).getTime();
    if (Number.isNaN(refreshedAtMs)) {
        return null;
    }

    const refreshWindowMs = refreshWindowHours * 60 * 60 * 1000;
    if (Date.now() - refreshedAtMs > refreshWindowMs) {
        return null;
    }

    return toGroundedResearch(snapshot);
}

async function storeGroundedResearchSnapshot(
    agencyId: string,
    groundedResearch: AIBloggerGroundedResearch,
) {
    await connectDB();

    const timestamp = groundedResearch.refreshedAt;

    await BlogStudioGroundedResearchSnapshotModel.updateOne(
        {
            agencyId,
            normalizedQuery: groundedResearch.normalizedQuery,
            location: groundedResearch.location,
        },
        {
            $set: {
                query: groundedResearch.query,
                normalizedQuery: groundedResearch.normalizedQuery,
                location: groundedResearch.location,
                sources: groundedResearch.sources,
                summary: groundedResearch.summary,
                refreshedAt: groundedResearch.refreshedAt,
                updatedAt: timestamp,
            },
            $setOnInsert: {
                id: crypto.randomUUID(),
                agencyId,
                createdAt: timestamp,
            },
        },
        { upsert: true },
    );
}

export async function getAIBloggerGroundedResearch(
    rawQuery: string,
    options: {
        agencyId?: string;
        location?: string;
        refreshWindowHours?: number;
        sourceUrls?: string[];
        groundedResearchConfig?: Pick<
            AIBloggerConfig["groundedResearch"],
            | "maxSources"
            | "allowedSourceTypes"
            | "blockedDomains"
            | "trustPreference"
            | "freshnessPreference"
        >;
    },
): Promise<AIBloggerGroundedResearch | null> {
    const query = sanitizeText(rawQuery, 180);
    if (!query) {
        return null;
    }

    const groundedResearchConfig = options.groundedResearchConfig;
    const sourceUrls = pickDiverseUrls(
        options.sourceUrls || [],
        Math.min(Math.max((groundedResearchConfig?.maxSources || 5) * 2, 5), 10),
        groundedResearchConfig?.blockedDomains || [],
    );
    if (sourceUrls.length === 0) {
        return null;
    }

    const normalizedQuery = normalizeQuery(query);
    const location = sanitizeLocation(options.location);
    const refreshWindowHours = Math.min(Math.max(options.refreshWindowHours || 24, 1), 24 * 30);

    if (options.agencyId) {
        const cached = await getCachedGroundedResearch(
            options.agencyId,
            normalizedQuery,
            location,
            refreshWindowHours,
        );

        if (cached) {
            return cached;
        }
    }

    const fetchedSources = (
        await Promise.all(sourceUrls.map((url) => fetchGroundedSource(url)))
    )
        .filter((source): source is BlogStudioExternalSource => Boolean(source));

    const sources = applyGroundedResearchFilters(fetchedSources, {
        allowedSourceTypes:
            groundedResearchConfig?.allowedSourceTypes || [
                "government",
                "education",
                "official",
                "industry",
                "reference",
                "news",
            ],
        trustPreference: groundedResearchConfig?.trustPreference || "balanced",
        freshnessPreference: groundedResearchConfig?.freshnessPreference || "balanced",
        maxSources: groundedResearchConfig?.maxSources || 5,
    });

    if (sources.length === 0) {
        return null;
    }

    const groundedResearch: AIBloggerGroundedResearch = {
        query,
        normalizedQuery,
        location,
        sources,
        summary: buildGroundedResearchSummary(query, sources),
        cacheStatus: "live",
        refreshedAt: new Date().toISOString(),
    };

    if (options.agencyId) {
        await storeGroundedResearchSnapshot(options.agencyId, groundedResearch);
    }

    return groundedResearch;
}
