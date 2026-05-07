import "server-only";

import { BlogStudioSiteSnapshotModel, connectDB } from "./mongodb";
import type {
    BlogStudioSiteAuthorityProfile,
    BlogStudioSitePriorityPage,
    BlogStudioSitePriorityPageCategory,
    BlogStudioSiteSnapshot,
} from "./types-ai-blogger";
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
    contentHighlights: string[];
    serviceSignals: string[];
    schemaTypes: string[];
    ctaPatterns: string[];
    proofSignals: string[];
    pageScore: number;
};

export type AIBloggerWebsiteIntelligence = {
    sourceUrl: string;
    normalizedUrl: string;
    pageCount: number;
    pageTitles: string[];
    topicHints: string[];
    faqQuestions: string[];
    priorityPaths: string[];
    priorityPages: BlogStudioSitePriorityPage[];
    authorityProfile?: BlogStudioSiteAuthorityProfile;
    serviceSignals: string[];
    ctaPatterns: string[];
    proofSignals: string[];
    summary: string;
    cacheStatus: "live" | "cached";
    refreshedAt: string;
};

const DEFAULT_MAX_PAGES = 8;
const DEFAULT_TIMEOUT_MS = 8000;
export const DEFAULT_REFRESH_WINDOW_HOURS = 6;  // Re-crawl if cache is older than 6h (was 24h)
const DEFAULT_TOTAL_CRAWL_BUDGET_MS = 30_000;
const MIN_TOTAL_CRAWL_BUDGET_MS = 10_000;
const MAX_TOTAL_CRAWL_BUDGET_MS = 75_000;
const DEFAULT_CRAWL_CONCURRENCY = 3;
const MAX_CRAWL_CONCURRENCY = 4;
const MIN_TIME_SLICE_MS = 1200;
const REQUEST_BUFFER_MS = 750;
const RETRY_DELAY_MS = 750;
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
    "product",
    "products",
    "collection",
    "collections",
    "category",
    "categories",
    "brand",
    "brands",
    "shop",
    "store",
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
const AUTO_BLOCKED_SEGMENTS = [
    "privacy",
    "terms",
    "term",
    "cookie",
    "cookies",
    "author",
    "feed",
    "wp-admin",
    "wp-login",
    "login",
    "signin",
    "sign-in",
    "checkout",
    "cart",
    "cdn-cgi",
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

const BOILERPLATE_SNIPPET_PATTERNS = [
    /\bloading testimonials\b/i,
    /\ball rights reserved\b/i,
    /\bprivacy policy\b/i,
    /\bcookie policy\b/i,
    /\bterms(?: of service)?\b/i,
    /\baccept cookies\b/i,
    /\bfollow us\b/i,
    /\bskip to content\b/i,
];

function getUppercaseRatio(value: string) {
    const letters = value.replace(/[^A-Za-z]/g, "");
    if (!letters) {
        return 0;
    }

    const uppercaseLetters = letters.replace(/[^A-Z]/g, "");
    return uppercaseLetters.length / letters.length;
}

function looksLikeNavigationCluster(value: string) {
    const cleaned = cleanText(value, 220);
    if (!cleaned) {
        return true;
    }

    const lower = cleaned.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);
    const navKeywordCount = words.filter((word) =>
        [
            "home",
            "services",
            "service",
            "about",
            "contact",
            "blog",
            "pricing",
            "seo",
            "marketing",
            "development",
            "design",
            "video",
            "ppc",
            "team",
        ].includes(word),
    ).length;

    if (BOILERPLATE_SNIPPET_PATTERNS.some((pattern) => pattern.test(lower))) {
        return true;
    }

    if (getUppercaseRatio(cleaned) >= 0.7 && words.length >= 4 && !/[.!?]/.test(cleaned)) {
        return true;
    }

    return navKeywordCount >= 4 && words.length >= 6 && !/[.!?]/.test(cleaned);
}

function isMeaningfulTopicHint(value: string) {
    const cleaned = cleanText(value, 180);
    if (!cleaned) {
        return false;
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length < 4 || cleaned.length < 24) {
        return false;
    }

    return !looksLikeNavigationCluster(cleaned);
}

function fallbackPageTitle(pathname: string) {
    if (!pathname || pathname === "/") {
        return "Home";
    }

    const segments = pathname
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean);

    if (segments.length === 0) {
        return "Home";
    }

    return segments[segments.length - 1]
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function containsAnyKeyword(values: string[], keywords: string[]) {
    const haystack = ` ${values
        .filter(Boolean)
        .join(" ")
        .replace(/[^a-z0-9]+/gi, " ")
        .toLowerCase()} `;

    return keywords.some((keyword) =>
        haystack.includes(` ${keyword.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `),
    );
}

function hasAnySchemaType(page: Pick<CrawledPage, "schemaTypes">, types: string[]) {
    const schemaTypes = new Set(
        (page.schemaTypes || [])
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
    );

    return types.some((type) => schemaTypes.has(type.toLowerCase()));
}

function isProductPath(pathname: string) {
    return /(^|\/)(products?|items?|sku)(\/|$)/.test(pathname);
}

