import "server-only";

import type { BlogStudioInputMode } from "./types-ai-blogger";
import type { AIBloggerTrendsConfig } from "./types";
import {
    sanitizeText,
    sanitizeStringArray,
    sanitizeLocation,
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

function looksLikeUrl(value: string) {
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(trimmed);
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
        normalized.includes("run out of searches")
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

    if (/\b(health|medical|doctor|clinic|fitness|wellness|therapy|dentist)\b/i.test(text)) {
        categories.push("7");
    }

    if (/\b(travel|hotel|tourism|restaurant|food|recipe|fashion|beauty|lifestyle)\b/i.test(text)) {
        categories.push("10");
    }

    return sanitizeStringArray(categories, 2, 12);
}

function buildTrendScanPlan(location: string, fitHints: string[], maxRequests: number) {
    const primaryGeo = (location || "us").toUpperCase();
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

    if (primaryGeo !== "US") {
        plan.push({ geo: "US", hours: 24, onlyActive: true });
        plan.push({ geo: "US", hours: 48, onlyActive: true });
    }

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
        geoScanned.add(scan.geo);

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

function getTimelineValues(timelineData: Array<{ values?: Array<{ value?: number | string; extracted_value?: number }> }> | undefined) {
    if (!timelineData?.length) {
        return [];
    }

    return timelineData
        .flatMap((entry) => entry.values || [])
        .map((value) => {
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
        })
        .filter((value) => Number.isFinite(value));
}

function getTrendMomentumScore(timelineData: Array<{ values?: Array<{ value?: number | string; extracted_value?: number }> }> | undefined) {
    const values = getTimelineValues(timelineData);

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

async function fetchKeywordTrendResult(
    keyword: string,
    location: string,
    config: AIBloggerTrendsConfig,
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

function buildLiveTrendSummary(
    location: string,
    viralTrends: AIBloggerViralTrendSignal[],
    scanStats?: AIBloggerTrendScanStats,
) {
    const topTrend = viralTrends.find((trend) => trend.acceptedForTrendFirst) || viralTrends[0];
    if (!topTrend) {
        return `No live Google Trends topics were ranked for ${location.toUpperCase()} via SerpAPI.`;
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

    return `Ranked ${viralTrends.length} Google Trends topics for ${location.toUpperCase()} by viral momentum and site fit via SerpAPI.${scanPart} Top: ${topTrend.topic} (${metrics.join(", ")}).`;
}

export async function fetchAIBloggerTrendSignals(input: FetchTrendSignalsInput): Promise<AIBloggerTrendSignals> {
    const location = sanitizeLocation(input.location, input.config.defaultLocation || "us");
    const sourceValueHint = input.sourceMode === "website" && looksLikeUrl(input.sourceValue)
        ? ""
        : input.sourceValue;
    const fitHints = sanitizeStringArray(
        [
            sourceValueHint,
            input.trendFocus || "",
            input.primaryKeyword || "",
            ...(input.fallbackCandidates || []),
        ],
        36,
        180,
    );
    let trendFirstFallbackStats: AIBloggerTrendScanStats | undefined;
    let trendFirstUsedFallbackKey = false;

    if (input.config.trendFirstMode ?? true) {
        const deepScan = await fetchDeepTrendFirstSignals({
            config: input.config,
            location: location || "us",
            fitHints,
        });
        trendFirstFallbackStats = {
            ...deepScan.scanStats,
            fallbackUsed: true,
        };
        trendFirstUsedFallbackKey = deepScan.usedFallbackKey;

        if (deepScan.viralTrends.length > 0) {
            const acceptedTrends = deepScan.viralTrends.filter((trend) => trend.acceptedForTrendFirst);

            if (input.sourceMode === "website" && fitHints.length > 0 && acceptedTrends.length === 0) {
                throw new Error(
                    `Trend-first Google Trends scan found ${deepScan.viralTrends.length} live topic(s), ` +
                    `but none met the configured site-fit threshold. Strict trend-first mode will not generate an unrelated blog.`,
                );
            }

            const orderedTrends = [
                ...acceptedTrends,
                ...deepScan.viralTrends.filter((trend) => !trend.acceptedForTrendFirst),
            ].slice(0, 30);
            const candidateTrendPool = acceptedTrends.length > 0 ? acceptedTrends : orderedTrends;
            const selectedViralTrend = acceptedTrends[0] || orderedTrends[0];
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
                summary: buildLiveTrendSummary(location, orderedTrends, deepScan.scanStats),
            };
        }

        throw new Error(
            `Trend-first Google Trends scan returned no live topics after ${deepScan.scanStats.requestCount}/${deepScan.scanStats.maxRequests} request(s). ` +
            "Strict trend-first mode will not invent topics from website keywords.",
        );
    }

    const keywordsToAnalyze = sanitizeStringArray(
        [
            input.primaryKeyword || "",
            input.trendFocus || "",
            sourceValueHint,
            ...(input.fallbackCandidates || []),
        ],
        input.sourceMode === "website" ? 6 : 4,
        120,
    );

    if (!keywordsToAnalyze.length) {
        throw new Error("No keyword candidates were available for Google Trends analysis.");
    }

    const keywordResults: AIBloggerKeywordTrendResult[] = [];
    let usedFallbackKey = trendFirstUsedFallbackKey;

    for (const keyword of keywordsToAnalyze) {
        const response = await fetchKeywordTrendResult(keyword, location, input.config);
        if (response.usedFallbackKey) {
            usedFallbackKey = true;
        }
        keywordResults.push(response.result);
        await new Promise((resolve) => setTimeout(resolve, 120));
    }

    keywordResults.sort((left, right) => right.score - left.score);

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
        summary: trendFirstFallbackStats
            ? `Trend-first scan found no usable live topics after ${trendFirstFallbackStats.requestCount}/${trendFirstFallbackStats.maxRequests} request(s), then analyzed ${keywordResults.length} keyword candidates with Google Trends momentum and related queries for ${location.toUpperCase()} via SerpAPI.`
            : `Analyzed ${keywordResults.length} keyword candidates with Google Trends momentum and related queries for ${location.toUpperCase()} via SerpAPI.`,
    };
}
