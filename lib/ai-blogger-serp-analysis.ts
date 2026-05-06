import "server-only";

import { BlogStudioSerpSnapshotModel, connectDB } from "./mongodb";
import type {
    AIBloggerSerpConfig,
    AIBloggerSerpDevice,
} from "./types";
import type {
    BlogStudioSearchIntent,
    BlogStudioSerpSnapshot,
} from "./types-ai-blogger";
import {
    sanitizeText,
    sanitizeStringArray,
    normalizeQuery,
    sanitizeLocation,
    cleanText,
} from "./ai-blogger-text-utils";

type OrganicResult = {
    title: string;
    link: string;
    snippet: string;
};

type SerpApiResult<T> = {
    data: T;
    usedFallbackKey: boolean;
};

type SerpCompetitorPage = {
    title: string;
    headings: string[];
};

export type AIBloggerSerpAnalysis = {
    query: string;
    normalizedQuery: string;
    location: string;
    device: AIBloggerSerpDevice;
    provider: "serpapi";
    intent: BlogStudioSearchIntent;
    topResultTitles: string[];
    topResultUrls: string[];
    competitorDomains: string[];
    peopleAlsoAsk: string[];
    relatedSearches: string[];
    headingPatterns: string[];
    contentGaps: string[];
    featuredSnippetStyle: string;
    rankingDifficulty: string;
    dominantContentFormat: string;
    titleAnglePatterns: string[];
    sectionGapAnalysis: string[];
    summary: string;
    cacheStatus: "live" | "cached";
    usedFallbackKey: boolean;
    refreshedAt: string;
};

const USER_AGENT =
    "Mozilla/5.0 (compatible; AIBloggerSerpBot/1.0; +https://example.com/ai-blogger)";

function getTopOrganicResults(data: unknown, maxCompetitors: number): OrganicResult[] {
    if (!data || typeof data !== "object") {
        return [];
    }

    const organicResults = (data as {
        organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
    }).organic_results;

    return (organicResults || [])
        .map((result) => ({
            title: sanitizeText(result.title, 180),
            link: sanitizeText(result.link, 400),
            snippet: sanitizeText(result.snippet, 240),
        }))
        .filter((result) => result.title && result.link)
        .slice(0, maxCompetitors);
}

function getPeopleAlsoAsk(data: unknown) {
    if (!data || typeof data !== "object") {
        return [];
    }

    const record = data as {
        related_questions?: Array<{ question?: string; title?: string }>;
    };

    return sanitizeStringArray(
        (record.related_questions || []).map((item) => item.question || item.title),
        8,
        180,
    );
}

function getRelatedSearches(data: unknown) {
    if (!data || typeof data !== "object") {
        return [];
    }

    const record = data as {
        related_searches?: Array<{ query?: string }>;
    };

    return sanitizeStringArray(
        (record.related_searches || []).map((item) => item.query),
        8,
        180,
    );
}

/**
 * When SerpAPI returns 0 PAA items, generate synthetic question-style entries
 * from competitor headings and related searches. This ensures the FAQ pack
 * always has real SERP-derived questions to work with.
 */
function buildSyntheticPAA(
    headingPatterns: string[],
    relatedSearches: string[],
    query: string,
): string[] {
    const QUESTION_PATTERNS = /^(how|what|why|when|where|which|who|can|do|does|is|are|should|will|would)/i;
    const synthetic: string[] = [];
    const seen = new Set<string>();
    const queryLower = query.toLowerCase();

    // 1. Extract headings that are already question-shaped
    for (const heading of headingPatterns) {
        const trimmed = heading.trim();
        if (trimmed.endsWith("?") || QUESTION_PATTERNS.test(trimmed)) {
            const normalized = trimmed.toLowerCase();
            if (!seen.has(normalized) && !normalized.includes(queryLower.slice(0, 20))) {
                seen.add(normalized);
                synthetic.push(trimmed.endsWith("?") ? trimmed : `${trimmed}?`);
            }
        }
    }

    // 2. Convert how-to/what-is style headings into questions
    for (const heading of headingPatterns) {
        const trimmed = heading.trim();
        const lower = trimmed.toLowerCase();
        if (seen.has(lower) || trimmed.endsWith("?")) continue;

        if (/^(how to|getting started|understanding|introduction to|guide to)/i.test(trimmed)) {
            const question = `How do you ${trimmed.replace(/^(how to|getting started with|understanding|introduction to|guide to)\s*/i, "")}?`;
            if (!seen.has(question.toLowerCase())) {
                seen.add(question.toLowerCase());
                synthetic.push(question);
            }
        }
    }

    // 3. Convert related searches into questions if they aren't already
    for (const search of relatedSearches) {
        const trimmed = search.trim();
        const lower = trimmed.toLowerCase();
        if (seen.has(lower)) continue;

        if (QUESTION_PATTERNS.test(trimmed) || trimmed.endsWith("?")) {
            seen.add(lower);
            synthetic.push(trimmed.endsWith("?") ? trimmed : `${trimmed}?`);
        } else {
            // Convert factual search phrases into questions
            const question = `What is ${trimmed}?`;
            if (!seen.has(question.toLowerCase())) {
                seen.add(question.toLowerCase());
                synthetic.push(question);
            }
        }
    }

    return sanitizeStringArray(synthetic, 6, 180);
}

