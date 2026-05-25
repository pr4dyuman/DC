import "server-only";

import type { BlogStudioInputMode } from "./types-ai-blogger";
import type { AIBloggerTrendsConfig } from "./types";
import {
    sanitizeText,
    sanitizeStringArray,
    sanitizeLocation,
    formatLocationLabel,
} from "./ai-blogger-text-utils";

export type AIBloggerKeywordTrendResult = {
    keyword: string;
    trendingTopic: string;
    score: number;
    relatedQueries: string[];
};

export type AIBloggerViralTrendSignal = {
    topic: string;
    score: number;
    viralScore: number;
    fitScore: number;
    active: boolean | null;
    searchVolume?: number;
    increasePercentage?: number;
    startedAt?: string;
    categories: string[];
    trendBreakdown: string[];
    relatedQueries: string[];
    reasons: string[];
    sourceRank?: number;
    sourceGeo?: string;
    sourceHours?: number;
    sourceCategory?: string;
    acceptedForTrendFirst?: boolean;
    rejectionReasons?: string[];
};

export type AIBloggerTrendScanStats = {
    trendFirstMode: boolean;
    requestCount: number;
    maxRequests: number;
    timeBudgetMs: number;
    elapsedMs: number;
    windowsScanned: number[];
    categoriesScanned: string[];
    geoScanned: string[];
    acceptedCount: number;
    rejectedCount: number;
    errorCount?: number;
    lastError?: string;
    stoppedEarly: boolean;
    budgetExhausted: boolean;
    fallbackUsed: boolean;
};

export type AIBloggerTrendQueryCandidate = {
    query: string;
    score: number;
    reasons: string[];
    selectedForTimeseries: boolean;
    selectedForRelatedQueries: boolean;
};

export type AIBloggerTrendQueryPlan = {
    candidateCount: number;
    selectedTimeseriesQueries: string[];
    selectedRelatedQueryQueries: string[];
    timeseriesBatchCount: number;
    relatedQueryRequestCount: number;
    candidates: AIBloggerTrendQueryCandidate[];
};

export type AIBloggerTrendSignals = {
    mode: "live-topics" | "keyword-analysis";
    provider: "serpapi";
    location: string;
    usedFallbackKey: boolean;
    candidateTopics: string[];
    relatedQueries: string[];
    keywordResults: AIBloggerKeywordTrendResult[];
    viralTrends: AIBloggerViralTrendSignal[];
    selectedViralTrend?: AIBloggerViralTrendSignal;
    scanStats?: AIBloggerTrendScanStats;
    queryPlan?: AIBloggerTrendQueryPlan;
    summary: string;
};

type FetchSerpApiResult<T> = {
    data: T;
    usedFallbackKey: boolean;
};

type FetchTrendSignalsInput = {
    config: AIBloggerTrendsConfig;
    sourceMode: BlogStudioInputMode;
    sourceValue: string;
    trendFocus?: string;
    primaryKeyword?: string;
    location?: string;
    fallbackCandidates?: string[];
};

function getTokenList(value: string) {
    return value
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length > 1);
}

const LOW_VALUE_MATCH_TOKENS = new Set([
    "and",
    "are",
    "best",
    "can",
    "for",
    "from",
    "guide",
    "how",
    "into",
    "near",
    "new",
    "now",
    "the",
    "this",
    "tips",
    "top",
    "trend",
    "trends",
    "use",
    "using",
    "what",
    "why",
    "with",
]);

function getMeaningfulTokenList(value: string) {
    return getTokenList(value).filter((token) => !LOW_VALUE_MATCH_TOKENS.has(token));
}

const TREND_QUERY_PLANNER_CANDIDATE_LIMIT = 30;
const GOOGLE_TRENDS_TIMESERIES_BATCH_SIZE = 5;
const GOOGLE_TRENDS_KEYWORD_TIMESERIES_LIMIT = 15;
const GOOGLE_TRENDS_RELATED_QUERY_LIMIT = 8;
const GENERIC_SINGLE_WORD_TREND_QUERIES = new Set([
    "ads",
    "audit",
    "blog",
    "brand",
    "content",
    "creative",
    "growth",
    "marketing",
    "ppc",
    "seo",
    "services",
    "social",
    "strategy",
]);

function looksLikeUrl(value: string) {
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(trimmed);
}