function isCollectionPath(pathname: string) {
    return /(^|\/)(collections?|catalog|catalogue|shop|store)(\/|$)/.test(pathname);
}

function isCategoryPath(pathname: string) {
    return /(^|\/)(categories?|departments?)(\/|$)/.test(pathname);
}

function isBrandPath(pathname: string) {
    return /(^|\/)(brands?|manufacturers?|makers?)(\/|$)/.test(pathname);
}

function isServicePath(pathname: string) {
    return /(^|\/)(services?|offers?|consulting|implementation)(\/|$)/.test(pathname);
}

function isSolutionPath(pathname: string) {
    return /(^|\/)(solutions?|platforms?|workflows?)(\/|$)/.test(pathname);
}

function isPricingPath(pathname: string) {
    return /(^|\/)(pricing|plans?|packages?|costs?|quotes?)(\/|$)/.test(pathname);
}

function isCaseStudyPath(pathname: string) {
    return /(^|\/)(case-studies?|work|portfolio|results|customer-stories?|success-stories?)(\/|$)/.test(pathname);
}

function isIndustryPath(pathname: string) {
    return /(^|\/)(industr(y|ies)|sectors?|verticals?)(\/|$)/.test(pathname);
}

function isBlogPath(pathname: string) {
    return /(^|\/)(blog|blogs|articles?|resources?|news|insights)(\/|$)/.test(pathname);
}

function isFaqPath(pathname: string) {
    return /(^|\/)(faq|faqs|help|questions)(\/|$)/.test(pathname);
}

function isAboutPath(pathname: string) {
    return /(^|\/)(about|company|team)(\/|$)/.test(pathname);
}

function isContactPath(pathname: string) {
    return /(^|\/)(contact|book|demo|consultation|schedule|get-started)(\/|$)/.test(pathname);
}

function classifyPriorityPageCategory(page: CrawledPage): BlogStudioSitePriorityPageCategory {
    const pathname = new URL(page.url).pathname.toLowerCase() || "/";
    const signals = [
        pathname,
        page.title,
        page.description,
        page.excerpt,
        ...page.serviceSignals,
        ...page.ctaPatterns,
        ...page.proofSignals,
    ];

    if (pathname === "/") {
        return "home";
    }

    if (isProductPath(pathname)) {
        return "product";
    }

    if (isCollectionPath(pathname)) {
        return "collection";
    }

    if (isCategoryPath(pathname)) {
        return "category";
    }

    if (isBrandPath(pathname)) {
        return "brand";
    }

    if (isPricingPath(pathname)) {
        return "pricing";
    }

    if (isCaseStudyPath(pathname)) {
        return "case-study";
    }

    if (isIndustryPath(pathname)) {
        return "industry";
    }

    if (isSolutionPath(pathname)) {
        return "solution";
    }

    if (isServicePath(pathname)) {
        return "service";
    }

    if (isBlogPath(pathname)) {
        return "blog";
    }

    if (isFaqPath(pathname)) {
        return "faq";
    }

    if (isAboutPath(pathname)) {
        return "about";
    }

    if (isContactPath(pathname)) {
        return "contact";
    }

    if (hasAnySchemaType(page, ["product"])) {
        return "product";
    }

    if (hasAnySchemaType(page, ["collectionpage"])) {
        return "collection";
    }

    if (containsAnyKeyword(signals, ["pricing", "plan", "plans", "package", "packages", "cost", "costs", "quote"])) {
        return "pricing";
    }

    if (containsAnyKeyword(signals, ["case-study", "case studies", "customer story", "customer stories", "success story", "success stories", "portfolio", "results", "our work"])) {
        return "case-study";
    }

    if (containsAnyKeyword(signals, ["industry", "industries", "sector", "sectors", "vertical", "verticals"])) {
        return "industry";
    }

    if (containsAnyKeyword(signals, ["blog", "blogs", "article", "articles", "news", "resource", "resources", "insights"])) {
        return "blog";
    }

    if (containsAnyKeyword(signals, ["faq", "faqs", "frequently asked", "questions", "help center"])) {
        return "faq";
    }

    if (containsAnyKeyword(signals, ["about", "company", "team", "who we are"])) {
        return "about";
    }

    if (containsAnyKeyword(signals, ["contact", "book a call", "schedule a call", "request a demo", "request a quote", "get in touch"])) {
        return "contact";
    }

    if (containsAnyKeyword(signals, ["product", "products", "sku", "model", "variant", "variants"])) {
        return "product";
    }

    if (containsAnyKeyword(signals, ["collection", "collections", "catalog", "catalogue", "shop", "store"])) {
        return "collection";
    }

    if (containsAnyKeyword(signals, ["category", "categories", "department", "departments"])) {
        return "category";
    }

    if (containsAnyKeyword(signals, ["brand", "brands", "manufacturer", "manufacturers"])) {
        return "brand";
    }

    if (containsAnyKeyword(signals, ["solution", "solutions", "platform", "workflow"])) {
        return "solution";
    }

    if (
        page.serviceSignals.length > 0
        || containsAnyKeyword(signals, ["service", "services", "offering", "offerings", "consulting", "implementation"])
    ) {
        return "service";
    }

    return "general";
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
        url.search = "";

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
    "product", "products", "collection", "collections", "category", "categories",
    "brand", "brands", "bundle", "bundles", "variant", "variants", "sku",
];

