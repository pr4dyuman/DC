import "server-only";

import { BlogStudioSiteSnapshotModel, connectDB } from "./mongodb";
import type { BlogStudioSiteSnapshot } from "./types-ai-blogger";
import {
    cleanText,
} from "./ai-blogger-text-utils";

type CrawledPage = {
    url: string;
    title: string;
    description: string;
    headings: string[];
    faqQuestions: string[];
    internalLinks: string[];
    excerpt: string;
    serviceSignals: string[];
    ctaPatterns: string[];
    proofSignals: string[];
};

export type AIBloggerWebsiteIntelligence = {
    sourceUrl: string;
    normalizedUrl: string;
    pageCount: number;
    pageTitles: string[];
    topicHints: string[];
    faqQuestions: string[];
    priorityPaths: string[];
    serviceSignals: string[];
    ctaPatterns: string[];
    proofSignals: string[];
    summary: string;
    cacheStatus: "live" | "cached";
    refreshedAt: string;
};

const DEFAULT_MAX_PAGES = 8;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_REFRESH_WINDOW_HOURS = 24;
const MAX_INTERNAL_LINKS_PER_PAGE = 40;
const MAX_SITEMAP_URLS = 100;
const MAX_NESTED_SITEMAPS = 4;
const USER_AGENT =
    "Mozilla/5.0 (compatible; AIBloggerCrawler/1.0; +https://example.com/ai-blogger)";
const SKIPPED_FILE_PATTERN =
    /\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|rar|7z|mp4|mp3|avi|mov|woff2?|ttf|eot|ico|xml|json)(?:[?#].*)?$/i;
const PRIORITY_SEGMENTS = [
    "service",
    "services",
    "solution",
    "solutions",
    "about",
    "contact",
    "blog",
    "case-study",
    "case-studies",
    "work",
    "industries",
    "pricing",
    "faq",
];

function uniqueStrings(values: string[], maxItems: number, maxLength: number) {
    return Array.from(
        new Set(
            values
                .map((value) => cleanText(value, maxLength))
                .filter(Boolean),
        ),
    ).slice(0, maxItems);
}

export function normalizeUrl(rawUrl: string) {
    const input = rawUrl.trim();

    if (!input) {
        return null;
    }

    const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;

    try {
        const url = new URL(candidate);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return null;
        }

        url.hash = "";

        if (url.pathname !== "/" && url.pathname.endsWith("/")) {
            url.pathname = url.pathname.slice(0, -1);
        }

        return url;
    } catch {
        return null;
    }
}

function extractTitle(html: string) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    );

    return cleanText(titleMatch?.[1] || ogTitleMatch?.[1] || "", 160);
}

function extractDescription(html: string) {
    const descriptionMatch = html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    );
    const ogDescriptionMatch = html.match(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    );

    return cleanText(descriptionMatch?.[1] || ogDescriptionMatch?.[1] || "", 280);
}

function extractHeadings(html: string) {
    const matches = Array.from(
        html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi),
        (match) => match[1],
    );

    return uniqueStrings(matches, 12, 160);
}

function extractFaqQuestions(html: string) {
    const candidates = [
        ...Array.from(html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/gi), (match) => match[1]),
        ...Array.from(html.matchAll(/<button[^>]*>([\s\S]*?\?[\s\S]*?)<\/button>/gi), (match) => match[1]),
        ...Array.from(html.matchAll(/<h[2-4][^>]*>([\s\S]*?\?[\s\S]*?)<\/h[2-4]>/gi), (match) => match[1]),
    ];

    return uniqueStrings(candidates, 8, 180).filter((item) => item.includes("?"));
}

const SERVICE_KEYWORDS = [
    "service", "services", "solution", "solutions", "offering", "offerings",
    "consulting", "development", "design", "marketing", "management",
    "strategy", "implementation", "integration", "support", "maintenance",
    "optimization", "audit", "training", "workshop",
];

function extractServiceSignals(html: string) {
    const candidates: string[] = [];

    const serviceHeadings = Array.from(
        html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi),
        (match) => match[1],
    )
        .map((text) => cleanText(text, 140))
        .filter((text) => {
            const lower = text.toLowerCase();
            return SERVICE_KEYWORDS.some((keyword) => lower.includes(keyword));
        });

    candidates.push(...serviceHeadings);

    const listItems = Array.from(
        html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi),
        (match) => match[1],
    )
        .map((text) => cleanText(text, 140))
        .filter((text) => {
            const lower = text.toLowerCase();
            return text.length >= 12 && text.length <= 140
                && SERVICE_KEYWORDS.some((keyword) => lower.includes(keyword));
        });

    candidates.push(...listItems);

    return uniqueStrings(candidates, 10, 140);
}