function getFeaturedSnippetStyle(data: unknown) {
    if (!data || typeof data !== "object") {
        return "No featured snippet detected";
    }

    const answerBox = (data as {
        answer_box?: {
            type?: string;
            answer?: string;
            snippet?: string;
            list?: unknown[];
            table?: unknown;
        };
    }).answer_box;

    if (!answerBox) {
        return "No featured snippet detected";
    }

    if (Array.isArray(answerBox.list) && answerBox.list.length > 0) {
        return "List-style featured snippet";
    }

    if (answerBox.table) {
        return "Table-style featured snippet";
    }

    if (answerBox.snippet) {
        return "Paragraph featured snippet";
    }

    if (answerBox.answer) {
        return "Direct-answer featured snippet";
    }

    return sanitizeText(answerBox.type, 120, "Featured snippet detected");
}

const EXCLUDED_COMPETITOR_DOMAINS = new Set([
    "reddit.com",
    "quora.com",
    "stackexchange.com",
    "stackoverflow.com",
    "medium.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "linkedin.com",
    "pinterest.com",
    "youtube.com",
    "tiktok.com",
    "instagram.com",
    "threads.net",
]);

function isExcludedCompetitorDomain(hostname: string) {
    const normalized = hostname.replace(/^www\./, "").toLowerCase();
    if (EXCLUDED_COMPETITOR_DOMAINS.has(normalized)) {
        return true;
    }

    for (const excluded of EXCLUDED_COMPETITOR_DOMAINS) {
        if (normalized.endsWith(`.${excluded}`)) {
            return true;
        }
    }

    return false;
}

function getCompetitorDomains(results: OrganicResult[]) {
    return sanitizeStringArray(
        results
            .map((result) => {
                try {
                    return new URL(result.link).hostname.replace(/^www\./, "");
                } catch {
                    return "";
                }
            })
            .filter((domain) => domain && !isExcludedCompetitorDomain(domain)),
        8,
        120,
    );
}

function extractHeadings(html: string) {
    return sanitizeStringArray(
        Array.from(
            html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi),
            (match) => cleanText(match[1], 180),
        ),
        12,
        180,
    );
}

function extractTitle(html: string) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return cleanText(match?.[1] || "", 180);
}

async function fetchCompetitorPage(url: string): Promise<SerpCompetitorPage | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: "GET",
                cache: "no-store",
                headers: {
                    Accept: "text/html,application/xhtml+xml",
                    "User-Agent": USER_AGENT,
                },
                signal: AbortSignal.timeout(8000),
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
                title: extractTitle(html),
                headings: extractHeadings(html),
            };
        } catch {
            if (attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue;
            }
            return null;
        }
    }

    return null;
}

