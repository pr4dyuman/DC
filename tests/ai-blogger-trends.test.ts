import test from "node:test";
import assert from "node:assert/strict";

import { fetchAIBloggerTrendSignals } from "../lib/ai-blogger-trends";
import type { AIBloggerTrendsConfig } from "../lib/types-agency";

const trendsConfig: AIBloggerTrendsConfig = {
    enabled: true,
    provider: "serpapi",
    apiKey: "test-key",
    fallbackApiKey: "",
    fallbackEnabled: true,
    fallbackToAi: true,
    defaultLocation: "us",
    trendFirstMode: true,
    maxTrendRequestsPerBlog: 8,
    trendScanTimeBudgetMs: 45_000,
    minimumTrendFitScore: 55,
    minimumTrendScore: 60,
};

test("live trend discovery ranks site-matched viral topics above unrelated mega trends", async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
        requests.push(String(input));

        return new Response(
            JSON.stringify({
                trending_searches: [
                    {
                        query: "celebrity breakup",
                        active: true,
                        search_volume: 5_000_000,
                        increase_percentage: 5_000,
                        categories: [{ name: "Entertainment" }],
                        trend_breakdown: ["celebrity news", "red carpet"],
                    },
                    {
                        query: "ai marketing tools",
                        active: true,
                        search_volume: 250_000,
                        increase_percentage: 900,
                        categories: [{ name: "Business" }, { name: "Technology" }],
                        trend_breakdown: ["ai marketing automation", "seo ai tools", "content marketing ai"],
                    },
                ],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        const signals = await fetchAIBloggerTrendSignals({
            config: trendsConfig,
            sourceMode: "trending",
            sourceValue: "digital marketing agency",
            trendFocus: "AI marketing",
            primaryKeyword: "content marketing",
            location: "us",
            fallbackCandidates: ["seo services", "marketing automation", "content strategy"],
        });

        assert.equal(signals.mode, "live-topics");
        assert.equal(signals.candidateTopics[0], "ai marketing tools");
        assert.equal(signals.viralTrends[0]?.topic, "ai marketing tools");
        assert.ok((signals.viralTrends[0]?.fitScore || 0) > (signals.viralTrends[1]?.fitScore || 0));
        assert.match(requests[0] || "", /only_active=true/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("website keyword trend analysis uses recent time-series momentum", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const dataType = url.searchParams.get("data_type");

        if (dataType === "RELATED_QUERIES") {
            return new Response(
                JSON.stringify({
                    related_queries: {
                        rising: [{ query: "ai seo automation" }],
                        top: [{ query: "seo tools" }],
                    },
                }),
                {
                    status: 200,
                    headers: { "content-type": "application/json" },
                },
            );
        }

        return new Response(
            JSON.stringify({
                interest_over_time: {
                    timeline_data: [
                        { values: [{ extracted_value: 10 }] },
                        { values: [{ extracted_value: 20 }] },
                        { values: [{ extracted_value: 55 }] },
                        { values: [{ extracted_value: 90 }] },
                    ],
                },
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        const signals = await fetchAIBloggerTrendSignals({
            config: {
                ...trendsConfig,
                trendFirstMode: false,
            },
            sourceMode: "website",
            sourceValue: "https://example.com",
            trendFocus: "AI SEO",
            primaryKeyword: "AI SEO",
            location: "us",
            fallbackCandidates: ["SEO services"],
        });

        assert.equal(signals.mode, "keyword-analysis");
        assert.ok((signals.keywordResults[0]?.score || 0) > 30);
        assert.equal(signals.keywordResults[0]?.relatedQueries[0], "ai seo automation");
        assert.equal(signals.candidateTopics[0], "AI SEO ai seo automation");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("strict trend-first mode does not fall back to keyword analysis when SerpAPI credits are exhausted", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response(
            JSON.stringify({ error: "Your account has run out of searches." }),
            {
                status: 429,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        await assert.rejects(
            () => fetchAIBloggerTrendSignals({
                config: trendsConfig,
                sourceMode: "website",
                sourceValue: "https://example.com",
                trendFocus: "AI SEO",
                primaryKeyword: "SEO services",
                location: "us",
                fallbackCandidates: ["content optimization", "technical SEO", "SEO automation"],
            }),
            /out of searches/i,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("strict trend-first mode fails instead of inventing keyword topics when Trending Now has no rows", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response(
            JSON.stringify({ trending_searches: [] }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        await assert.rejects(
            () => fetchAIBloggerTrendSignals({
                config: {
                    ...trendsConfig,
                    maxTrendRequestsPerBlog: 2,
                },
                sourceMode: "website",
                sourceValue: "https://example.com",
                trendFocus: "AI SEO",
                primaryKeyword: "SEO services",
                location: "us",
                fallbackCandidates: ["content optimization", "technical SEO", "SEO automation"],
            }),
            /will not invent topics/i,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("website trend-first rejects viral topics that do not meet site fit", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response(
            JSON.stringify({
                trending_searches: [
                    {
                        query: "ncaa gymnastics semifinals 2026",
                        active: true,
                        search_volume: 1_200_000,
                        increase_percentage: 2400,
                        categories: [{ name: "Sports" }],
                        trend_breakdown: ["women's gymnastics bracket", "college sports tickets"],
                    },
                    {
                        query: "irs extension form",
                        active: true,
                        search_volume: 900_000,
                        increase_percentage: 1800,
                        categories: [{ name: "Finance" }],
                        trend_breakdown: ["file tax extension online", "tax deadline"],
                    },
                ],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        await assert.rejects(
            () => fetchAIBloggerTrendSignals({
                config: {
                    ...trendsConfig,
                    maxTrendRequestsPerBlog: 1,
                },
                sourceMode: "website",
                sourceValue: "https://example.com",
                trendFocus: "",
                primaryKeyword: "",
                location: "us",
                fallbackCandidates: ["digital production", "AI content workflow", "editorial guardrails"],
            }),
            /will not generate an unrelated blog/i,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("website trend-first can rescue a near-fit live topic without inventing a new topic", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response(
            JSON.stringify({
                trending_searches: [
                    {
                        query: "irs extension form",
                        active: true,
                        search_volume: 900_000,
                        increase_percentage: 1800,
                        categories: [{ name: "Finance" }],
                        trend_breakdown: ["file tax extension online", "tax deadline"],
                    },
                    {
                        query: "brand voice governance",
                        active: true,
                        search_volume: 160_000,
                        increase_percentage: 720,
                        categories: [{ name: "Business" }, { name: "Technology" }],
                        trend_breakdown: ["content approval systems", "quality review workflow"],
                    },
                ],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        const signals = await fetchAIBloggerTrendSignals({
            config: {
                ...trendsConfig,
                maxTrendRequestsPerBlog: 1,
            },
            sourceMode: "website",
            sourceValue: "https://example.com",
            trendFocus: "",
            primaryKeyword: "",
            location: "us",
            fallbackCandidates: ["brand voice insurance", "editorial guardrails", "digital production"],
        });

        assert.equal(signals.mode, "live-topics");
        assert.equal(signals.selectedViralTrend?.topic, "brand voice governance");
        assert.equal(signals.candidateTopics[0], "brand voice governance");
        assert.equal(signals.scanStats?.acceptedCount, 0);
        assert.ok((signals.selectedViralTrend?.fitScore || 0) < trendsConfig.minimumTrendFitScore);
        assert.ok((signals.selectedViralTrend?.fitScore || 0) >= 34);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("trend-first scan can select a lower-ranked website-matched trend", async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    const trendingSearches = Array.from({ length: 90 }, (_, index) => ({
        query: index === 86 ? "AI SEO tools" : `sports headline ${index + 1}`,
        active: true,
        search_volume: index === 86 ? 120_000 : 850_000,
        increase_percentage: index === 86 ? 700 : 1800,
        categories: [{ name: index === 86 ? "Technology" : "Sports" }],
        trend_breakdown: index === 86
            ? ["AI SEO automation", "content optimization tools", "technical SEO AI"]
            : ["match score", "team news"],
    }));

    globalThis.fetch = (async (input: RequestInfo | URL) => {
        requests.push(String(input));

        return new Response(
            JSON.stringify({ trending_searches: trendingSearches }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        const signals = await fetchAIBloggerTrendSignals({
            config: {
                ...trendsConfig,
                maxTrendRequestsPerBlog: 1,
                minimumTrendFitScore: 18,
                minimumTrendScore: 40,
            },
            sourceMode: "website",
            sourceValue: "https://example.com",
            trendFocus: "AI SEO",
            primaryKeyword: "SEO services",
            location: "us",
            fallbackCandidates: ["content optimization", "technical SEO", "SEO automation"],
        });

        assert.equal(signals.mode, "live-topics");
        assert.equal(signals.candidateTopics[0], "AI SEO tools");
        assert.equal(signals.selectedViralTrend?.topic, "AI SEO tools");
        assert.equal(signals.selectedViralTrend?.sourceRank, 87);
        assert.equal(signals.scanStats?.requestCount, 1);
        assert.ok(signals.scanStats?.acceptedCount);
        assert.match(requests[0] || "", /engine=google_trends_trending_now/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("pure trending mode selects the top viral trend when no fit hints are supplied", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response(
            JSON.stringify({
                trending_searches: [
                    {
                        query: "championship final",
                        active: true,
                        search_volume: 4_000_000,
                        increase_percentage: 4_500,
                        categories: [{ name: "Sports" }],
                        trend_breakdown: ["live score", "match highlights"],
                    },
                    {
                        query: "AI SEO tools",
                        active: true,
                        search_volume: 120_000,
                        increase_percentage: 700,
                        categories: [{ name: "Technology" }],
                        trend_breakdown: ["AI SEO automation", "content optimization tools"],
                    },
                ],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    }) as typeof fetch;

    try {
        const signals = await fetchAIBloggerTrendSignals({
            config: {
                ...trendsConfig,
                maxTrendRequestsPerBlog: 1,
            },
            sourceMode: "trending",
            sourceValue: "",
            trendFocus: "",
            primaryKeyword: "",
            location: "us",
            fallbackCandidates: [],
        });

        assert.equal(signals.mode, "live-topics");
        assert.equal(signals.candidateTopics[0], "championship final");
        assert.equal(signals.selectedViralTrend?.topic, "championship final");
        assert.ok((signals.selectedViralTrend?.viralScore || 0) > (signals.viralTrends[1]?.viralScore || 0));
    } finally {
        globalThis.fetch = originalFetch;
    }
});