function extractStructuredDataEntities(html: string) {
    const rawBlocks = Array.from(
        html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
        (match) => match[1]?.trim() || "",
    ).filter(Boolean);

    const entities: Array<Record<string, unknown>> = [];

    const visitNode = (value: unknown) => {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(visitNode);
            return;
        }

        if (typeof value !== "object") {
            return;
        }

        const node = value as Record<string, unknown>;
        entities.push(node);

        if (Array.isArray(node["@graph"])) {
            node["@graph"].forEach(visitNode);
        }
    };

    for (const block of rawBlocks) {
        try {
            visitNode(JSON.parse(block));
        } catch {
            // Ignore invalid or non-JSON payloads quietly.
        }
    }

    return entities;
}

function extractStructuredDataTypes(html: string) {
    const types = extractStructuredDataEntities(html).flatMap((entity) => {
        const rawType = entity["@type"];

        if (typeof rawType === "string") {
            return [rawType];
        }

        if (Array.isArray(rawType)) {
            return rawType.filter((value): value is string => typeof value === "string");
        }

        return [];
    });

    return uniqueStrings(types, 12, 80).map((value) => value.toLowerCase());
}

function extractStructuredDataCommercialSignals(html: string) {
    const signals: string[] = [];

    for (const entity of extractStructuredDataEntities(html)) {
        const rawType = entity["@type"];
        const types = Array.isArray(rawType)
            ? rawType.filter((value): value is string => typeof value === "string").map((value) => value.toLowerCase())
            : typeof rawType === "string"
                ? [rawType.toLowerCase()]
                : [];

        if (!types.some((type) => ["product", "collectionpage", "brand"].includes(type))) {
            continue;
        }

        if (typeof entity.name === "string") {
            signals.push(entity.name);
        }

        if (typeof entity.category === "string") {
            signals.push(entity.category);
        }

        const brandValue = entity.brand;
        if (typeof brandValue === "string") {
            signals.push(brandValue);
        } else if (brandValue && typeof brandValue === "object" && typeof (brandValue as { name?: unknown }).name === "string") {
            signals.push((brandValue as { name: string }).name);
        }
    }

    return uniqueStrings(signals, 10, 140);
}

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
        })
        .filter((text) => !looksLikeNavigationCluster(text));

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
        })
        .filter((text) => !looksLikeNavigationCluster(text));

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
        if (!looksLikeNavigationCluster(text) && PROOF_PATTERNS.some((pattern) => pattern.test(text))) {
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

        nextUrl.search = "";
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

function getPathSegments(pathname: string) {
    return pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => segment.toLowerCase());
}

function isAutoBlockedPath(pathname: string) {
    const segments = getPathSegments(pathname);
    return segments.some((segment) => AUTO_BLOCKED_SEGMENTS.includes(segment));
}

function getRemainingBudgetMs(deadlineMs: number) {
    return deadlineMs - Date.now();
}

function hasBudgetRemaining(deadlineMs: number, minimumMs = MIN_TIME_SLICE_MS) {
    return getRemainingBudgetMs(deadlineMs) > minimumMs;
}

function getEffectiveRequestTimeout(timeoutMs: number, deadlineMs: number) {
    const remainingMs = getRemainingBudgetMs(deadlineMs) - REQUEST_BUFFER_MS;

    if (remainingMs < MIN_TIME_SLICE_MS) {
        return 0;
    }

    return Math.min(timeoutMs, remainingMs);
}

function wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function scoreInternalLink(link: string) {
    const url = new URL(link);
    const pathname = url.pathname.toLowerCase();
    const segments = getPathSegments(pathname);

    if (isAutoBlockedPath(pathname)) {
        return -50;
    }

    let score = pathname === "/" ? 2 : 4;

    for (const segment of PRIORITY_SEGMENTS) {
        if (pathname.includes(segment)) {
            score += 8;
        }
    }

    if (pathname.includes("/blog/")) {
        score += 2;
    }

    if (segments.some((segment) => /^\d{4}$/.test(segment) || segment.length > 48)) {
        score -= 3;
    }

    score -= Math.max(0, segments.length - 1);

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

    if (allowedPaths.length === 0 && isAutoBlockedPath(pathname)) {
        return false;
    }

    return true;
}