function inferSearchIntent(
    query: string,
    topResultTitles: string[],
    competitorDomains: string[],
): BlogStudioSearchIntent {
    const queryText = query.toLowerCase();
    const combinedText = [query, ...topResultTitles].join(" ").toLowerCase();

    if (
        queryText.includes(".com") ||
        queryText.includes(".io") ||
        /\b(login|official site|dashboard|docs)\b/.test(queryText)
    ) {
        return "navigational";
    }

    if (competitorDomains.length > 0) {
        const dominantDomain = competitorDomains[0];
        const dominantCount = competitorDomains.filter((domain) => domain === dominantDomain).length;
        if (dominantCount >= 3) {
            return "navigational";
        }
    }

    if (/\b(buy|hire|book|demo|contact|sign up|get started|near me)\b/.test(combinedText)) {
        return "transactional";
    }

    if (/\b(best|top|vs|versus|compare|comparison|review|pricing|price|cost|services|service|agency|software|tool)\b/.test(combinedText)) {
        return "commercial";
    }

    return "informational";
}

function buildHeadingPatterns(pages: SerpCompetitorPage[]) {
    return sanitizeStringArray(
        pages.flatMap((page) => page.headings),
        12,
        180,
    );
}

function buildContentGaps(
    query: string,
    peopleAlsoAsk: string[],
    headingPatterns: string[],
) {
    const queryText = query.toLowerCase();

    return sanitizeStringArray(
        [
            ...peopleAlsoAsk.filter((item) => !queryText.includes(item.toLowerCase().slice(0, 18))),
            ...headingPatterns.filter((item) => !queryText.includes(item.toLowerCase().slice(0, 18))),
        ],
        8,
        180,
    );
}

// ─── Ranking Difficulty Assessment ───────────────────────────────────

const HIGH_AUTHORITY_DOMAINS = new Set([
    "wikipedia.org", "en.wikipedia.org", "google.com", "youtube.com",
    "amazon.com", "linkedin.com", "github.com", "medium.com",
    "reddit.com", "quora.com", "forbes.com", "hubspot.com",
    "nytimes.com", "bbc.com", "microsoft.com", "apple.com",
]);

function assessRankingDifficulty(
    competitorDomains: string[],
    featuredSnippetStyle: string,
    intent: BlogStudioSearchIntent,
) {
    let score = 0;
    const signals: string[] = [];

    const authorityCount = competitorDomains.filter((domain) => HIGH_AUTHORITY_DOMAINS.has(domain)).length;
    if (authorityCount >= 3) {
        score += 3;
        signals.push(`${authorityCount} high-authority domains in top results`);
    } else if (authorityCount >= 1) {
        score += 1;
        signals.push(`${authorityCount} high-authority domain(s) present`);
    }

    const uniqueDomains = new Set(competitorDomains).size;
    if (uniqueDomains <= 2 && competitorDomains.length >= 3) {
        score += 2;
        signals.push("Low domain diversity: 1-2 domains dominate results");
    }

    if (!featuredSnippetStyle.includes("No featured snippet")) {
        score += 1;
        signals.push("Featured snippet present");
    }

    if (intent === "navigational") {
        score += 2;
        signals.push("Navigational intent is hard to compete on");
    }

    let label: string;
    if (score >= 5) {
        label = "High difficulty";
    } else if (score >= 3) {
        label = "Medium difficulty";
    } else {
        label = "Low difficulty";
    }

    return `${label}${signals.length > 0 ? ` — ${signals.join("; ")}` : ""}`;
}

// ─── Content Format Detection ────────────────────────────────────────

function detectDominantContentFormat(
    intent: BlogStudioSearchIntent,
    featuredSnippetStyle: string,
    headingPatterns: string[],
    topResultTitles: string[],
) {
    const combined = [...headingPatterns, ...topResultTitles].join(" ").toLowerCase();

    if (/\b(how to|step[- ]by[- ]step|guide|tutorial|walkthrough)\b/.test(combined)) {
        return "How-to / tutorial format";
    }
    if (/\b(\d+\s+(best|top|ways|tips|reasons|examples|tools|strategies))\b/.test(combined)) {
        return "Listicle format";
    }
    if (/\b(vs\.?|versus|compare|comparison|difference between)\b/.test(combined)) {
        return "Comparison / vs format";
    }
    if (/\b(what is|definition|meaning|explained|overview)\b/.test(combined)) {
        return "Explainer / definition format";
    }
    if (/\b(review|rating|pros and cons)\b/.test(combined)) {
        return "Review / rating format";
    }
    if (featuredSnippetStyle.includes("List")) {
        return "List-style content favored";
    }
    if (featuredSnippetStyle.includes("Table")) {
        return "Data / table format favored";
    }
    if (intent === "commercial") {
        return "Commercial / service page format";
    }
    if (intent === "transactional") {
        return "Transactional / landing page format";
    }

    return "Standard article format";
}