const CTA_KEYWORDS = [
    "get started", "contact us", "book a call", "schedule a call",
    "request a quote", "request a demo", "free consultation", "learn more",
    "start your project", "get in touch", "talk to us", "hire us",
    "sign up", "subscribe", "download", "try free", "apply now",
    "book now", "call now", "start now", "join now",
];

function extractCtaPatterns(html: string) {
    const buttonAndLinkTexts = [
        ...Array.from(html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi), (match) => match[1]),
        ...Array.from(html.matchAll(/<a[^>]*class=[^>]*(?:btn|button|cta)[^>]*>([\s\S]*?)<\/a>/gi), (match) => match[1]),
        ...Array.from(html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi), (match) => match[1]),
    ]
        .map((text) => cleanText(text, 80))
        .filter((text) => {
            const lower = text.toLowerCase();
            return text.length >= 5 && text.length <= 80
                && CTA_KEYWORDS.some((keyword) => lower.includes(keyword));
        });

    return uniqueStrings(buttonAndLinkTexts, 8, 80);
}

const PROOF_PATTERNS = [
    /(?:testimonial|review|client says|what (?:our )?(?:clients|customers) say)/i,
    /(?:case stud(?:y|ies)|success stor(?:y|ies)|portfolio|our work)/i,
    /(?:award|certified|certification|accredited|recognized|partner|featured in)/i,
    /(?:\d+\s*\+?\s*(?:years?|clients?|customers?|projects?|employees?|companies|brands))/i,
    /(?:trusted by|worked with|partnered with|chosen by)/i,
    /(?:guarantee|money.?back|satisfaction|risk.?free)/i,
];

function extractProofSignals(html: string) {
    const candidates: string[] = [];

    const allTextBlocks = [
        ...Array.from(html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi), (match) => match[1]),
        ...Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), (match) => match[1]),
        ...Array.from(html.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi), (match) => match[1]),
        ...Array.from(html.matchAll(/<div[^>]*class=[^>]*(?:trust|proof|testimonial|badge|award|stat)[^>]*>([\s\S]*?)<\/div>/gi), (match) => match[1]),
    ]
        .map((text) => cleanText(text, 160))
        .filter((text) => text.length >= 8);

    for (const text of allTextBlocks) {
        if (PROOF_PATTERNS.some((pattern) => pattern.test(text))) {
            candidates.push(text);
        }
    }

    return uniqueStrings(candidates, 8, 160);
}

function extractBodyExcerpt(html: string) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return cleanText(bodyMatch?.[1] || html, 320);
}

function resolveInternalLink(rawHref: string, baseUrl: URL) {
    const href = rawHref.trim();

    if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
    ) {
        return null;
    }

    try {
        const nextUrl = new URL(href, baseUrl);

        if (nextUrl.origin !== baseUrl.origin || SKIPPED_FILE_PATTERN.test(nextUrl.pathname)) {
            return null;
        }

        nextUrl.hash = "";

        if (nextUrl.pathname !== "/" && nextUrl.pathname.endsWith("/")) {
            nextUrl.pathname = nextUrl.pathname.slice(0, -1);
        }

        return nextUrl.toString();
    } catch {
        return null;
    }
}

function normalizePathRule(value: string) {
    const normalized = value.trim();

    if (!normalized) {
        return "";
    }

    if (normalized === "/") {
        return "/";
    }

    return normalized.startsWith("/") ? normalized.replace(/\/+$/, "") || "/" : `/${normalized.replace(/\/+$/, "")}`;
}

function matchesPathRule(pathname: string, rules: string[]) {
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

    return rules.some((rule) => {
        if (rule === "/") {
            return normalizedPath === "/";
        }

        return normalizedPath === rule || normalizedPath.startsWith(`${rule}/`);
    });
}

function scoreInternalLink(link: string) {
    const url = new URL(link);
    const pathname = url.pathname.toLowerCase();
    let score = pathname === "/" ? 1 : 2;

    for (const segment of PRIORITY_SEGMENTS) {
        if (pathname.includes(segment)) {
            score += 8;
        }
    }

    score -= pathname.split("/").filter(Boolean).length;

    return score;
}