function normalizeTrendQuery(value: string) {
    return sanitizeText(
        value
            .replace(/^https?:\/\/\S+/i, "")
            .replace(/\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?/gi, "")
            .replace(/[|•·]+/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        120,
    );
}

function isLowValueTrendQuery(value: string) {
    const query = normalizeTrendQuery(value);
    if (!query || looksLikeUrl(value)) {
        return true;
    }

    const tokens = getMeaningfulTokenList(query);
    const rawTokens = getTokenList(query);
    if (tokens.length === 0) {
        return true;
    }

    if (tokens.length === 1 && (tokens[0].length < 6 || GENERIC_SINGLE_WORD_TREND_QUERIES.has(tokens[0]))) {
        return true;
    }

    if (rawTokens.length > 10) {
        return true;
    }

    if (
        /\b(?:home|login|dashboard|copy body|copy meta|draft status|publishing status)\b/i.test(query) ||
        /\$\{|\bAI_BLOGGER_WEBHOOK_SECRET\b/i.test(query) ||
        /\b(?:first published AI Blogger file|published AI Blogger dispatches|webhook receives a post|webhook delivery status|shared webhook secret|same shared secret|copy\s+\$?\{?nextStatus|PUBLISH'\s*:\s*'UNPUBLISH)\b/i.test(query) ||
        /[.!?]$/.test(query) ||
        /\b(?:before drafting begins|in one place|workflow for planning|status in one place)\b/i.test(query)
    ) {
        return true;
    }

    if (tokens.length >= 8 && /\b(?:is|are|was|were|can|could|should|must|before|after)\b/i.test(query)) {
        return true;
    }

    return /^(?:home|about|contact|pricing|blog|services?|products?|solutions?)$/i.test(query);
}

function getTrendQueryIntentScore(query: string) {
    const tokenCount = getMeaningfulTokenList(query).length;
    const longTailScore =
        tokenCount >= 3 && tokenCount <= 7 ? 18
            : tokenCount === 2 ? 10
                : tokenCount > 7 ? 8
                    : 0;
    const intentScore = /\b(?:ai|automation|best|checklist|compare|cost|guide|how|ideas?|near me|pricing|services?|software|strategy|template|tools?|trends?|vs|what|why)\b/i.test(query)
        ? 8
        : 0;

    return longTailScore + intentScore;
}

function addTrendQueryCandidate(
    candidates: Map<string, AIBloggerTrendQueryCandidate>,
    value: string,
    baseScore: number,
    reason: string,
) {
    const query = normalizeTrendQuery(value);
    if (isLowValueTrendQuery(query)) {
        return;
    }

    const key = query.toLowerCase();
    const score = clampScore(baseScore + getTrendQueryIntentScore(query));
    const existing = candidates.get(key);
    if (!existing || score > existing.score) {
        candidates.set(key, {
            query,
            score,
            reasons: sanitizeStringArray(
                [
                    reason,
                    `tokens ${getMeaningfulTokenList(query).length}`,
                    getTrendQueryIntentScore(query) > 0 ? "query-shape" : "",
                ],
                5,
                80,
            ),
            selectedForTimeseries: false,
            selectedForRelatedQueries: false,
        });
        return;
    }

    candidates.set(key, {
        ...existing,
        reasons: sanitizeStringArray([...existing.reasons, reason], 5, 80),
    });
}

function buildTrendQueryPlan(input: FetchTrendSignalsInput, sourceValueHint: string): AIBloggerTrendQueryPlan {
    const candidates = new Map<string, AIBloggerTrendQueryCandidate>();

    addTrendQueryCandidate(candidates, input.primaryKeyword || "", 86, "primary-keyword");
    addTrendQueryCandidate(candidates, input.trendFocus || "", 78, "trend-focus");

    if (sourceValueHint) {
        addTrendQueryCandidate(candidates, sourceValueHint, input.sourceMode === "website" ? 24 : 64, "source-value");
    }

    for (const [index, candidate] of (input.fallbackCandidates || []).entries()) {
        addTrendQueryCandidate(
            candidates,
            candidate,
            Math.max(34, 70 - index * 2),
            "website-candidate",
        );
    }

    const rankedCandidates = Array.from(candidates.values())
        .sort((left, right) => right.score - left.score || left.query.localeCompare(right.query))
        .slice(0, TREND_QUERY_PLANNER_CANDIDATE_LIMIT);
    const selectedTimeseriesQueries = rankedCandidates
        .slice(0, GOOGLE_TRENDS_KEYWORD_TIMESERIES_LIMIT)
        .map((candidate) => candidate.query);
    const selectedRelatedQueryQueries = rankedCandidates
        .slice(0, GOOGLE_TRENDS_RELATED_QUERY_LIMIT)
        .map((candidate) => candidate.query);
    const selectedTimeseriesSet = new Set(selectedTimeseriesQueries.map((query) => query.toLowerCase()));
    const selectedRelatedSet = new Set(selectedRelatedQueryQueries.map((query) => query.toLowerCase()));

    return {
        candidateCount: rankedCandidates.length,
        selectedTimeseriesQueries,
        selectedRelatedQueryQueries,
        timeseriesBatchCount: Math.ceil(selectedTimeseriesQueries.length / GOOGLE_TRENDS_TIMESERIES_BATCH_SIZE),
        relatedQueryRequestCount: selectedRelatedQueryQueries.length,
        candidates: rankedCandidates.map((candidate) => ({
            ...candidate,
            selectedForTimeseries: selectedTimeseriesSet.has(candidate.query.toLowerCase()),
            selectedForRelatedQueries: selectedRelatedSet.has(candidate.query.toLowerCase()),
        })),
    };
}

function clampScore(value: number) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTrendFit(text: string, hints: string[]) {
    const textTokens = new Set(getMeaningfulTokenList(text));
    if (!textTokens.size || !hints.length) {
        return 0;
    }

    const normalizedText = text.toLowerCase();
    const scoredHints = hints
        .map((hint) => {
            const cleanedHint = hint.trim();
            const hintTokens = getMeaningfulTokenList(cleanedHint);
            if (!hintTokens.length) {
                return 0;
            }

            const overlap = hintTokens.filter((token) => textTokens.has(token)).length;
            const coverage = overlap / Math.max(1, Math.min(hintTokens.length, textTokens.size));
            const phraseBoost = cleanedHint.length >= 4 && normalizedText.includes(cleanedHint.toLowerCase()) ? 22 : 0;
            const multiTokenBoost = overlap >= 2 ? 12 : overlap === 1 ? 4 : 0;

            return clampScore((coverage * 66) + phraseBoost + multiTokenBoost);
        })
        .sort((left, right) => right - left);

    if (!scoredHints.length) {
        return 0;
    }

    const best = scoredHints[0] || 0;
    const supportCount = Math.min(3, Math.max(0, scoredHints.length - 1));
    const support = supportCount > 0
        ? scoredHints.slice(1, 1 + supportCount).reduce((sum, score) => sum + score, 0) / supportCount
        : 0;

    return clampScore((best * 0.78) + (support * 0.22));
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

function getTrendErrorMessage(error: unknown) {
    return error instanceof Error && error.message ? error.message : "Google Trends request failed.";
}

async function fetchSerpApiJson<T>(
    params: Record<string, string>,
    config: AIBloggerTrendsConfig,
    options?: { timeoutMs?: number },
): Promise<FetchSerpApiResult<T>> {
    if (!config.enabled) {
        throw new Error("Live Trends is disabled in AI Blogger admin.");
    }

    const primaryKey = config.apiKey?.trim() || "";
    const fallbackKey = config.fallbackEnabled ? config.fallbackApiKey?.trim() || "" : "";
    const keysToTry = sanitizeStringArray([primaryKey, fallbackKey], 2, 500);

    if (!keysToTry.length) {
        throw new Error("Live Trends is enabled but no SerpAPI key is configured.");
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

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 15000);

        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                },
                signal: controller.signal,
            });
            const text = await response.text();

            if (!response.ok) {
                lastErrorMessage = text || `SerpAPI failed with status ${response.status}.`;
                const shouldRetry = index < keysToTry.length - 1 && (response.status === 402 || response.status === 429 || isQuotaOrRateLimitFailure(lastErrorMessage));
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
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error(lastErrorMessage);
}

function parseTrendNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== "string") {
        return undefined;
    }

    const match = value.replace(/,/g, "").trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([kmb])?/i);
    if (!match) {
        return undefined;
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) {
        return undefined;
    }

    const suffix = match[2]?.toLowerCase();
    const multiplier = suffix === "b" ? 1_000_000_000 : suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : 1;

    return Math.round(amount * multiplier);
}