// ─── Title Angle Patterns ────────────────────────────────────────────

const TITLE_ANGLE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b(\d{4})\b/, label: "Year-specific" },
    { pattern: /\b(\d+)\s+(best|top|ways|tips|reasons|steps)\b/i, label: "Numbered list" },
    { pattern: /\b(how to|guide|tutorial)\b/i, label: "How-to angle" },
    { pattern: /\b(vs\.?|versus|compare)\b/i, label: "Comparison angle" },
    { pattern: /\b(what is|definition|meaning)\b/i, label: "Definition angle" },
    { pattern: /\b(review|rating)\b/i, label: "Review angle" },
    { pattern: /\b(free|affordable|cheap|budget)\b/i, label: "Price/value angle" },
    { pattern: /\b(beginner|start|getting started|introduction)\b/i, label: "Beginner angle" },
    { pattern: /\b(advanced|expert|pro|in-depth)\b/i, label: "Advanced angle" },
    { pattern: /\b(ultimate|complete|comprehensive|definitive)\b/i, label: "Comprehensive angle" },
];

function extractTitleAnglePatterns(topResultTitles: string[]) {
    const found = new Set<string>();

    for (const title of topResultTitles) {
        for (const { pattern, label } of TITLE_ANGLE_PATTERNS) {
            if (pattern.test(title)) {
                found.add(label);
            }
        }
    }

    return Array.from(found).slice(0, 6);
}

// ─── Section Gap Analysis ────────────────────────────────────────────

function buildSectionGapAnalysis(
    query: string,
    headingPatterns: string[],
    peopleAlsoAsk: string[],
) {
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    const headingTexts = headingPatterns.map((h) => h.toLowerCase());
    const gaps: string[] = [];

    for (const paa of peopleAlsoAsk) {
        const paaLower = paa.toLowerCase();
        const coveredByHeading = headingTexts.some((h) =>
            paaLower.includes(h.slice(0, 20)) || h.includes(paaLower.slice(0, 20)),
        );
        if (!coveredByHeading) {
            gaps.push(`PAA not covered in competitor headings: ${paa}`);
        }
    }

    const headingThemes = new Map<string, number>();
    for (const heading of headingPatterns) {
        const tokens = heading.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
        for (const token of tokens) {
            headingThemes.set(token, (headingThemes.get(token) || 0) + 1);
        }
    }

    const commonThemes = Array.from(headingThemes.entries())
        .filter(([, count]) => count >= 2)
        .sort(([, a], [, b]) => b - a)
        .map(([theme]) => theme)
        .filter((theme) => !queryTokens.includes(theme))
        .slice(0, 5);

    if (commonThemes.length > 0) {
        gaps.push(`Recurring competitor section themes: ${commonThemes.join(", ")}`);
    }

    return sanitizeStringArray(gaps, 6, 200);
}

function buildSummary(
    query: string,
    intent: BlogStudioSearchIntent,
    results: OrganicResult[],
    competitorDomains: string[],
    peopleAlsoAsk: string[],
    headingPatterns: string[],
    contentGaps: string[],
    featuredSnippetStyle: string,
    rankingDifficulty: string,
    dominantContentFormat: string,
    titleAnglePatterns: string[],
    sectionGapAnalysis: string[],
) {
    return [
        `SERP query: ${query}`,
        `Likely intent: ${intent}`,
        `Ranking difficulty: ${rankingDifficulty}`,
        `Dominant format: ${dominantContentFormat}`,
        `Featured snippet: ${featuredSnippetStyle}`,
        results.length > 0
            ? `Top result titles: ${sanitizeStringArray(results.map((result) => result.title), 6, 180).join(" | ")}`
            : "",
        competitorDomains.length > 0 ? `Competitor domains: ${competitorDomains.join(" | ")}` : "",
        titleAnglePatterns.length > 0 ? `Title angles used: ${titleAnglePatterns.join(" | ")}` : "",
        peopleAlsoAsk.length > 0 ? `People Also Ask: ${peopleAlsoAsk.join(" | ")}` : "",
        headingPatterns.length > 0 ? `Heading patterns: ${headingPatterns.join(" | ")}` : "",
        contentGaps.length > 0 ? `Coverage gaps: ${contentGaps.join(" | ")}` : "",
        sectionGapAnalysis.length > 0 ? `Section gap analysis: ${sectionGapAnalysis.join(" | ")}` : "",
    ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 3600);
}