function insertScoredLink(queue: string[], link: string) {
    const nextScore = scoreInternalLink(link);
    const insertAt = queue.findIndex((existingLink) => scoreInternalLink(existingLink) < nextScore);

    if (insertAt === -1) {
        queue.push(link);
        return;
    }

    queue.splice(insertAt, 0, link);
}

function extractInternalLinks(html: string, baseUrl: URL) {
    const links = Array.from(
        html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi),
        (match) => match[1],
    )
        .map((href) => resolveInternalLink(href, baseUrl))
        .filter(Boolean) as string[];

    return Array.from(new Set(links))
        .sort((left, right) => scoreInternalLink(right) - scoreInternalLink(left))
        .slice(0, MAX_INTERNAL_LINKS_PER_PAGE);
}

function parseRobotsTxtSitemaps(contents: string) {
    return Array.from(
        contents.matchAll(/^\s*Sitemap:\s*(.+)\s*$/gim),
        (match) => cleanText(match[1], 1000),
    ).filter(Boolean);
}

function parseSitemapLocations(xml: string) {
    return Array.from(
        xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi),
        (match) => cleanText(match[1], 1000)
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, "\"")
            .replace(/&#39;/g, "'"),
    ).filter(Boolean);
}

function isAllowedCrawlPath(pathname: string, allowedPaths: string[], blockedPaths: string[]) {
    if (blockedPaths.length > 0 && matchesPathRule(pathname, blockedPaths)) {
        return false;
    }

    if (allowedPaths.length > 0 && !matchesPathRule(pathname, allowedPaths)) {
        return false;
    }

    return true;
}