async function fetchTextResource(url: URL, timeoutMs: number, accept: string, deadlineMs: number) {
    const effectiveTimeoutMs = getEffectiveRequestTimeout(timeoutMs, deadlineMs);

    if (effectiveTimeoutMs <= 0) {
        return "";
    }

    try {
        const response = await fetch(url.toString(), {
            headers: {
                "User-Agent": USER_AGENT,
                Accept: accept,
            },
            redirect: "follow",
            cache: "no-store",
            signal: AbortSignal.timeout(effectiveTimeoutMs),
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
    deadlineMs: number,
    seenSitemaps: Set<string>,
    depth = 0,
): Promise<string[]> {
    if (
        depth > MAX_NESTED_SITEMAPS
        || seenSitemaps.has(sitemapUrl.toString())
        || !hasBudgetRemaining(deadlineMs)
    ) {
        return [];
    }

    seenSitemaps.add(sitemapUrl.toString());
    const xml = await fetchTextResource(
        sitemapUrl,
        timeoutMs,
        "application/xml,text/xml,text/plain,*/*",
        deadlineMs,
    );

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
                        deadlineMs,
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

async function getSitemapCandidates(baseUrl: URL, timeoutMs: number, deadlineMs: number) {
    if (!hasBudgetRemaining(deadlineMs)) {
        return [];
    }

    // Start with common sitemap locations that various CMS platforms use.
    const sitemapCandidates = new Set<string>([
        new URL("/sitemap.xml", baseUrl).toString(),
        new URL("/sitemap_index.xml", baseUrl).toString(),
        new URL("/sitemap-index.xml", baseUrl).toString(),
    ]);

    // Try to discover more from robots.txt
    const robotsTxt = await fetchTextResource(
        new URL("/robots.txt", baseUrl),
        timeoutMs,
        "text/plain,*/*",
        deadlineMs,
    );

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
                    deadlineMs,
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

function extractPrimaryContentHtml(html: string) {
    const candidates = [
        html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1],
        html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1],
        html.match(
            /<(?:div|section)[^>]+(?:id|class|role)=["'][^"']*(?:main|content|primary|article)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/i,
        )?.[1],
        html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1],
    ];

    return candidates.find(Boolean) || html;
}

function stripBoilerplateHtml(html: string) {
    return html
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<(?:script|style|noscript|svg)[^>]*>[\s\S]*?<\/(?:script|style|noscript|svg)>/gi, " ")
        .replace(/<(?:nav|footer|header|aside|form)[^>]*>[\s\S]*?<\/(?:nav|footer|header|aside|form)>/gi, " ")
        .replace(
            /<(?:div|section)[^>]+(?:id|class)=["'][^"']*(?:cookie|newsletter|subscribe|social|share|breadcrumb|modal|popup|banner)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section)>/gi,
            " ",
        );
}

function extractContentHighlights(html: string) {
    const contentHtml = stripBoilerplateHtml(extractPrimaryContentHtml(html));
    const candidates = [
        ...Array.from(
            contentHtml.matchAll(/<(?:p|li|blockquote)[^>]*>([\s\S]*?)<\/(?:p|li|blockquote)>/gi),
            (match) => match[1],
        ),
        ...Array.from(
            contentHtml.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi),
            (match) => match[1],
        ),
    ]
        .map((text) => cleanText(text, 220))
        .filter((text) => text.length >= 35 && /[a-z]{3}/i.test(text))
        .filter((text) => !looksLikeNavigationCluster(text));

    return uniqueStrings(candidates, 8, 220);
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

function scoreCrawledPage(page: Omit<CrawledPage, "pageScore">) {
    let score = scoreInternalLink(page.url);

    if (page.title) {
        score += 8;
    }

    if (page.description) {
        score += 6;
    }

    score += Math.min(page.headings.length, 4) * 2;
    score += Math.min(page.contentHighlights.length, 4) * 2;
    score += Math.min(page.serviceSignals.length, 3) * 4;
    score += Math.min(page.proofSignals.length, 2) * 5;
    score += Math.min(page.ctaPatterns.length, 2) * 3;
    score += Math.min(page.faqQuestions.length, 2) * 2;
    score += Math.min(page.schemaTypes.length, 2) * 4;

    if (page.excerpt.length >= 120) {
        score += 4;
    }

    return score;
}

function sortPagesByScore(pages: CrawledPage[]) {
    return [...pages].sort(
        (left, right) =>
            right.pageScore - left.pageScore
            || scoreInternalLink(right.url) - scoreInternalLink(left.url),
    );
}

async function fetchPage(url: URL, timeoutMs: number, deadlineMs: number): Promise<CrawledPage | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const effectiveTimeoutMs = getEffectiveRequestTimeout(timeoutMs, deadlineMs);

        if (effectiveTimeoutMs <= 0) {
            return null;
        }

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: "text/html,application/xhtml+xml",
                },
                redirect: "follow",
                cache: "no-store",
                signal: AbortSignal.timeout(effectiveTimeoutMs),
            });

            if (!response.ok) {
                // Retry on server errors (502, 503, 504), not on client errors (404, 403)
                if (attempt === 0 && response.status >= 500 && hasBudgetRemaining(deadlineMs, RETRY_DELAY_MS + MIN_TIME_SLICE_MS)) {
                    await wait(RETRY_DELAY_MS);
                    continue;
                }
                return null;
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.toLowerCase().includes("text/html")) {
                return null;
            }

            const html = await response.text();
            const contentHighlights = extractContentHighlights(html);
            const structuredDataTypes = extractStructuredDataTypes(html);
            const structuredDataSignals = extractStructuredDataCommercialSignals(html);
            const pageWithoutScore: Omit<CrawledPage, "pageScore"> = {
                url: url.toString(),
                title: extractTitle(html),
                description: extractDescription(html),
                headings: extractHeadings(html),
                faqQuestions: extractFaqQuestions(html),
                internalLinks: extractInternalLinks(html, url),
                excerpt: extractBodyExcerpt(contentHighlights.join(" ") || html),
                contentHighlights,
                serviceSignals: uniqueStrings(
                    [...extractServiceSignals(html), ...structuredDataSignals],
                    12,
                    140,
                ),
                schemaTypes: structuredDataTypes,
                ctaPatterns: extractCtaPatterns(html),
                proofSignals: extractProofSignals(html),
            };

            return {
                ...pageWithoutScore,
                pageScore: scoreCrawledPage(pageWithoutScore),
            };
        } catch (error) {
            if (attempt === 0 && hasBudgetRemaining(deadlineMs, RETRY_DELAY_MS + MIN_TIME_SLICE_MS)) {
                console.warn("[AI-BLOGGER] Retrying page fetch:", url.toString(), error instanceof Error ? error.message : error);
                await wait(RETRY_DELAY_MS);
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
        sortPagesByScore(pages).map((page) => {
            const url = new URL(page.url);
            return url.pathname || "/";
        }),
        50,
        120,
    );
}

