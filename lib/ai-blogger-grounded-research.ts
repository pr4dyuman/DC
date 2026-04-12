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

const USER_AGENT_DESKTOP =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const USER_AGENT_MOBILE =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export type GroundedSourceFetchDiagnostic = {
    url: string;
    domain: string;
    directStatus: string;
    mobileRetryStatus: string;
    waybackStatus: string;
    ampCacheStatus: string;
    finalResult: "ok" | "failed";
};

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

function buildFetchHeaders(userAgent: string) {
    return {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": userAgent,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    };
}

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

    if (!title) {
        return null;
    }

    // Fall back to page title as summary when description/headings/paragraphs are all empty
    // (common on SDK docs, SPA-heavy pages, and content behind JS rendering)
    const effectiveSummary = summary || sanitizeText(title, 280);

    return {
        id: crypto.randomUUID(),
        title,
        url,
        domain,
        summary: effectiveSummary,
        type,
        freshness,
        trustLevel,
        publishedAt,
        keyClaims,
        citationBlock,
    };
}

async function fetchFromWaybackMachine(url: string): Promise<string | null> {
    try {
        // Try Wayback Machine's most recent snapshot
        const waybackUrl = `https://web.archive.org/web/2024if_/${url}`;
        const response = await fetch(waybackUrl, {
            method: "GET",
            cache: "no-store",
            headers: {
                "User-Agent": USER_AGENT_DESKTOP,
                "Accept": "text/html,application/xhtml+xml",
            },
            redirect: "follow",
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

async function fetchFromAmpCache(url: string): Promise<string | null> {
    try {
        const parsed = new URL(url);
        const ampUrl = `https://${parsed.hostname.replace(/\./g, "-")}.cdn.ampproject.org/c/s/${parsed.hostname}${parsed.pathname}`;
        const response = await fetch(ampUrl, {
            method: "GET",
            cache: "no-store",
            headers: {
                "User-Agent": USER_AGENT_MOBILE,
                "Accept": "text/html,application/xhtml+xml",
            },
            redirect: "follow",
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

function tryParseSourceFromHtml(html: string, url: string, lastModifiedHeader: string | null): BlogStudioExternalSource | null {
    if (isBotBlocked(html)) {
        return null;
    }
    if (html.length < 500) {
        return null;
    }
    return parseHtmlToSource(html, url, lastModifiedHeader);
}

async function directFetch(url: string, userAgent: string): Promise<{ source: BlogStudioExternalSource | null; status: string }> {
    try {
        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
                ...buildFetchHeaders(userAgent),
                "Referer": "https://www.google.com/",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            return { source: null, status: `http-${response.status}` };
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("text/html")) {
            return { source: null, status: `non-html:${contentType.slice(0, 40)}` };
        }

        const html = await response.text();
        if (isBotBlocked(html)) {
            return { source: null, status: "bot-blocked" };
        }
        if (html.length < 500) {
            return { source: null, status: `empty-body:${html.length}b` };
        }

        const source = parseHtmlToSource(html, url, response.headers.get("last-modified"));
        if (source) {
            return { source, status: "ok" };
        }
        return { source: null, status: "parse-failed" };
    } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        return { source: null, status: `error:${message.slice(0, 60)}` };
    }
}

async function fetchGroundedSourceWithDiagnostics(
    url: string,
): Promise<{ source: BlogStudioExternalSource | null; diagnostic: GroundedSourceFetchDiagnostic }> {
    const domain = extractDomain(url);
    const diagnostic: GroundedSourceFetchDiagnostic = {
        url,
        domain,
        directStatus: "skipped",
        mobileRetryStatus: "skipped",
        waybackStatus: "skipped",
        ampCacheStatus: "skipped",
        finalResult: "failed",
    };

    // ─── Strategy 1: Direct fetch with desktop UA ─────────────────
    const desktopResult = await directFetch(url, USER_AGENT_DESKTOP);
    diagnostic.directStatus = desktopResult.status;
    logSourceFetch(url, `direct:${desktopResult.status}`);

    if (desktopResult.source) {
        diagnostic.finalResult = "ok";
        return { source: desktopResult.source, diagnostic };
    }

    // ─── Strategy 2: Retry with mobile UA (bypasses some WAFs) ────
    if (desktopResult.status === "bot-blocked" || desktopResult.status.startsWith("http-403") || desktopResult.status.startsWith("http-429")) {
        const mobileResult = await directFetch(url, USER_AGENT_MOBILE);
        diagnostic.mobileRetryStatus = mobileResult.status;
        logSourceFetch(url, `mobile-retry:${mobileResult.status}`);

        if (mobileResult.source) {
            diagnostic.finalResult = "ok";
            return { source: mobileResult.source, diagnostic };
        }
    }

    // ─── Strategy 3: Wayback Machine fallback ────────────────────
    try {
        logSourceFetch(url, "trying-wayback");
        const waybackHtml = await fetchFromWaybackMachine(url);
        if (waybackHtml) {
            const source = tryParseSourceFromHtml(waybackHtml, url, null);
            if (source) {
                diagnostic.waybackStatus = "ok";
                diagnostic.finalResult = "ok";
                logSourceFetch(url, "wayback-ok", `title: ${source.title.slice(0, 60)}`);
                return { source, diagnostic };
            }
            diagnostic.waybackStatus = "parse-failed";
        } else {
            diagnostic.waybackStatus = "miss";
        }
    } catch {
        diagnostic.waybackStatus = "error";
        logSourceFetch(url, "wayback-error");
    }

    // ─── Strategy 4: Google AMP Cache fallback ───────────────────
    try {
        logSourceFetch(url, "trying-amp-cache");
        const ampHtml = await fetchFromAmpCache(url);
        if (ampHtml) {
            const source = tryParseSourceFromHtml(ampHtml, url, null);
            if (source) {
                diagnostic.ampCacheStatus = "ok";
                diagnostic.finalResult = "ok";
                logSourceFetch(url, "amp-cache-ok", `title: ${source.title.slice(0, 60)}`);
                return { source, diagnostic };
            }
            diagnostic.ampCacheStatus = "parse-failed";
        } else {
            diagnostic.ampCacheStatus = "miss";
        }
    } catch {
        diagnostic.ampCacheStatus = "error";
        logSourceFetch(url, "amp-cache-error");
    }

    logSourceFetch(url, "all-strategies-failed");
    return { source: null, diagnostic };
}

function applyGroundedResearchFilters(
    sources: BlogStudioExternalSource[],
    config: Pick<
        AIBloggerConfig["groundedResearch"],
        "allowedSourceTypes" | "trustPreference" | "freshnessPreference" | "maxSources"
    >,
) {
    const allowedSourceTypes = new Set(config.allowedSourceTypes);
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
            return (
                trustRank[right.trustLevel] - trustRank[left.trustLevel] ||
                freshnessRank[right.freshness] - freshnessRank[left.freshness]
            );
        })
        .slice(0, config.maxSources);
}

function compareGroundedSources(left: BlogStudioExternalSource, right: BlogStudioExternalSource) {
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
        freshnessRank[right.freshness] - freshnessRank[left.freshness] ||
        right.keyClaims.length - left.keyClaims.length
    );
}

function mergeGroundedSources(
    primarySources: BlogStudioExternalSource[],
    supplementalSources: BlogStudioExternalSource[],
    maxSources: number,
) {
    const merged = new Map<string, BlogStudioExternalSource>();

    for (const source of [...primarySources, ...supplementalSources]) {
        if (!merged.has(source.url)) {
            merged.set(source.url, source);
        }
    }

    return Array.from(merged.values())
        .sort(compareGroundedSources)
        .slice(0, maxSources);
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
        bypassCache?: boolean;
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
): Promise<{
    result: AIBloggerGroundedResearch | null;
    fetchDiagnostics: GroundedSourceFetchDiagnostic[];
}> {
    const query = sanitizeText(rawQuery, 180);
    if (!query) {
        return { result: null, fetchDiagnostics: [] };
    }

    const groundedResearchConfig = options.groundedResearchConfig;
    const sourceUrls = pickDiverseUrls(
        options.sourceUrls || [],
        Math.min(Math.max((groundedResearchConfig?.maxSources || 5) * 2, 5), 10),
        groundedResearchConfig?.blockedDomains || [],
    );
    if (sourceUrls.length === 0) {
        return { result: null, fetchDiagnostics: [] };
    }

    const normalizedQuery = normalizeQuery(query);
    const location = sanitizeLocation(options.location);
    const refreshWindowHours = Math.min(Math.max(options.refreshWindowHours || 24, 1), 24 * 30);

    if (options.agencyId && !options.bypassCache) {
        const cached = await getCachedGroundedResearch(
            options.agencyId,
            normalizedQuery,
            location,
            refreshWindowHours,
        );

        if (cached) {
            return { result: cached, fetchDiagnostics: [] };
        }
    }

    const fetchResults = await Promise.all(
        sourceUrls.map((url) => fetchGroundedSourceWithDiagnostics(url)),
    );
    const fetchDiagnostics = fetchResults.map((result) => result.diagnostic);
    const fetchedSources = fetchResults
        .map((result) => result.source)
        .filter((source): source is BlogStudioExternalSource => Boolean(source));

    const resolvedAllowedSourceTypes: BlogStudioExternalSourceType[] =
        (groundedResearchConfig?.allowedSourceTypes?.length ?? 0) > 0
            ? groundedResearchConfig!.allowedSourceTypes!
            : ["government", "education", "official", "industry", "reference", "news"];

    const filterConfig = {
        allowedSourceTypes: resolvedAllowedSourceTypes,
        trustPreference: groundedResearchConfig?.trustPreference || "balanced",
        freshnessPreference: groundedResearchConfig?.freshnessPreference || "balanced",
        maxSources: groundedResearchConfig?.maxSources || 5,
    };

    let sources = applyGroundedResearchFilters(fetchedSources, filterConfig);

    // Fallback pass: if ALL successfully-fetched sources were filtered out, retry
    // with relaxed freshness. This handles authority sites (EY, PwC, McKinsey etc.)
    // that have no publish-date metadata and fall into freshness=\"unknown\".
    if (sources.length === 0 && fetchedSources.length > 0) {
        sources = applyGroundedResearchFilters(fetchedSources, {
            ...filterConfig,
            freshnessPreference: "balanced", // \"balanced\" = no freshness filter
        });
    }

    const minimumDesiredSources = filterConfig.maxSources >= 2 ? 2 : 1;
    if (
        sources.length > 0 &&
        sources.length < minimumDesiredSources &&
        fetchedSources.length > sources.length &&
        filterConfig.trustPreference !== "high-only"
    ) {
        const selectedUrls = new Set(sources.map((source) => source.url));
        const supplementalSources = fetchedSources
            .filter((source) => !selectedUrls.has(source.url))
            .filter((source) => resolvedAllowedSourceTypes.includes(source.type) || source.trustLevel !== "low")
            .sort(compareGroundedSources)
            .slice(0, minimumDesiredSources - sources.length);

        if (supplementalSources.length > 0) {
            sources = mergeGroundedSources(sources, supplementalSources, filterConfig.maxSources);
        }
    }

    if (sources.length === 0) {
        return { result: null, fetchDiagnostics };
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

    return { result: groundedResearch, fetchDiagnostics };
}