async function fetchTextResource(url: URL, timeoutMs: number, accept: string) {
    try {
        const response = await fetch(url.toString(), {
            headers: {
                "User-Agent": USER_AGENT,
                Accept: accept,
            },
            redirect: "follow",
            cache: "no-store",
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
            return "";
        }

        return await response.text();
    } catch {
        return "";
    }
}

async function fetchSitemapLinksFromUrl(
    sitemapUrl: URL,
    baseUrl: URL,
    timeoutMs: number,
    seenSitemaps: Set<string>,
    depth = 0,
): Promise<string[]> {
    if (depth > MAX_NESTED_SITEMAPS || seenSitemaps.has(sitemapUrl.toString())) {
        return [];
    }

    seenSitemaps.add(sitemapUrl.toString());
    const xml = await fetchTextResource(sitemapUrl, timeoutMs, "application/xml,text/xml,text/plain,*/*");

    if (!xml) {
        return [];
    }

    const locations = parseSitemapLocations(xml);
    if (locations.length === 0) {
        return [];
    }

    const isIndex = /<sitemapindex[\s>]/i.test(xml);

    if (isIndex) {
        const nestedLinks: string[] = [];

        for (const location of locations.slice(0, MAX_SITEMAP_URLS)) {
            try {
                const nestedUrl = new URL(location, sitemapUrl);
                if (nestedUrl.origin !== baseUrl.origin) {
                    continue;
                }

                nestedLinks.push(
                    ...(await fetchSitemapLinksFromUrl(
                        nestedUrl,
                        baseUrl,
                        timeoutMs,
                        seenSitemaps,
                        depth + 1,
                    )),
                );

                if (nestedLinks.length >= MAX_SITEMAP_URLS) {
                    break;
                }
            } catch {
                continue;
            }
        }

        return Array.from(new Set(nestedLinks)).slice(0, MAX_SITEMAP_URLS);
    }

    return Array.from(
        new Set(
            locations
                .map((location) => resolveInternalLink(location, baseUrl))
                .filter(Boolean) as string[],
        ),
    ).slice(0, MAX_SITEMAP_URLS);
}

async function getSitemapCandidates(baseUrl: URL, timeoutMs: number) {
    // Start with common sitemap locations that various CMS platforms use.
    const sitemapCandidates = new Set<string>([
        new URL("/sitemap.xml", baseUrl).toString(),
        new URL("/sitemap_index.xml", baseUrl).toString(),
        new URL("/sitemap-index.xml", baseUrl).toString(),
    ]);

    // Try to discover more from robots.txt
    const robotsTxt = await fetchTextResource(new URL("/robots.txt", baseUrl), timeoutMs, "text/plain,*/*");

    if (robotsTxt) {
        parseRobotsTxtSitemaps(robotsTxt).forEach((rawSitemapUrl) => {
            try {
                const sitemapUrl = new URL(rawSitemapUrl, baseUrl);
                if (sitemapUrl.origin === baseUrl.origin) {
                    sitemapCandidates.add(sitemapUrl.toString());
                }
            } catch {
                return;
            }
        });
    } else {
        // No robots.txt — also try CMS-specific sitemap patterns
        console.log(`[AI-BLOGGER] No robots.txt found for ${baseUrl.toString()} — trying common sitemap patterns`);
        sitemapCandidates.add(new URL("/post-sitemap.xml", baseUrl).toString());
        sitemapCandidates.add(new URL("/page-sitemap.xml", baseUrl).toString());
        sitemapCandidates.add(new URL("/wp-sitemap.xml", baseUrl).toString());
    }

    const seenSitemaps = new Set<string>();
    const discoveredLinks: string[] = [];

    for (const sitemapCandidate of sitemapCandidates) {
        try {
            discoveredLinks.push(
                ...(await fetchSitemapLinksFromUrl(
                    new URL(sitemapCandidate),
                    baseUrl,
                    timeoutMs,
                    seenSitemaps,
                )),
            );

            if (discoveredLinks.length >= MAX_SITEMAP_URLS) {
                break;
            }
        } catch {
            continue;
        }
    }

    return Array.from(new Set(discoveredLinks))
        .sort((left, right) => scoreInternalLink(right) - scoreInternalLink(left))
        .slice(0, MAX_SITEMAP_URLS);
}

function enqueueCrawlUrl(
    queue: string[],
    queued: Set<string>,
    visited: Set<string>,
    link: string,
    allowedPaths: string[],
    blockedPaths: string[],
) {
    if (queued.has(link) || visited.has(link)) {
        return;
    }

    try {
        const nextUrl = new URL(link);
        if (!isAllowedCrawlPath(nextUrl.pathname, allowedPaths, blockedPaths)) {
            return;
        }

        queued.add(link);
        insertScoredLink(queue, link);
    } catch {
        return;
    }
}

async function fetchPage(url: URL, timeoutMs: number): Promise<CrawledPage | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url.toString(), {
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: "text/html,application/xhtml+xml",
                },
                redirect: "follow",
                cache: "no-store",
                signal: AbortSignal.timeout(timeoutMs),
            });

            if (!response.ok) {
                // Retry on server errors (502, 503, 504), not on client errors (404, 403)
                if (attempt === 0 && response.status >= 500) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    continue;
                }
                return null;
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.toLowerCase().includes("text/html")) {
                return null;
            }

            const html = await response.text();

            return {
                url: url.toString(),
                title: extractTitle(html),
                description: extractDescription(html),
                headings: extractHeadings(html),
                faqQuestions: extractFaqQuestions(html),
                internalLinks: extractInternalLinks(html, url),
                excerpt: extractBodyExcerpt(html),
                serviceSignals: extractServiceSignals(html),
                ctaPatterns: extractCtaPatterns(html),
                proofSignals: extractProofSignals(html),
            };
        } catch (error) {
            if (attempt === 0) {
                console.warn("[AI-BLOGGER] Retrying page fetch:", url.toString(), error instanceof Error ? error.message : error);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue;
            }
            console.error("[AI-BLOGGER] Failed to fetch page:", url.toString(), error instanceof Error ? error.message : error);
            return null;
        }
    }

    return null;
}

function buildPriorityPaths(pages: CrawledPage[]) {
    return uniqueStrings(
        pages.map((page) => {
            const url = new URL(page.url);
            return url.pathname || "/";
        }),
        50,
        120,
    );
}

function buildTopicHints(pages: CrawledPage[]) {
    return uniqueStrings(
        pages.flatMap((page) => [page.title, page.description, ...page.headings]),
        40,
        120,
    );
}