function formatTrendMetric(value: number | undefined) {
    if (value === undefined || !Number.isFinite(value)) {
        return "unknown";
    }

    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
    }

    if (value >= 1_000) {
        return `${Math.round(value / 1_000)}K`;
    }

    return `${Math.round(value)}`;
}

function formatTrendPercentage(value: number | undefined) {
    if (value === undefined || !Number.isFinite(value)) {
        return "unknown";
    }

    return `${Math.round(value)}%`;
}

function toIsoFromUnixSeconds(value: unknown) {
    const timestamp = parseTrendNumber(value);
    if (!timestamp) {
        return undefined;
    }

    const date = new Date(timestamp * 1000);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function scoreTrendRecency(startedAt?: string) {
    if (!startedAt) {
        return 6;
    }

    const startedMs = new Date(startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
        return 6;
    }

    const ageHours = (Date.now() - startedMs) / (60 * 60 * 1000);
    if (ageHours <= 0) {
        return 10;
    }
    if (ageHours <= 3) {
        return 15;
    }
    if (ageHours <= 8) {
        return 12;
    }
    if (ageHours <= 24) {
        return 9;
    }
    if (ageHours <= 48) {
        return 5;
    }

    return 2;
}

function scoreTrendVirality(input: {
    active: boolean | null;
    searchVolume?: number;
    increasePercentage?: number;
    startedAt?: string;
    trendBreakdown: string[];
}) {
    const volumeScore = input.searchVolume
        ? Math.min(35, Math.round(Math.log10(input.searchVolume + 10) * 7))
        : 8;
    const growthScore = input.increasePercentage
        ? Math.min(35, Math.round(Math.log10(input.increasePercentage + 10) * 11))
        : 8;
    const activeScore = input.active === true ? 15 : input.active === false ? 0 : 7;
    const recencyScore = scoreTrendRecency(input.startedAt);
    const breakdownScore = Math.min(10, input.trendBreakdown.length * 2);

    return clampScore(volumeScore + growthScore + activeScore + recencyScore + breakdownScore);
}

function buildViralTrendScore(input: {
    topic: string;
    active: boolean | null;
    searchVolume?: number;
    increasePercentage?: number;
    startedAt?: string;
    categories: string[];
    trendBreakdown: string[];
    fitHints: string[];
    sourceRank?: number;
    sourceGeo?: string;
    sourceHours?: number;
    sourceCategory?: string;
}): AIBloggerViralTrendSignal {
    const fitText = [
        input.topic,
        ...input.trendBreakdown,
        ...input.categories,
    ].join(" ");
    const fitScore = scoreTrendFit(fitText, input.fitHints);
    const viralScore = scoreTrendVirality(input);
    const hasFitHints = input.fitHints.length > 0;
    const lowFitPenalty = hasFitHints && fitScore < 10 ? 18 : 0;
    const strongFitBoost = fitScore >= 45 ? 8 : fitScore >= 25 ? 4 : 0;
    const score = clampScore((viralScore * (fitScore >= 15 || !hasFitHints ? 0.58 : 0.35)) + (fitScore * 0.42) + strongFitBoost - lowFitPenalty);
    const reasons = sanitizeStringArray(
        [
            `viral ${viralScore}`,
            `site-fit ${fitScore}`,
            input.active === true ? "active now" : input.active === false ? "not active" : "",
            input.searchVolume ? `volume ${formatTrendMetric(input.searchVolume)}` : "",
            input.increasePercentage ? `growth +${formatTrendPercentage(input.increasePercentage)}` : "",
            lowFitPenalty ? "low site fit penalty" : "",
        ],
        6,
        80,
    );

    return {
        topic: input.topic,
        score,
        viralScore,
        fitScore,
        active: input.active,
        searchVolume: input.searchVolume,
        increasePercentage: input.increasePercentage,
        startedAt: input.startedAt,
        categories: input.categories,
        trendBreakdown: input.trendBreakdown,
        relatedQueries: sanitizeStringArray(input.trendBreakdown, 8, 120),
        reasons,
        sourceRank: input.sourceRank,
        sourceGeo: input.sourceGeo,
        sourceHours: input.sourceHours,
        sourceCategory: input.sourceCategory,
    };
}

function extractTrendingNowViralTrends(
    data: unknown,
    fitHints: string[],
    source?: {
        geo?: string;
        hours?: number;
        category?: string;
    },
) {
    if (!data || typeof data !== "object") {
        return [];
    }

    const record = data as {
        trending_searches?: Array<{
            query?: string;
            active?: boolean;
            search_volume?: number | string;
            increase_percentage?: number | string;
            start_timestamp?: number | string;
            categories?: Array<{ name?: string } | string>;
            trend_breakdown?: string[];
        }>;
        daily_searches?: Array<{
            searches?: Array<{
                query?: { query?: string } | string;
                formattedTraffic?: string;
                traffic?: number | string;
                relatedQueries?: string[];
            }>;
        }>;
    };

    const liveTrends = (record.trending_searches || [])
        .map((item, index) => {
            const topic = sanitizeText(item.query, 140);
            if (!topic) {
                return null;
            }

            const categories = sanitizeStringArray(
                (item.categories || []).map((category) =>
                    typeof category === "string" ? category : category.name,
                ),
                5,
                80,
            );
            const trendBreakdown = sanitizeStringArray(item.trend_breakdown || [], 10, 120);

            return buildViralTrendScore({
                topic,
                active: typeof item.active === "boolean" ? item.active : null,
                searchVolume: parseTrendNumber(item.search_volume),
                increasePercentage: parseTrendNumber(item.increase_percentage),
                startedAt: toIsoFromUnixSeconds(item.start_timestamp),
                categories,
                trendBreakdown,
                fitHints,
                sourceRank: index + 1,
                sourceGeo: source?.geo,
                sourceHours: source?.hours,
                sourceCategory: source?.category,
            });
        })
        .filter((trend): trend is AIBloggerViralTrendSignal => Boolean(trend));

    const dailyFallbackTrends = (record.daily_searches || [])
        .flatMap((day) => day.searches || [])
        .map((search, index) => {
            const queryValue = typeof search.query === "string" ? search.query : search.query?.query;
            const topic = sanitizeText(queryValue, 140);
            if (!topic) {
                return null;
            }

            return buildViralTrendScore({
                topic,
                active: null,
                searchVolume: parseTrendNumber(search.traffic || search.formattedTraffic),
                categories: [],
                trendBreakdown: sanitizeStringArray(search.relatedQueries || [], 8, 120),
                fitHints,
                sourceRank: index + 1,
                sourceGeo: source?.geo,
                sourceHours: source?.hours,
                sourceCategory: source?.category,
            });
        })
        .filter((trend): trend is AIBloggerViralTrendSignal => Boolean(trend));

    return [...liveTrends, ...dailyFallbackTrends]
        .sort((left, right) =>
            right.score - left.score ||
            right.fitScore - left.fitScore ||
            right.viralScore - left.viralScore ||
            left.topic.localeCompare(right.topic),
        );
}

function normalizeTrendKey(value: string) {
    return getMeaningfulTokenList(value).join(" ");
}

function mergeViralTrendSignals(
    existing: AIBloggerViralTrendSignal | undefined,
    next: AIBloggerViralTrendSignal,
) {
    if (!existing) {
        return next;
    }

    const best = next.score > existing.score ? next : existing;
    const other = best === next ? existing : next;
    const sourceRanks = [best.sourceRank, other.sourceRank]
        .filter((rank): rank is number => typeof rank === "number" && Number.isFinite(rank));

    return {
        ...best,
        searchVolume: Math.max(best.searchVolume || 0, other.searchVolume || 0) || best.searchVolume || other.searchVolume,
        increasePercentage: Math.max(best.increasePercentage || 0, other.increasePercentage || 0) || best.increasePercentage || other.increasePercentage,
        categories: sanitizeStringArray([...best.categories, ...other.categories], 8, 80),
        trendBreakdown: sanitizeStringArray([...best.trendBreakdown, ...other.trendBreakdown], 12, 120),
        relatedQueries: sanitizeStringArray([...best.relatedQueries, ...other.relatedQueries], 12, 120),
        reasons: sanitizeStringArray([...best.reasons, ...other.reasons], 8, 100),
        sourceRank: sourceRanks.length ? Math.min(...sourceRanks) : undefined,
    };
}

function getConfiguredNumber(value: number | undefined, fallback: number, min: number, max: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(value)));
}