function toSerpAnalysis(
    snapshot: Pick<
        BlogStudioSerpSnapshot,
        | "query"
        | "normalizedQuery"
        | "location"
        | "device"
        | "provider"
        | "intent"
        | "topResultTitles"
        | "topResultUrls"
        | "competitorDomains"
        | "peopleAlsoAsk"
        | "relatedSearches"
        | "headingPatterns"
        | "contentGaps"
        | "featuredSnippetStyle"
        | "rankingDifficulty"
        | "dominantContentFormat"
        | "titleAnglePatterns"
        | "sectionGapAnalysis"
        | "summary"
        | "refreshedAt"
    >,
): AIBloggerSerpAnalysis {
    return {
        query: snapshot.query,
        normalizedQuery: snapshot.normalizedQuery,
        location: snapshot.location,
        device: snapshot.device,
        provider: snapshot.provider,
        intent: snapshot.intent,
        topResultTitles: snapshot.topResultTitles,
        topResultUrls: snapshot.topResultUrls,
        competitorDomains: snapshot.competitorDomains,
        peopleAlsoAsk: snapshot.peopleAlsoAsk,
        relatedSearches: snapshot.relatedSearches || [],
        headingPatterns: snapshot.headingPatterns,
        contentGaps: snapshot.contentGaps,
        featuredSnippetStyle: snapshot.featuredSnippetStyle,
        rankingDifficulty: snapshot.rankingDifficulty || "",
        dominantContentFormat: snapshot.dominantContentFormat || "",
        titleAnglePatterns: snapshot.titleAnglePatterns || [],
        sectionGapAnalysis: snapshot.sectionGapAnalysis || [],
        summary: snapshot.summary,
        cacheStatus: "cached",
        usedFallbackKey: false,
        refreshedAt: snapshot.refreshedAt,
    };
}

