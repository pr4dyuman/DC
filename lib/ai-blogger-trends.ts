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

export type AIBloggerTrendSignals = {
    mode: "live-topics" | "keyword-analysis";
    provider: "serpapi";
    location: string;
    usedFallbackKey: boolean;
    candidateTopics: string[];
    relatedQueries: string[];
    keywordResults: AIBloggerKeywordTrendResult[];
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

function scoreTopicAgainstHints(topic: string, hints: string[]) {
    const topicTokens = new Set(getTokenList(topic));

    if (!topicTokens.size) {
        return 0;
    }

    let score = 0;

    for (const hint of hints) {
        const hintTokens = getTokenList(hint);
        if (!hintTokens.length) {
            continue;
        }

        const overlap = hintTokens.filter((token) => topicTokens.has(token)).length;
        score += overlap * 10;

        if (topic.toLowerCase().includes(hint.toLowerCase())) {
            score += 25;
        }
    }

    return score;
}

function prioritizeTopicsByHint(topics: string[], hints: string[]) {
    const normalizedHints = hints.map((hint) => hint.trim()).filter(Boolean);

    return [...topics].sort((left, right) => {
        const rightScore = scoreTopicAgainstHints(right, normalizedHints);
        const leftScore = scoreTopicAgainstHints(left, normalizedHints);

        if (rightScore !== leftScore) {
            return rightScore - leftScore;
        }

        return 0;
    });
}

function isQuotaOrRateLimitFailure(message: string) {
    const normalized = message.toLowerCase();
    return (
        normalized.includes("quota") ||
        normalized.includes("rate limit") ||
        normalized.includes("too many requests") ||
        normalized.includes("payment required") ||
        normalized.includes("credits")
    );
}

async function fetchSerpApiJson<T>(
    params: Record<string, string>,
    config: AIBloggerTrendsConfig,
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
        const timeout = setTimeout(() => controller.abort(), 15000);

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

function extractTrendingNowTopics(data: unknown) {
    if (!data || typeof data !== "object") {
        return [];
    }

    const record = data as {
        trending_searches?: Array<{ query?: string }>;
        daily_searches?: Array<{ searches?: Array<{ query?: { query?: string } }> }>;
    };

    return sanitizeStringArray(
        [
            ...(record.trending_searches?.map((item) => item.query) || []),
            ...(record.daily_searches?.flatMap((day) => day.searches?.map((search) => search.query?.query) || []) || []),
        ],
        20,
        140,
    );
}

function getAverageTrendScore(timelineData: Array<{ values?: Array<{ value?: number | string; extracted_value?: number }> }> | undefined) {
    if (!timelineData?.length) {
        return 30;
    }

    const values = timelineData
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

    if (!values.length) {
        return 30;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function fetchKeywordTrendResult(
    keyword: string,
    location: string,
    config: AIBloggerTrendsConfig,
): Promise<{ result: AIBloggerKeywordTrendResult; usedFallbackKey: boolean }> {
    try {
        const { data, usedFallbackKey } = await fetchSerpApiJson<{
            related_queries?: {
                rising?: Array<{ query?: string }>;
                top?: Array<{ query?: string }>;
            };
            interest_over_time?: {
                timeline_data?: Array<{ values?: Array<{ value?: number | string; extracted_value?: number }> }>;
            };
        }>(
            {
                engine: "google_trends",
                q: keyword,
                geo: location.toUpperCase(),
                data_type: "RELATED_QUERIES",
            },
            config,
        );

        const relatedQueries = sanitizeStringArray(
            [
                ...(data.related_queries?.rising?.map((item) => item.query) || []),
                ...(data.related_queries?.top?.map((item) => item.query) || []),
            ],
            6,
            120,
        );

        const trendingTopic = sanitizeText(
            relatedQueries[0] ? `${keyword} ${relatedQueries[0]}` : keyword,
            180,
            keyword,
        );

        return {
            result: {
                keyword,
                trendingTopic,
                score: getAverageTrendScore(data.interest_over_time?.timeline_data),
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

export async function fetchAIBloggerTrendSignals(input: FetchTrendSignalsInput): Promise<AIBloggerTrendSignals> {
    const location = sanitizeLocation(input.location, input.config.defaultLocation || "us");

    if (input.sourceMode === "trending") {
        const { data, usedFallbackKey } = await fetchSerpApiJson<unknown>(
            {
                engine: "google_trends_trending_now",
                geo: location.toUpperCase(),
            },
            input.config,
        );

        const trendingTopics = extractTrendingNowTopics(data);
        if (!trendingTopics.length) {
            throw new Error("SerpAPI returned no live Google Trends topics.");
        }

        const prioritizedTopics = prioritizeTopicsByHint(trendingTopics, [
            input.sourceValue,
            input.primaryKeyword || "",
        ]);
        const candidateTopics = sanitizeStringArray(prioritizedTopics, 12, 140);

        return {
            mode: "live-topics",
            provider: "serpapi",
            location,
            usedFallbackKey,
            candidateTopics,
            relatedQueries: [],
            keywordResults: [],
            summary: `Fetched ${candidateTopics.length} live Google Trends topics for ${location.toUpperCase()} via SerpAPI.`,
        };
    }

    const keywordsToAnalyze = sanitizeStringArray(
        [
            input.primaryKeyword || "",
            input.trendFocus || "",
            input.sourceValue,
            ...(input.fallbackCandidates || []),
        ],
        10,  // Test up to 10 keyword candidates for broader trend signal coverage
        120,
    );

    if (!keywordsToAnalyze.length) {
        throw new Error("No keyword candidates were available for Google Trends analysis.");
    }

    const keywordResults: AIBloggerKeywordTrendResult[] = [];
    let usedFallbackKey = false;

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
        summary: `Analyzed ${keywordResults.length} keyword candidates with Google Trends for ${location.toUpperCase()} via SerpAPI.`,
    };
}