function getTrendCategoryHints(fitHints: string[]) {
    const text = fitHints.join(" ").toLowerCase();
    const categories: string[] = [];

    if (/\b(ai|artificial intelligence|software|saas|app|apps|tech|technology|automation|data|cyber|seo tool|tools)\b/i.test(text)) {
        categories.push("18");
    }

    if (/\b(marketing|advertising|ads|agency|brand|branding|seo|ppc|content|social media|lead generation|sales|commerce|business|video production|influencer)\b/i.test(text)) {
        categories.push("3");
    }

    if (/\b(health|medical|doctor|clinic|fitness|wellness|therapy|dentist)\b/i.test(text)) {
        categories.push("7");
    }

    if (/\b(travel|hotel|tourism|restaurant|food|recipe|fashion|beauty|lifestyle)\b/i.test(text)) {
        categories.push("10");
    }

    return sanitizeStringArray(categories, 3, 12);
}

function buildTrendScanPlan(location: string, fitHints: string[], maxRequests: number) {
    const primaryGeo = location ? location.toUpperCase() : "";
    const windows = [4, 24, 48, 168];
    const categoryHints = getTrendCategoryHints(fitHints);
    const plan: Array<{ geo: string; hours?: number; category?: string; onlyActive: boolean }> = [];

    for (const hours of windows) {
        plan.push({ geo: primaryGeo, hours, onlyActive: true });
    }

    for (const category of categoryHints) {
        plan.push({ geo: primaryGeo, hours: 24, category, onlyActive: true });
    }

    plan.push({ geo: primaryGeo, hours: 48, onlyActive: false });

    const seen = new Set<string>();
    return plan
        .filter((item) => {
            const key = `${item.geo}:${item.hours || "default"}:${item.category || "all"}:${item.onlyActive}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, maxRequests);
}

function markTrendFirstEligibility(
    trend: AIBloggerViralTrendSignal,
    input: {
        hasFitHints: boolean;
        minimumFitScore: number;
        minimumTrendScore: number;
    },
): AIBloggerViralTrendSignal {
    const rejectionReasons: string[] = [];

    if (input.hasFitHints && trend.fitScore < input.minimumFitScore) {
        rejectionReasons.push(`site-fit below ${input.minimumFitScore}`);
    }

    if (trend.score < input.minimumTrendScore) {
        rejectionReasons.push(`score below ${input.minimumTrendScore}`);
    }

    if (trend.active === false && (trend.searchVolume || 0) < 10_000) {
        rejectionReasons.push("inactive low-volume trend");
    }

    return {
        ...trend,
        acceptedForTrendFirst: rejectionReasons.length === 0,
        rejectionReasons,
    };
}

async function fetchDeepTrendFirstSignals(input: {
    config: AIBloggerTrendsConfig;
    location: string;
    fitHints: string[];
}): Promise<{
    viralTrends: AIBloggerViralTrendSignal[];
    usedFallbackKey: boolean;
    scanStats: AIBloggerTrendScanStats;
}> {
    const maxRequests = getConfiguredNumber(input.config.maxTrendRequestsPerBlog, 8, 1, 20);
    const timeBudgetMs = getConfiguredNumber(input.config.trendScanTimeBudgetMs, 45_000, 8_000, 90_000);
    const minimumFitScore = getConfiguredNumber(input.config.minimumTrendFitScore, 55, 0, 80);
    const minimumTrendScore = getConfiguredNumber(input.config.minimumTrendScore, 60, 0, 95);
    const startedAt = Date.now();
    const plan = buildTrendScanPlan(input.location, input.fitHints, maxRequests);
    const trendMap = new Map<string, AIBloggerViralTrendSignal>();
    const windowsScanned = new Set<number>();
    const categoriesScanned = new Set<string>();
    const geoScanned = new Set<string>();
    let usedFallbackKey = false;
    let requestCount = 0;
    let stoppedEarly = false;
    let budgetExhausted = false;
    let errorCount = 0;
    let lastError = "";

    for (const scan of plan) {
        if (requestCount >= maxRequests) {
            budgetExhausted = true;
            break;
        }

        if (Date.now() - startedAt > timeBudgetMs) {
            budgetExhausted = true;
            break;
        }

        requestCount += 1;
        if (scan.hours) {
            windowsScanned.add(scan.hours);
        }
        if (scan.category) {
            categoriesScanned.add(scan.category);
        }
        geoScanned.add(scan.geo || "GLOBAL");

        try {
            const { data, usedFallbackKey: responseUsedFallbackKey } = await fetchSerpApiJson<unknown>(
                {
                    engine: "google_trends_trending_now",
                    geo: scan.geo,
                    hl: "en",
                    hours: scan.hours ? String(scan.hours) : "",
                    category_id: scan.category || "",
                    only_active: scan.onlyActive ? "true" : "",
                },
                input.config,
                { timeoutMs: Math.min(12_000, Math.max(6_000, Math.round(timeBudgetMs / Math.max(1, maxRequests)))) },
            );

            usedFallbackKey = usedFallbackKey || responseUsedFallbackKey;
            const trends = extractTrendingNowViralTrends(data, input.fitHints, {
                geo: scan.geo,
                hours: scan.hours,
                category: scan.category,
            });

            for (const trend of trends) {
                const scoredTrend = markTrendFirstEligibility(trend, {
                    hasFitHints: input.fitHints.length > 0,
                    minimumFitScore,
                    minimumTrendScore,
                });
                const key = normalizeTrendKey(scoredTrend.topic);
                if (!key) {
                    continue;
                }

                trendMap.set(key, markTrendFirstEligibility(
                    mergeViralTrendSignals(trendMap.get(key), scoredTrend),
                    {
                        hasFitHints: input.fitHints.length > 0,
                        minimumFitScore,
                        minimumTrendScore,
                    },
                ));
            }

            const acceptedCount = Array.from(trendMap.values()).filter((trend) => trend.acceptedForTrendFirst).length;
            if (acceptedCount >= 4 && requestCount >= 2) {
                stoppedEarly = true;
                break;
            }
        } catch (error) {
            errorCount += 1;
            lastError = getTrendErrorMessage(error);

            if (isQuotaOrRateLimitFailure(lastError)) {
                throw error;
            }

            // Keep scanning other windows/categories while strict trend-first
            // handling decides later whether an empty scan can continue.
        }
    }

    const viralTrends = Array.from(trendMap.values())
        .sort((left, right) =>
            (right.acceptedForTrendFirst ? 1 : 0) - (left.acceptedForTrendFirst ? 1 : 0) ||
            right.score - left.score ||
            right.fitScore - left.fitScore ||
            right.viralScore - left.viralScore ||
            (left.sourceRank || 9999) - (right.sourceRank || 9999) ||
            left.topic.localeCompare(right.topic),
        );
    const acceptedCount = viralTrends.filter((trend) => trend.acceptedForTrendFirst).length;

    return {
        viralTrends,
        usedFallbackKey,
        scanStats: {
            trendFirstMode: true,
            requestCount,
            maxRequests,
            timeBudgetMs,
            elapsedMs: Date.now() - startedAt,
            windowsScanned: Array.from(windowsScanned),
            categoriesScanned: Array.from(categoriesScanned),
            geoScanned: Array.from(geoScanned),
            acceptedCount,
            rejectedCount: Math.max(0, viralTrends.length - acceptedCount),
            errorCount,
            lastError: lastError || undefined,
            stoppedEarly,
            budgetExhausted,
            fallbackUsed: false,
        },
    };
}

type TrendTimelineValue = { value?: number | string; extracted_value?: number };
type TrendTimelineEntry = { values?: TrendTimelineValue[] };

function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function extractTrendTimelineValue(value: TrendTimelineValue | undefined) {
    if (!value) {
        return 0;
    }

    if (typeof value.extracted_value === "number") {
        return value.extracted_value;
    }

    if (typeof value.value === "number") {
        return value.value;
    }

    if (typeof value.value === "string") {
        const numeric = Number(value.value.replace(/[^0-9.]/g, ""));
        return Number.isFinite(numeric) ? numeric : 0;
    }

    return 0;
}

function getTimelineValues(timelineData: TrendTimelineEntry[] | undefined) {
    if (!timelineData?.length) {
        return [];
    }

    return timelineData
        .flatMap((entry) => entry.values || [])
        .map((value) => extractTrendTimelineValue(value))
        .filter((value) => Number.isFinite(value));
}

function getTrendMomentumScoreFromValues(values: number[]) {
    if (!values.length) {
        return 30;
    }

    const recentValues = values.slice(-3);
    const earlierValues = values.slice(0, Math.max(1, values.length - recentValues.length));
    const recentAverage = recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length;
    const earlierAverage = earlierValues.reduce((sum, value) => sum + value, 0) / earlierValues.length;
    const peak = Math.max(...values);
    const upwardMomentum = Math.max(0, recentAverage - earlierAverage);

    return clampScore((recentAverage * 0.55) + (peak * 0.25) + (upwardMomentum * 0.20));
}

function getTrendMomentumScore(timelineData: TrendTimelineEntry[] | undefined) {
    return getTrendMomentumScoreFromValues(getTimelineValues(timelineData));
}

function getTrendMomentumScoresByKeyword(
    timelineData: TrendTimelineEntry[] | undefined,
    keywords: string[],
) {
    const valuesByKeyword = new Map<string, number[]>(
        keywords.map((keyword) => [keyword, []]),
    );

    for (const entry of timelineData || []) {
        (entry.values || []).forEach((value, index) => {
            const keyword = keywords[index];
            if (!keyword) {
                return;
            }

            valuesByKeyword.get(keyword)?.push(extractTrendTimelineValue(value));
        });
    }

    return new Map(
        keywords.map((keyword) => [
            keyword,
            getTrendMomentumScoreFromValues(valuesByKeyword.get(keyword) || []),
        ]),
    );
}

async function fetchKeywordTrendResult(
    keyword: string,
    location: string,
    config: AIBloggerTrendsConfig,
    options?: { timeoutMs?: number },
): Promise<{ result: AIBloggerKeywordTrendResult; usedFallbackKey: boolean }> {
    let relatedQueries: string[] = [];
    let trendScore = 30;
    let usedFallbackKey = false;
    let sawLiveSignal = false;

    try {
        const { data, usedFallbackKey: relatedUsedFallbackKey } = await fetchSerpApiJson<{
            related_queries?: {
                rising?: Array<{ query?: string }>;
                top?: Array<{ query?: string }>;
            };
        }>(
            {
                engine: "google_trends",
                q: keyword,
                // Empty string = Global; SerpAPI omits geo automatically via fetchSerpApiJson.
                geo: location.toUpperCase(),
                data_type: "RELATED_QUERIES",
                date: "now 7-d",
            },
            config,
            options,
        );

        usedFallbackKey = usedFallbackKey || relatedUsedFallbackKey;
        relatedQueries = sanitizeStringArray(
            [
                ...(data.related_queries?.rising?.map((item) => item.query) || []),
                ...(data.related_queries?.top?.map((item) => item.query) || []),
            ],
            6,
            120,
        );
        sawLiveSignal = true;
    } catch (error) {
        if (isQuotaOrRateLimitFailure(getTrendErrorMessage(error))) {
            throw error;
        }
        relatedQueries = [];
    }

    try {
        const { data, usedFallbackKey: timeseriesUsedFallbackKey } = await fetchSerpApiJson<{
            interest_over_time?: {
                timeline_data?: Array<{ values?: Array<{ value?: number | string; extracted_value?: number }> }>;
            };
        }>(
            {
                engine: "google_trends",
                q: keyword,
                geo: location.toUpperCase(),
                data_type: "TIMESERIES",
                date: "now 7-d",
            },
            config,
            options,
        );

        usedFallbackKey = usedFallbackKey || timeseriesUsedFallbackKey;
        trendScore = getTrendMomentumScore(data.interest_over_time?.timeline_data);
        sawLiveSignal = true;
    } catch (error) {
        if (isQuotaOrRateLimitFailure(getTrendErrorMessage(error))) {
            throw error;
        }
        trendScore = relatedQueries.length > 0 ? 38 : 30;
    }

    try {
        if (!sawLiveSignal) {
            throw new Error("No Google Trends keyword signal.");
        }

        const trendingTopic = sanitizeText(
            relatedQueries[0] ? `${keyword} ${relatedQueries[0]}` : keyword,
            180,
            keyword,
        );

        return {
            result: {
                keyword,
                trendingTopic,
                score: trendScore,
                relatedQueries,
            },
            usedFallbackKey,
        };
    } catch {
        return {
            result: {
                keyword,
                trendingTopic: keyword,
                score: 30,
                relatedQueries: [],
            },
            usedFallbackKey: false,
        };
    }
}

async function fetchKeywordRelatedQueries(
    keyword: string,
    location: string,
    config: AIBloggerTrendsConfig,
    options?: { timeoutMs?: number },
) {
    const { data, usedFallbackKey } = await fetchSerpApiJson<{
        related_queries?: {
            rising?: Array<{ query?: string }>;
            top?: Array<{ query?: string }>;
        };
    }>(
        {
            engine: "google_trends",
            q: keyword,
            geo: location.toUpperCase(),
            data_type: "RELATED_QUERIES",
            date: "now 7-d",
        },
        config,
        options,
    );

    return {
        relatedQueries: sanitizeStringArray(
            [
                ...(data.related_queries?.rising?.map((item) => item.query) || []),
                ...(data.related_queries?.top?.map((item) => item.query) || []),
            ],
            6,
            120,
        ),
        usedFallbackKey,
    };
}

async function fetchKeywordTimeseriesBatch(
    keywords: string[],
    location: string,
    config: AIBloggerTrendsConfig,
    options?: { timeoutMs?: number },
) {
    const cleanKeywords = sanitizeStringArray(keywords, GOOGLE_TRENDS_TIMESERIES_BATCH_SIZE, 120);
    if (!cleanKeywords.length) {
        return {
            scores: new Map<string, number>(),
            usedFallbackKey: false,
        };
    }

    const { data, usedFallbackKey } = await fetchSerpApiJson<{
        interest_over_time?: {
            timeline_data?: TrendTimelineEntry[];
        };
    }>(
        {
            engine: "google_trends",
            q: cleanKeywords.join(","),
            geo: location.toUpperCase(),
            data_type: "TIMESERIES",
            date: "now 7-d",
        },
        config,
        options,
    );

    return {
        scores: getTrendMomentumScoresByKeyword(
            data.interest_over_time?.timeline_data,
            cleanKeywords,
        ),
        usedFallbackKey,
    };
}

async function fetchPlannedKeywordTrendResults(input: {
    queryPlan: AIBloggerTrendQueryPlan;
    location: string;
    config: AIBloggerTrendsConfig;
}): Promise<{ keywordResults: AIBloggerKeywordTrendResult[]; usedFallbackKey: boolean; queryPlan: AIBloggerTrendQueryPlan }> {
    const timeseriesQueries = input.queryPlan.selectedTimeseriesQueries;
    const timeseriesScores = new Map<string, number>();
    let usedFallbackKey = false;

    const timeseriesResults = await Promise.allSettled(
        chunkArray(timeseriesQueries, GOOGLE_TRENDS_TIMESERIES_BATCH_SIZE).map((batch) =>
            fetchKeywordTimeseriesBatch(batch, input.location, input.config, { timeoutMs: 9_000 }),
        ),
    );

    for (const result of timeseriesResults) {
        if (result.status !== "fulfilled") {
            if (isQuotaOrRateLimitFailure(getTrendErrorMessage(result.reason))) {
                throw result.reason;
            }
            continue;
        }

        usedFallbackKey = usedFallbackKey || result.value.usedFallbackKey;
        for (const [keyword, score] of result.value.scores) {
            timeseriesScores.set(keyword, score);
        }
    }

    const planScoreByQuery = new Map(
        input.queryPlan.candidates.map((candidate) => [candidate.query, candidate.score]),
    );
    const relatedQueryTargets = timeseriesQueries
        .map((query) => ({
            query,
            trendScore: timeseriesScores.get(query) ?? 30,
            planScore: planScoreByQuery.get(query) ?? 0,
        }))
        .sort((left, right) =>
            right.trendScore - left.trendScore ||
            right.planScore - left.planScore ||
            left.query.localeCompare(right.query),
        )
        .slice(0, GOOGLE_TRENDS_RELATED_QUERY_LIMIT)
        .map((item) => item.query);
    const relatedQueryTargetSet = new Set(relatedQueryTargets.map((query) => query.toLowerCase()));
    const relatedQueryResults = await Promise.allSettled(
        relatedQueryTargets.map(async (keyword) => {
            const related = await fetchKeywordRelatedQueries(
                keyword,
                input.location,
                input.config,
                { timeoutMs: 8_000 },
            );

            return {
                keyword,
                ...related,
            };
        }),
    );
    const relatedQueriesByKeyword = new Map<string, string[]>();

    for (const result of relatedQueryResults) {
        if (result.status !== "fulfilled") {
            if (isQuotaOrRateLimitFailure(getTrendErrorMessage(result.reason))) {
                throw result.reason;
            }
            continue;
        }

        usedFallbackKey = usedFallbackKey || result.value.usedFallbackKey;
        relatedQueriesByKeyword.set(result.value.keyword, result.value.relatedQueries);
    }

    const keywordResults = timeseriesQueries
        .map((keyword) => {
            const relatedQueries = relatedQueriesByKeyword.get(keyword) || [];
            const trendScore = timeseriesScores.get(keyword) ?? (relatedQueries.length > 0 ? 38 : 30);
            return {
                keyword,
                trendingTopic: sanitizeText(
                    relatedQueries[0] ? `${keyword} ${relatedQueries[0]}` : keyword,
                    180,
                    keyword,
                ),
                score: trendScore,
                relatedQueries,
            } satisfies AIBloggerKeywordTrendResult;
        })
        .sort((left, right) =>
            right.score - left.score ||
            (planScoreByQuery.get(right.keyword) || 0) - (planScoreByQuery.get(left.keyword) || 0) ||
            left.keyword.localeCompare(right.keyword),
        );

    return {
        keywordResults,
        usedFallbackKey,
        queryPlan: {
            ...input.queryPlan,
            selectedRelatedQueryQueries: relatedQueryTargets,
            relatedQueryRequestCount: relatedQueryTargets.length,
            candidates: input.queryPlan.candidates.map((candidate) => ({
                ...candidate,
                selectedForTimeseries: timeseriesQueries.some((query) => query.toLowerCase() === candidate.query.toLowerCase()),
                selectedForRelatedQueries: relatedQueryTargetSet.has(candidate.query.toLowerCase()),
            })),
        },
    };
}

export async function fetchAIBloggerKeywordTrendResult(
    keyword: string,
    location: string,
    config: AIBloggerTrendsConfig,
    options?: { timeoutMs?: number },
) {
    return fetchKeywordTrendResult(keyword, location, config, options);
}

function buildLiveTrendSummary(
    location: string,
    viralTrends: AIBloggerViralTrendSignal[],
    scanStats?: AIBloggerTrendScanStats,
) {
    const topTrend = viralTrends.find((trend) => trend.acceptedForTrendFirst) || viralTrends[0];
    if (!topTrend) {
        return `No live Google Trends topics were ranked for ${formatLocationLabel(location)} via SerpAPI.`;
    }

    const metrics = [
        `score ${topTrend.score}`,
        `viral ${topTrend.viralScore}`,
        `site-fit ${topTrend.fitScore}`,
        topTrend.searchVolume ? `volume ${formatTrendMetric(topTrend.searchVolume)}` : "",
        topTrend.increasePercentage ? `growth +${formatTrendPercentage(topTrend.increasePercentage)}` : "",
        topTrend.sourceRank ? `source rank ${topTrend.sourceRank}` : "",
    ].filter(Boolean);
    const scanPart = scanStats
        ? ` Scanned ${scanStats.requestCount}/${scanStats.maxRequests} request(s), ${scanStats.acceptedCount} trend-first match(es).`
        : "";

    return `Ranked ${viralTrends.length} Google Trends topics for ${formatLocationLabel(location)} by viral momentum and site fit via SerpAPI.${scanPart} Top: ${topTrend.topic} (${metrics.join(", ")}).`;
}

export async function fetchAIBloggerTrendSignals(input: FetchTrendSignalsInput): Promise<AIBloggerTrendSignals> {
    const location = sanitizeLocation(input.location, input.config.defaultLocation ?? "us");
    const sourceValueHint = input.sourceMode === "website" && looksLikeUrl(input.sourceValue)
        ? ""
        : input.sourceValue;
    const queryPlan = buildTrendQueryPlan(input, sourceValueHint);
    const fitHints = sanitizeStringArray(
        queryPlan.candidates.map((candidate) => candidate.query),
        36,
        180,
    );
    let trendFirstFallbackStats: AIBloggerTrendScanStats | undefined;
    let trendFirstUsedFallbackKey = false;

    if (input.config.trendFirstMode ?? true) {
        const deepScan = await fetchDeepTrendFirstSignals({
            config: input.config,
            location,
            fitHints,
        });
        trendFirstFallbackStats = {
            ...deepScan.scanStats,
            fallbackUsed: true,
        };
        trendFirstUsedFallbackKey = deepScan.usedFallbackKey;

        if (deepScan.viralTrends.length > 0) {
            const acceptedTrends = deepScan.viralTrends.filter((trend) => trend.acceptedForTrendFirst);
            const orderedTrends = acceptedTrends.length > 0
                ? [
                    ...acceptedTrends,
                    ...deepScan.viralTrends.filter((trend) => !trend.acceptedForTrendFirst),
                ].slice(0, 30)
                : deepScan.viralTrends.slice(0, 30);
            const candidateTrendPool = acceptedTrends.length > 0
                ? acceptedTrends
                : orderedTrends;
            const selectedViralTrend = input.sourceMode === "website"
                ? acceptedTrends[0]
                : acceptedTrends[0] || orderedTrends[0];
            const candidateTopics = sanitizeStringArray(
                [
                    ...(selectedViralTrend ? [selectedViralTrend.topic] : []),
                    ...candidateTrendPool.map((trend) => trend.topic),
                ],
                12,
                140,
            );
            const relatedQueries = sanitizeStringArray(
                orderedTrends.flatMap((trend) => trend.relatedQueries),
                12,
                120,
            );

            return {
                mode: "live-topics",
                provider: "serpapi",
                location,
                usedFallbackKey: deepScan.usedFallbackKey,
                candidateTopics,
                relatedQueries,
                keywordResults: [],
                viralTrends: orderedTrends,
                selectedViralTrend,
                scanStats: deepScan.scanStats,
                queryPlan,
                summary: buildLiveTrendSummary(location, orderedTrends, deepScan.scanStats),
            };
        }

        throw new Error(
            `Trend-first Google Trends scan returned no live topics after ${deepScan.scanStats.requestCount}/${deepScan.scanStats.maxRequests} request(s). ` +
            "Strict trend-first mode will not invent topics from website keywords.",
        );
    }

    const keywordsToAnalyze = queryPlan.selectedTimeseriesQueries;

    if (!keywordsToAnalyze.length) {
        throw new Error("No keyword candidates were available for Google Trends analysis.");
    }

    const plannedKeywordResults = await fetchPlannedKeywordTrendResults({
        queryPlan,
        location,
        config: input.config,
    });
    const keywordResults = plannedKeywordResults.keywordResults;
    const usedFallbackKey = trendFirstUsedFallbackKey || plannedKeywordResults.usedFallbackKey;

    const candidateTopics = sanitizeStringArray(
        keywordResults.flatMap((item) => [item.trendingTopic, item.keyword]),
        12,
        140,
    );
    const relatedQueries = sanitizeStringArray(
        keywordResults.flatMap((item) => item.relatedQueries),
        10,
        120,
    );

    if (!candidateTopics.length) {
        throw new Error("Google Trends did not return any candidate topics.");
    }

    return {
        mode: "keyword-analysis",
        provider: "serpapi",
        location,
        usedFallbackKey,
        candidateTopics,
        relatedQueries,
        keywordResults,
        viralTrends: [],
        scanStats: trendFirstFallbackStats,
        queryPlan: plannedKeywordResults.queryPlan,
        summary: trendFirstFallbackStats
            ? `Trend-first scan found no usable live topics after ${trendFirstFallbackStats.requestCount}/${trendFirstFallbackStats.maxRequests} request(s), then planned ${plannedKeywordResults.queryPlan.candidateCount} website-derived trend quer${plannedKeywordResults.queryPlan.candidateCount === 1 ? "y" : "ies"}, batched ${plannedKeywordResults.queryPlan.selectedTimeseriesQueries.length} time-series quer${plannedKeywordResults.queryPlan.selectedTimeseriesQueries.length === 1 ? "y" : "ies"}, and fetched related queries for ${plannedKeywordResults.queryPlan.relatedQueryRequestCount}.`
            : `Planned ${plannedKeywordResults.queryPlan.candidateCount} website-derived trend quer${plannedKeywordResults.queryPlan.candidateCount === 1 ? "y" : "ies"}, batched ${plannedKeywordResults.queryPlan.selectedTimeseriesQueries.length} Google Trends time-series quer${plannedKeywordResults.queryPlan.selectedTimeseriesQueries.length === 1 ? "y" : "ies"}, and fetched related queries for ${plannedKeywordResults.queryPlan.relatedQueryRequestCount} for ${formatLocationLabel(location)} via SerpAPI.`,
    };
}