function buildPriorityPages(pages: CrawledPage[]): BlogStudioSitePriorityPage[] {
    const seenPaths = new Set<string>();

    return sortPagesByScore(pages)
        .flatMap((page) => {
            const url = new URL(page.url);
            const path = url.pathname || "/";

            if (seenPaths.has(path)) {
                return [];
            }

            seenPaths.add(path);

            return [{
                path,
                url: url.toString(),
                title: page.title || fallbackPageTitle(path),
                description: cleanText(page.description || page.contentHighlights[0] || page.excerpt, 220),
                excerpt: cleanText(page.excerpt || page.contentHighlights.join(" "), 260),
                highlights: uniqueStrings(page.contentHighlights, 4, 160),
                serviceSignals: uniqueStrings(page.serviceSignals, 4, 140),
                proofSignals: uniqueStrings(page.proofSignals, 3, 160),
                ctaPatterns: uniqueStrings(page.ctaPatterns, 3, 140),
                pageCategory: classifyPriorityPageCategory(page),
                pageScore: page.pageScore,
            }];
        })
        .slice(0, 12);
}

function clampAuthorityScore(value: number) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
}

function isCommercialPriorityCategory(category: BlogStudioSitePriorityPageCategory) {
    return [
        "service",
        "product",
        "collection",
        "category",
        "brand",
        "solution",
        "pricing",
        "industry",
        "case-study",
    ].includes(category);
}

function inferSiteType(input: {
    priorityPages: BlogStudioSitePriorityPage[];
    serviceSignals: string[];
    topicHints: string[];
    pageTitles: string[];
}) {
    const categories = input.priorityPages.map((page) => page.pageCategory);
    const text = [
        ...input.serviceSignals,
        ...input.topicHints,
        ...input.pageTitles,
        ...input.priorityPages.flatMap((page) => [page.title, page.description, page.excerpt]),
    ].join(" ").toLowerCase();

    if (categories.some((category) => ["product", "collection", "category", "brand"].includes(category))) {
        return "ecommerce";
    }

    if (/\b(?:software|saas|platform|app|dashboard|workflow|automation|api)\b/.test(text)) {
        return "saas-or-software";
    }

    if (categories.some((category) => ["service", "solution", "pricing", "case-study", "industry"].includes(category))) {
        return "service-business";
    }

    if (categories.filter((category) => category === "blog").length >= Math.max(2, categories.length / 2)) {
        return "publisher-or-content-site";
    }

    if (/\b(?:clinic|restaurant|hotel|salon|near me|local|appointment|book now)\b/.test(text)) {
        return "local-business";
    }

    return "general-website";
}

function inferBusinessModel(siteType: string, input: {
    priorityPages: BlogStudioSitePriorityPage[];
    ctaPatterns: string[];
    serviceSignals: string[];
}) {
    const text = [
        siteType,
        ...input.ctaPatterns,
        ...input.serviceSignals,
        ...input.priorityPages.flatMap((page) => [page.title, page.description, page.excerpt]),
    ].join(" ").toLowerCase();

    if (siteType === "ecommerce") {
        return "transactional-commerce";
    }

    if (/\b(?:book a call|contact us|request a quote|free consultation|get in touch|hire us|schedule)\b/.test(text)) {
        return "lead-generation";
    }

    if (/\b(?:pricing|plans|subscription|trial|demo|sign up|try free)\b/.test(text)) {
        return "subscription-or-demo";
    }

    if (siteType === "publisher-or-content-site") {
        return "audience-and-content";
    }

    return "general-conversion";
}

function extractAudienceSegments(values: string[]) {
    const text = values.join(" ");
    const audienceMatches = Array.from(
        text.matchAll(/\b(?:for|helping|serving|built for|made for)\s+([a-z0-9][a-z0-9\s&,-]{3,70}?)(?:\.|,|;|\||\n|$)/gi),
        (match) => match[1],
    );

    return uniqueStrings(
        audienceMatches
            .map((value) => cleanText(value, 90))
            .filter((value) => value.split(/\s+/).length <= 8),
        8,
        90,
    );
}