async function getCachedSerpAnalysis(
    agencyId: string,
    normalizedQuery: string,
    location: string,
    device: AIBloggerSerpDevice,
    refreshWindowHours: number,
    minimumTopResultUrls = 0,
) {
    await connectDB();

    const snapshot = await BlogStudioSerpSnapshotModel.findOne({
        agencyId,
        normalizedQuery,
        location,
        device,
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

    if ((snapshot.topResultUrls || []).length < minimumTopResultUrls) {
        return null;
    }

    return toSerpAnalysis(snapshot);
}

async function storeSerpSnapshot(agencyId: string, analysis: AIBloggerSerpAnalysis) {
    await connectDB();

    await BlogStudioSerpSnapshotModel.updateOne(
        {
            agencyId,
            normalizedQuery: analysis.normalizedQuery,
            location: analysis.location,
            device: analysis.device,
        },
        {
            $set: {
                agencyId,
                query: analysis.query,
                normalizedQuery: analysis.normalizedQuery,
                location: analysis.location,
                device: analysis.device,
                provider: analysis.provider,
                intent: analysis.intent,
                topResultTitles: analysis.topResultTitles,
                topResultUrls: analysis.topResultUrls,
                competitorDomains: analysis.competitorDomains,
                peopleAlsoAsk: analysis.peopleAlsoAsk,
                relatedSearches: analysis.relatedSearches,
                headingPatterns: analysis.headingPatterns,
                contentGaps: analysis.contentGaps,
                featuredSnippetStyle: analysis.featuredSnippetStyle,
                rankingDifficulty: analysis.rankingDifficulty,
                dominantContentFormat: analysis.dominantContentFormat,
                titleAnglePatterns: analysis.titleAnglePatterns,
                sectionGapAnalysis: analysis.sectionGapAnalysis,
                summary: analysis.summary,
                refreshedAt: analysis.refreshedAt,
                updatedAt: analysis.refreshedAt,
            },
            $setOnInsert: {
                id: crypto.randomUUID(),
                createdAt: analysis.refreshedAt,
            },
        },
        { upsert: true },
    );
}

function isQuotaOrRateLimitFailure(message: string) {
    const normalized = message.toLowerCase();
    return (
        normalized.includes("quota") ||
        normalized.includes("rate limit") ||
        normalized.includes("too many requests") ||
        normalized.includes("payment required") ||
        normalized.includes("credits") ||
        normalized.includes("out of searches") ||
        normalized.includes("run out of searches") ||
        normalized.includes("exhausted") ||
        normalized.includes("insufficient") ||
        normalized.includes("billing") ||
        normalized.includes("invalid api key") ||
        normalized.includes("invalid_api_key") ||
        normalized.includes("api key not valid") ||
        normalized.includes("unauthorized") ||
        normalized.includes("forbidden") ||
        normalized.includes("permission denied")
    );
}

async function fetchSerpApiJson<T>(
    params: Record<string, string>,
    options: {
        config: Pick<AIBloggerSerpConfig, "enabled" | "apiKey" | "fallbackApiKey" | "fallbackEnabled">;
        trendsApiKey?: string;
        trendsFallbackApiKey?: string;
        trendsFallbackEnabled?: boolean;
    },
): Promise<SerpApiResult<T>> {
    if (!options.config.enabled) {
        throw new Error("SERP Analysis is disabled in AI Blogger admin.");
    }

    const primaryKey = options.config.apiKey?.trim() || "";
    const fallbackKey = options.config.fallbackEnabled ? options.config.fallbackApiKey?.trim() || "" : "";
    const trendPrimaryKey = options.trendsApiKey?.trim() || "";
    const trendFallbackKey =
        options.trendsFallbackEnabled ? options.trendsFallbackApiKey?.trim() || "" : "";

    const keysToTry = sanitizeStringArray(
        [primaryKey, fallbackKey, trendPrimaryKey, trendFallbackKey],
        4,
        500,
    );

    if (!keysToTry.length) {
        throw new Error("SERP Analysis is enabled but no SerpAPI key is configured.");
    }

    let lastErrorMessage = "SerpAPI request failed.";

    for (let index = 0; index < keysToTry.length; index += 1) {
        const apiKey = keysToTry[index];
        const url = new URL("https://serpapi.com/search.json");

        for (const [key, value] of Object.entries(params)) {
            if (value) {
                url.searchParams.set(key, value);
            }
        }

        url.searchParams.set("api_key", apiKey);

        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                },
                signal: AbortSignal.timeout(15000),
            });
            const text = await response.text();

            if (!response.ok) {
                lastErrorMessage = text || `SerpAPI failed with status ${response.status}.`;
                const shouldRetry =
                    index < keysToTry.length - 1 &&
                    (response.status === 402 ||
                        response.status === 429 ||
                        isQuotaOrRateLimitFailure(lastErrorMessage));

                if (shouldRetry) {
                    continue;
                }

                throw new Error(lastErrorMessage);
            }

            const parsed = JSON.parse(text) as T & { error?: string };
            if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
                lastErrorMessage = String(parsed.error);
                const shouldRetry = index < keysToTry.length - 1 && isQuotaOrRateLimitFailure(lastErrorMessage);

                if (shouldRetry) {
                    continue;
                }

                throw new Error(lastErrorMessage);
            }

            return {
                data: parsed as T,
                usedFallbackKey: index > 0,
            };
        } catch (error) {
            if (error instanceof Error) {
                lastErrorMessage = error.message;
            }

            if (index >= keysToTry.length - 1) {
                throw new Error(lastErrorMessage);
            }
        }
    }

    throw new Error(lastErrorMessage);
}