function buildSummary(sourceUrl: URL, pages: CrawledPage[]) {
    const pageTitles = uniqueStrings(pages.map((page) => page.title), 6, 160);
    const descriptions = uniqueStrings(pages.map((page) => page.description), 4, 220);
    const headings = uniqueStrings(pages.flatMap((page) => page.headings), 10, 140);
    const faqQuestions = uniqueStrings(pages.flatMap((page) => page.faqQuestions), 6, 160);
    const excerpts = uniqueStrings(pages.map((page) => page.excerpt), 3, 220);
    const services = uniqueStrings(pages.flatMap((page) => page.serviceSignals), 8, 140);
    const ctas = uniqueStrings(pages.flatMap((page) => page.ctaPatterns), 6, 140);
    const proof = uniqueStrings(pages.flatMap((page) => page.proofSignals), 6, 160);

    return [
        `Website: ${sourceUrl.toString()}`,
        pageTitles.length > 0 ? `Page titles: ${pageTitles.join(" | ")}` : "",
        descriptions.length > 0 ? `Meta descriptions: ${descriptions.join(" | ")}` : "",
        headings.length > 0 ? `Headings: ${headings.join(" | ")}` : "",
        services.length > 0 ? `Service/offer signals: ${services.join(" | ")}` : "",
        ctas.length > 0 ? `CTA patterns: ${ctas.join(" | ")}` : "",
        proof.length > 0 ? `Trust/proof signals: ${proof.join(" | ")}` : "",
        faqQuestions.length > 0 ? `FAQ signals: ${faqQuestions.join(" | ")}` : "",
        excerpts.length > 0 ? `Business summary: ${excerpts.join(" | ")}` : "",
    ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 3600);
}

function toWebsiteIntelligence(snapshot: Pick<
    BlogStudioSiteSnapshot,
    | "sourceUrl"
    | "normalizedUrl"
    | "pageCount"
    | "pageTitles"
    | "topicHints"
    | "faqQuestions"
    | "priorityPaths"
    | "serviceSignals"
    | "ctaPatterns"
    | "proofSignals"
    | "summary"
    | "refreshedAt"
>): AIBloggerWebsiteIntelligence {
    return {
        sourceUrl: snapshot.sourceUrl,
        normalizedUrl: snapshot.normalizedUrl,
        pageCount: snapshot.pageCount,
        pageTitles: snapshot.pageTitles,
        topicHints: snapshot.topicHints,
        faqQuestions: snapshot.faqQuestions,
        priorityPaths: snapshot.priorityPaths,
        serviceSignals: snapshot.serviceSignals || [],
        ctaPatterns: snapshot.ctaPatterns || [],
        proofSignals: snapshot.proofSignals || [],
        summary: snapshot.summary,
        cacheStatus: "cached",
        refreshedAt: snapshot.refreshedAt,
    };
}