function extractLocationSignals(values: string[]) {
    const text = values.join(" ");
    const locationMatches = [
        ...Array.from(text.matchAll(/\b(?:in|near|serving)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})(?:,|\s|\.|$)/g), (match) => match[1]),
        ...Array.from(text.matchAll(/\b([A-Z][A-Za-z]+,\s*[A-Z]{2})\b/g), (match) => match[1]),
    ];

    return uniqueStrings(locationMatches, 8, 80);
}

function buildForbiddenLanes(siteType: string, authorityText: string) {
    const forbidden = [
        "celebrity gossip",
        "sports scores and match recaps",
        "unrelated political commentary",
        "viral incidents without a direct service connection",
    ];
    const normalized = authorityText.toLowerCase();

    if (!/\b(?:finance|bank|tax|loan|insurance|investment|accounting|wealth)\b/.test(normalized)) {
        forbidden.push("financial advice or settlement topics without site authority");
    }

    if (!/\b(?:health|medical|clinic|doctor|therapy|dentist|wellness)\b/.test(normalized)) {
        forbidden.push("medical or health advice without site authority");
    }

    if (!/\b(?:law|legal|attorney|lawyer|compliance)\b/.test(normalized)) {
        forbidden.push("legal advice without site authority");
    }

    if (siteType !== "ecommerce") {
        forbidden.push("shopping deals unrelated to the site's offers");
    }

    return uniqueStrings(forbidden, 8, 120);
}

function buildWebsiteAuthorityProfile(input: {
    sourceUrl: string;
    pageCount: number;
    pageTitles: string[];
    topicHints: string[];
    faqQuestions: string[];
    priorityPaths: string[];
    priorityPages: BlogStudioSitePriorityPage[];
    serviceSignals: string[];
    ctaPatterns: string[];
    proofSignals: string[];
}): BlogStudioSiteAuthorityProfile {
    const commercialPages = input.priorityPages.filter((page) =>
        isCommercialPriorityCategory(page.pageCategory),
    );
    const supportingPages = input.priorityPages.filter((page) =>
        ["blog", "faq", "case-study", "industry"].includes(page.pageCategory),
    );
    const commercialAuthorityText = [
        ...commercialPages.flatMap((page) => [
            page.title,
            page.description,
            page.excerpt,
            ...page.highlights,
            ...page.serviceSignals,
            ...page.proofSignals,
        ]),
        ...input.serviceSignals,
    ];
    const authoritySourceText = [
        ...input.pageTitles,
        ...input.topicHints,
        ...input.serviceSignals,
        ...input.faqQuestions,
        ...input.proofSignals,
        ...input.priorityPages.flatMap((page) => [
            page.title,
            page.description,
            page.excerpt,
            ...page.highlights,
            ...page.serviceSignals,
        ]),
    ];
    const siteType = inferSiteType(input);
    const businessModel = inferBusinessModel(siteType, input);
    const coreOffers = uniqueStrings(
        [
            ...commercialPages.flatMap((page) => [page.title, ...page.serviceSignals]),
            ...input.serviceSignals,
        ].filter((value) => isMeaningfulTopicHint(value) || value.split(/\s+/).length >= 2),
        16,
        120,
    );
    const authorityLanes = uniqueStrings(
        (commercialPages.length > 0
            ? [
                ...coreOffers,
                ...commercialAuthorityText,
            ]
            : [
                ...coreOffers,
                ...input.topicHints,
            ]).filter(isMeaningfulTopicHint),
        18,
        140,
    );
    const adjacentLanes = uniqueStrings(
        [
            ...input.faqQuestions,
            ...supportingPages.flatMap((page) => [page.title, page.description]),
            ...(commercialPages.length > 0 ? [] : input.topicHints),
            ...(commercialPages.length > 0 ? [] : input.pageTitles),
        ].filter(isMeaningfulTopicHint),
        14,
        140,
    );
    const moneyPages = commercialPages.slice(0, 12).map((page) => ({
        path: page.path,
        title: page.title,
        category: page.pageCategory,
    }));
    const contentClusters = uniqueStrings(
        [
            ...supportingPages.flatMap((page) => [page.title, page.description]),
            ...(commercialPages.length > 0 ? [] : input.topicHints),
        ].filter(isMeaningfulTopicHint),
        16,
        140,
    );
    const audienceSegments = extractAudienceSegments(authoritySourceText);
    const locationSignals = extractLocationSignals(authoritySourceText);
    const confidenceScore = clampAuthorityScore(
        18 +
        Math.min(22, input.pageCount * 4) +
        Math.min(18, input.priorityPages.length * 3) +
        Math.min(16, coreOffers.length * 3) +
        Math.min(12, authorityLanes.length * 2) +
        Math.min(8, input.proofSignals.length * 2) +
        Math.min(6, input.ctaPatterns.length * 2),
    );

    return {
        siteType,
        businessModel,
        coreOffers,
        authorityLanes,
        adjacentLanes,
        forbiddenLanes: buildForbiddenLanes(siteType, authoritySourceText.join(" ")),
        moneyPages,
        contentClusters,
        audienceSegments,
        locationSignals,
        confidenceScore,
    };
}