export async function getAIBloggerSerpAnalysis(
    rawQuery: string,
    options: {
        agencyId?: string;
        enabled?: boolean;
        apiKey?: string;
        fallbackApiKey?: string;
        fallbackEnabled?: boolean;
        location?: string;
        device?: AIBloggerSerpDevice;
        maxCompetitors?: number;
        refreshWindowHours?: number;
        trendsApiKey?: string;
        trendsFallbackApiKey?: string;
        trendsFallbackEnabled?: boolean;
    },
): Promise<AIBloggerSerpAnalysis | null> {
    const query = sanitizeText(rawQuery, 180);
    if (!query) {
        return null;
    }

    if (options.enabled === false) {
        return null;
    }

    const normalizedQuery = normalizeQuery(query);
    const location = sanitizeLocation(options.location);
    const device = options.device === "mobile" ? "mobile" : "desktop";
    const maxCompetitors = Math.min(Math.max(options.maxCompetitors || 5, 3), 10);
    const refreshWindowHours = Math.min(Math.max(options.refreshWindowHours || 24, 1), 24 * 30);

    if (options.agencyId) {
        const cached = await getCachedSerpAnalysis(
            options.agencyId,
            normalizedQuery,
            location,
            device,
            refreshWindowHours,
            maxCompetitors,
        );

        if (cached) {
            return cached;
        }
    }

    const { data, usedFallbackKey } = await fetchSerpApiJson<unknown>(
        {
            engine: "google",
            q: query,
            gl: location,
            hl: "en",
            num: String(maxCompetitors),
            device,
        },
        {
            config: {
                enabled: options.enabled ?? true,
                apiKey: options.apiKey,
                fallbackApiKey: options.fallbackApiKey,
                fallbackEnabled: options.fallbackEnabled ?? true,
            },
            trendsApiKey: options.trendsApiKey,
            trendsFallbackApiKey: options.trendsFallbackApiKey,
            trendsFallbackEnabled: options.trendsFallbackEnabled,
        },
    );

    const organicResults = getTopOrganicResults(data, maxCompetitors);
    if (!organicResults.length) {
        throw new Error("SerpAPI returned no organic results for SERP Analysis.");
    }

    const rawPeopleAlsoAsk = getPeopleAlsoAsk(data);
    const relatedSearches = getRelatedSearches(data);
    const featuredSnippetStyle = getFeaturedSnippetStyle(data);
    const competitorPages = (
        await Promise.all(organicResults.slice(0, 3).map((result) => fetchCompetitorPage(result.link)))
    ).filter(Boolean) as SerpCompetitorPage[];
    const competitorDomains = getCompetitorDomains(organicResults);
    const headingPatterns = buildHeadingPatterns(competitorPages);
    const topResultTitles = sanitizeStringArray(
        organicResults.map((result) => result.title),
        maxCompetitors,
        180,
    );
    const topResultUrls = sanitizeStringArray(
        organicResults.map((result) => result.link),
        maxCompetitors,
        400,
    );

    // When SerpAPI returns 0 PAA items, generate synthetic questions from
    // competitor headings and related searches so the FAQ pack and content
    // gap analysis always have real SERP-derived question intelligence.
    const peopleAlsoAsk = rawPeopleAlsoAsk.length > 0
        ? rawPeopleAlsoAsk
        : buildSyntheticPAA(headingPatterns, relatedSearches, query);

    const intent = inferSearchIntent(query, topResultTitles, competitorDomains);
    const contentGaps = buildContentGaps(query, peopleAlsoAsk, headingPatterns);
    const rankingDifficulty = assessRankingDifficulty(competitorDomains, featuredSnippetStyle, intent);
    const dominantContentFormat = detectDominantContentFormat(intent, featuredSnippetStyle, headingPatterns, topResultTitles);
    const titleAnglePatterns = extractTitleAnglePatterns(topResultTitles);
    const sectionGapAnalysis = buildSectionGapAnalysis(query, headingPatterns, peopleAlsoAsk);
    const refreshedAt = new Date().toISOString();
    const summary = buildSummary(
        query,
        intent,
        organicResults,
        competitorDomains,
        peopleAlsoAsk,
        headingPatterns,
        contentGaps,
        featuredSnippetStyle,
        rankingDifficulty,
        dominantContentFormat,
        titleAnglePatterns,
        sectionGapAnalysis,
    );

    const analysis: AIBloggerSerpAnalysis = {
        query,
        normalizedQuery,
        location,
        device,
        provider: "serpapi",
        intent,
        topResultTitles,
        topResultUrls,
        competitorDomains,
        peopleAlsoAsk,
        relatedSearches,
        headingPatterns,
        contentGaps,
        featuredSnippetStyle,
        rankingDifficulty,
        dominantContentFormat,
        titleAnglePatterns,
        sectionGapAnalysis,
        summary,
        cacheStatus: "live",
        usedFallbackKey,
        refreshedAt,
    };

    if (options.agencyId) {
        await storeSerpSnapshot(options.agencyId, analysis);
    }

    return analysis;
}