export async function getCachedWebsiteIntelligence(
    agencyId: string,
    normalizedUrl: string,
    refreshWindowHours: number,
    /** If the cached snapshot has fewer pages than this, treat it as stale so we re-crawl with the higher page count. */
    minPages?: number,
) {
    await connectDB();

    const snapshot = await BlogStudioSiteSnapshotModel.findOne({
        agencyId,
        normalizedUrl,
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

    // Smart invalidation: if the admin raised maxPages since the last crawl,
    // skip the cache so a fresh crawl picks up additional pages.
    if (typeof minPages === "number" && minPages > 0 && snapshot.pageCount < minPages) {
        return null;
    }

    return toWebsiteIntelligence(snapshot);
}

async function storeWebsiteIntelligenceSnapshot(
    agencyId: string,
    sourceUrl: string,
    intelligence: AIBloggerWebsiteIntelligence,
) {
    await connectDB();

    const timestamp = intelligence.refreshedAt;

    await BlogStudioSiteSnapshotModel.updateOne(
        {
            agencyId,
            normalizedUrl: intelligence.normalizedUrl,
        },
        {
            $set: {
                agencyId,
                sourceUrl,
                normalizedUrl: intelligence.normalizedUrl,
                pageCount: intelligence.pageCount,
                pageTitles: intelligence.pageTitles,
                topicHints: intelligence.topicHints,
                faqQuestions: intelligence.faqQuestions,
                priorityPaths: intelligence.priorityPaths,
                serviceSignals: intelligence.serviceSignals,
                ctaPatterns: intelligence.ctaPatterns,
                proofSignals: intelligence.proofSignals,
                summary: intelligence.summary,
                refreshedAt: intelligence.refreshedAt,
                updatedAt: timestamp,
            },
            $setOnInsert: {
                id: crypto.randomUUID(),
                createdAt: timestamp,
            },
        },
        {
            upsert: true,
        },
    );
}

export async function getAIBloggerWebsiteIntelligence(
    rawUrl: string,
    options?: {
        agencyId?: string;
        enabled?: boolean;
        maxPages?: number;
        timeoutMs?: number;
        refreshWindowHours?: number;
        allowedPaths?: string[];
        blockedPaths?: string[];
        /** When true, skip the cache entirely and force a fresh live crawl. */
        forceRefresh?: boolean;
    },
): Promise<AIBloggerWebsiteIntelligence | null> {
    const sourceUrl = normalizeUrl(rawUrl);

    if (!sourceUrl) {
        return null;
    }

    if (options?.enabled === false) {
        return null;
    }

    // No hard ceiling — respect whatever the admin configured.
    const maxPages = Math.max(options?.maxPages || DEFAULT_MAX_PAGES, 1);
    const timeoutMs = Math.min(Math.max(options?.timeoutMs || DEFAULT_TIMEOUT_MS, 2000), 30000);
    const refreshWindowHours = Math.min(
        Math.max(options?.refreshWindowHours || DEFAULT_REFRESH_WINDOW_HOURS, 1),
        24 * 30,
    );
    const allowedPaths = (options?.allowedPaths || []).map(normalizePathRule).filter(Boolean);
    const blockedPaths = (options?.blockedPaths || []).map(normalizePathRule).filter(Boolean);

    if (options?.agencyId && !options?.forceRefresh) {
        const cached = await getCachedWebsiteIntelligence(
            options.agencyId,
            sourceUrl.toString(),
            refreshWindowHours,
            // Smart invalidation: skip cache if it has fewer pages than what admin now wants.
            maxPages,
        );

        if (cached) {
            return cached;
        }
    }

    const fetchedPages: CrawledPage[] = [];
    const visited = new Set<string>();

    const primaryPage = await fetchPage(sourceUrl, timeoutMs);

    if (!primaryPage) {
        return null;
    }

    fetchedPages.push(primaryPage);
    visited.add(primaryPage.url);

    const crawlQueue: string[] = [];
    const queued = new Set<string>();
    const sitemapCandidates = maxPages > 1 ? await getSitemapCandidates(sourceUrl, timeoutMs) : [];

    for (const link of [...primaryPage.internalLinks, ...sitemapCandidates]) {
        enqueueCrawlUrl(crawlQueue, queued, visited, link, allowedPaths, blockedPaths);
    }

    while (fetchedPages.length < maxPages && crawlQueue.length > 0) {
        const nextLink = crawlQueue.shift();
        if (!nextLink) {
            break;
        }

        queued.delete(nextLink);
        visited.add(nextLink);

        const nextPage = await fetchPage(new URL(nextLink), timeoutMs);

        if (!nextPage) {
            continue;
        }

        fetchedPages.push(nextPage);

        for (const discoveredLink of nextPage.internalLinks) {
            enqueueCrawlUrl(crawlQueue, queued, visited, discoveredLink, allowedPaths, blockedPaths);
        }
    }

    const intelligence: AIBloggerWebsiteIntelligence = {
        sourceUrl: rawUrl.trim(),
        normalizedUrl: sourceUrl.toString(),
        pageCount: fetchedPages.length,
        pageTitles: uniqueStrings(fetchedPages.map((page) => page.title), 50, 160),
        topicHints: buildTopicHints(fetchedPages),
        faqQuestions: uniqueStrings(fetchedPages.flatMap((page) => page.faqQuestions), 20, 180),
        priorityPaths: buildPriorityPaths(fetchedPages),
        serviceSignals: uniqueStrings(fetchedPages.flatMap((page) => page.serviceSignals), 20, 140),
        ctaPatterns: uniqueStrings(fetchedPages.flatMap((page) => page.ctaPatterns), 16, 140),
        proofSignals: uniqueStrings(fetchedPages.flatMap((page) => page.proofSignals), 16, 160),
        summary: buildSummary(sourceUrl, fetchedPages),
        cacheStatus: "live",
        refreshedAt: new Date().toISOString(),
    };

    if (options?.agencyId) {
        await storeWebsiteIntelligenceSnapshot(options.agencyId, rawUrl.trim(), intelligence);
    }

    return intelligence;
}