function buildTopicHints(pages: CrawledPage[]) {
    return uniqueStrings(
        sortPagesByScore(pages).flatMap((page) => [
            page.title,
            page.description,
            ...page.headings,
            ...page.contentHighlights,
        ]).filter((value) => isMeaningfulTopicHint(value)),
        40,
        120,
    );
}

function buildSummary(sourceUrl: URL, pages: CrawledPage[], requestedMaxPages: number) {
    const rankedPages = sortPagesByScore(pages);
    const topPages = rankedPages.slice(0, 4);
    const pageTitles = uniqueStrings(rankedPages.map((page) => page.title), 6, 160);
    const descriptions = uniqueStrings(topPages.map((page) => page.description).filter((value) => isMeaningfulTopicHint(value)), 4, 220);
    const headings = uniqueStrings(topPages.flatMap((page) => page.headings).filter((value) => isMeaningfulTopicHint(value)), 10, 140);
    const faqQuestions = uniqueStrings(rankedPages.flatMap((page) => page.faqQuestions), 6, 160);
    const excerpts = uniqueStrings(topPages.map((page) => page.excerpt), 3, 220);
    const highlights = uniqueStrings(topPages.flatMap((page) => page.contentHighlights).filter((value) => isMeaningfulTopicHint(value)), 6, 180);
    const services = uniqueStrings(rankedPages.flatMap((page) => page.serviceSignals).filter((value) => !looksLikeNavigationCluster(value)), 8, 140);
    const ctas = uniqueStrings(rankedPages.flatMap((page) => page.ctaPatterns), 6, 140);
    const proof = uniqueStrings(rankedPages.flatMap((page) => page.proofSignals).filter((value) => !looksLikeNavigationCluster(value)), 6, 160);
    const topPathSummaries = uniqueStrings(
        topPages.map((page) => {
            const path = new URL(page.url).pathname || "/";
            const focus = cleanText(
                [
                    page.title,
                    page.description,
                    page.contentHighlights[0] || page.excerpt,
                ]
                    .filter(Boolean)
                    .join(" | "),
                180,
            );
            return `${path}: ${focus}`;
        }),
        4,
        220,
    );

    return [
        `Website: ${sourceUrl.toString()}`,
        `Coverage: ${pages.length} of ${requestedMaxPages} requested pages captured.`,
        pageTitles.length > 0 ? `Page titles: ${pageTitles.join(" | ")}` : "",
        descriptions.length > 0 ? `Meta descriptions: ${descriptions.join(" | ")}` : "",
        headings.length > 0 ? `Headings: ${headings.join(" | ")}` : "",
        topPathSummaries.length > 0 ? `High-value path focus: ${topPathSummaries.join(" | ")}` : "",
        services.length > 0 ? `Commercial/service signals: ${services.join(" | ")}` : "",
        ctas.length > 0 ? `CTA patterns: ${ctas.join(" | ")}` : "",
        proof.length > 0 ? `Trust/proof signals: ${proof.join(" | ")}` : "",
        faqQuestions.length > 0 ? `FAQ signals: ${faqQuestions.join(" | ")}` : "",
        highlights.length > 0 ? `Content highlights: ${highlights.join(" | ")}` : "",
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
    | "priorityPages"
    | "authorityProfile"
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
        priorityPages: snapshot.priorityPages || [],
        authorityProfile: snapshot.authorityProfile || buildWebsiteAuthorityProfile({
            sourceUrl: snapshot.sourceUrl,
            pageCount: snapshot.pageCount,
            pageTitles: snapshot.pageTitles || [],
            topicHints: snapshot.topicHints || [],
            faqQuestions: snapshot.faqQuestions || [],
            priorityPaths: snapshot.priorityPaths || [],
            priorityPages: snapshot.priorityPages || [],
            serviceSignals: snapshot.serviceSignals || [],
            ctaPatterns: snapshot.ctaPatterns || [],
            proofSignals: snapshot.proofSignals || [],
        }),
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
                priorityPages: intelligence.priorityPages,
                authorityProfile: intelligence.authorityProfile,
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
        /** Hard stop for the full crawl so live fetches stay comfortably under Vercel limits. */
        totalBudgetMs?: number;
        /** Small concurrency boost for faster, still-safe crawling. */
        maxConcurrency?: number;
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
    const inferredBudgetMs = Math.min(
        Math.max(
            maxPages * Math.min(timeoutMs, 3500) + 10_000,
            DEFAULT_TOTAL_CRAWL_BUDGET_MS,
        ),
        MAX_TOTAL_CRAWL_BUDGET_MS,
    );
    const totalBudgetMs = Math.min(
        Math.max(options?.totalBudgetMs ?? inferredBudgetMs, MIN_TOTAL_CRAWL_BUDGET_MS),
        MAX_TOTAL_CRAWL_BUDGET_MS,
    );
    const maxConcurrency = Math.min(
        Math.max(
            options?.maxConcurrency
            ?? Math.min(DEFAULT_CRAWL_CONCURRENCY, Math.max(2, Math.ceil(maxPages / 3))),
            1,
        ),
        MAX_CRAWL_CONCURRENCY,
    );
    const allowedPaths = (options?.allowedPaths || []).map(normalizePathRule).filter(Boolean);
    const blockedPaths = (options?.blockedPaths || []).map(normalizePathRule).filter(Boolean);
    const deadlineMs = Date.now() + totalBudgetMs;

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

    const primaryPage = await fetchPage(sourceUrl, timeoutMs, deadlineMs);

    if (!primaryPage) {
        return null;
    }

    fetchedPages.push(primaryPage);
    visited.add(primaryPage.url);

    const crawlQueue: string[] = [];
    const queued = new Set<string>();
    const sitemapCandidates =
        maxPages > 1 && hasBudgetRemaining(deadlineMs, MIN_TIME_SLICE_MS * 2)
            ? await getSitemapCandidates(sourceUrl, timeoutMs, deadlineMs)
            : [];

    for (const link of [...primaryPage.internalLinks, ...sitemapCandidates]) {
        enqueueCrawlUrl(crawlQueue, queued, visited, link, allowedPaths, blockedPaths);
    }

    while (
        fetchedPages.length < maxPages
        && crawlQueue.length > 0
        && hasBudgetRemaining(deadlineMs)
    ) {
        const batchSize = Math.min(
            maxPages - fetchedPages.length,
            maxConcurrency,
            crawlQueue.length,
        );
        const batchLinks: string[] = [];

        while (batchLinks.length < batchSize) {
            const nextLink = crawlQueue.shift();

            if (!nextLink) {
                break;
            }

            queued.delete(nextLink);
            visited.add(nextLink);
            batchLinks.push(nextLink);
        }

        if (batchLinks.length === 0) {
            break;
        }

        const nextPages = await Promise.all(
            batchLinks.map((link) => fetchPage(new URL(link), timeoutMs, deadlineMs)),
        );

        for (const nextPage of nextPages) {
            if (!nextPage) {
                continue;
            }

            fetchedPages.push(nextPage);

            for (const discoveredLink of nextPage.internalLinks) {
                enqueueCrawlUrl(crawlQueue, queued, visited, discoveredLink, allowedPaths, blockedPaths);
            }
        }
    }

    if (fetchedPages.length < maxPages && crawlQueue.length > 0 && !hasBudgetRemaining(deadlineMs)) {
        console.info(
            `[AI-BLOGGER] Website crawl budget reached for ${sourceUrl.toString()} after ${fetchedPages.length}/${maxPages} pages`,
        );
    }

    const rankedPages = sortPagesByScore(fetchedPages);
    const pageTitles = uniqueStrings(rankedPages.map((page) => page.title), 50, 160);
    const topicHints = buildTopicHints(rankedPages);
    const faqQuestions = uniqueStrings(rankedPages.flatMap((page) => page.faqQuestions), 20, 180);
    const priorityPaths = buildPriorityPaths(rankedPages);
    const priorityPages = buildPriorityPages(rankedPages);
    const commercialPriorityPages = priorityPages.filter((page) =>
        isCommercialPriorityCategory(page.pageCategory),
    );
    const commercialServiceSignals = uniqueStrings(
        commercialPriorityPages.flatMap((page) => page.serviceSignals),
        20,
        140,
    );
    const serviceSignals = uniqueStrings(
        commercialServiceSignals.length > 0
            ? [
                ...commercialServiceSignals,
                ...rankedPages
                    .filter((page) => !isBlogPath(new URL(page.url).pathname.toLowerCase() || "/"))
                    .flatMap((page) => page.serviceSignals),
            ]
            : rankedPages.flatMap((page) => page.serviceSignals),
        20,
        140,
    );
    const ctaPatterns = uniqueStrings(rankedPages.flatMap((page) => page.ctaPatterns), 16, 140);
    const proofSignals = uniqueStrings(rankedPages.flatMap((page) => page.proofSignals), 16, 160);

    const intelligence: AIBloggerWebsiteIntelligence = {
        sourceUrl: rawUrl.trim(),
        normalizedUrl: sourceUrl.toString(),
        pageCount: rankedPages.length,
        pageTitles,
        topicHints,
        faqQuestions,
        priorityPaths,
        priorityPages,
        authorityProfile: buildWebsiteAuthorityProfile({
            sourceUrl: sourceUrl.toString(),
            pageCount: rankedPages.length,
            pageTitles,
            topicHints,
            faqQuestions,
            priorityPaths,
            priorityPages,
            serviceSignals,
            ctaPatterns,
            proofSignals,
        }),
        serviceSignals,
        ctaPatterns,
        proofSignals,
        summary: buildSummary(sourceUrl, rankedPages, maxPages),
        cacheStatus: "live",
        refreshedAt: new Date().toISOString(),
    };

    if (options?.agencyId) {
        await storeWebsiteIntelligenceSnapshot(options.agencyId, rawUrl.trim(), intelligence);
    }

    return intelligence;
}
