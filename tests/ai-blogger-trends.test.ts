import test from "node:test";
import assert from "node:assert/strict";

import {
    assessTrendAgainstWebsite,
    buildTrendFirstDiscoveryStage,
    isAcceptedTrendFirstTopic,
} from "../lib/actions/ai-blogger";
import type { AIBloggerWebsiteIntelligence } from "../lib/ai-blogger-website-intelligence";
import { fetchAIBloggerTrendSignals } from "../lib/ai-blogger-trends";
import type { AIBloggerTrendSignals, AIBloggerViralTrendSignal } from "../lib/ai-blogger-trends";
import type { AIBloggerStageConfig } from "../lib/types";
import type { BlogStudioBrief } from "../lib/types-ai-blogger";
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

const websiteBrief: BlogStudioBrief = {
    sourceMode: "website",
    sourceValue: "https://www.digitalcorvids.com/",
    trendFocus: "",
    audience: "",
    tone: "",
    cta: "",
    primaryKeyword: "",
    language: "en",
    location: "us",
};

const websiteIntelligence: AIBloggerWebsiteIntelligence = {
    sourceUrl: "https://www.digitalcorvids.com/",
    normalizedUrl: "https://www.digitalcorvids.com/",
    pageCount: 6,
    pageTitles: [
        "Editorial Guardrails for AI-Generated Assets (2026)",
        "Balancing Speed and Quality in Digital Production (2026)",
    ],
    topicHints: [
        "editorial guardrails for ai-generated assets",
        "brand voice insurance",
        "digital production",
        "human-in-the-loop workflow",
    ],
    faqQuestions: [
        "What is the difference between brand guidelines and brand guardrails in an AI workflow?",
        "How can brands balance speed and quality in their 2026 production workflows?",
    ],
    priorityPaths: ["/services/ai-blogger", "/services/seo", "/blog/editorial-guardrails"],
    priorityPages: [
        {
            path: "/services/ai-blogger",
            url: "https://www.digitalcorvids.com/services/ai-blogger",
            title: "AI Blogger",
            description: "Production-ready AI content workflow with editorial guardrails.",
            excerpt: "Scale content with human-in-the-loop review.",
            highlights: ["editorial guardrails", "human-in-the-loop review"],
            serviceSignals: ["brand voice insurance", "digital production workflow"],
            proofSignals: ["review and improve", "production-ready workflow"],
            ctaPatterns: ["GET STARTED"],
            pageCategory: "service",
            pageScore: 92,
        },
        {
            path: "/blog/editorial-guardrails",
            url: "https://www.digitalcorvids.com/blog/editorial-guardrails",
            title: "Editorial Guardrails for AI-Generated Assets",
            description: "Protect brand integrity while scaling AI output.",
            excerpt: "Brand governance and AI editorial systems.",
            highlights: ["brand governance", "ai content review"],
            serviceSignals: ["editorial guardrails", "brand voice insurance"],
            proofSignals: ["governed scaling"],
            ctaPatterns: ["LEARN MORE"],
            pageCategory: "blog",
            pageScore: 74,
        },
    ],
    serviceSignals: [
        "editorial guardrails",
        "brand voice insurance",
        "digital production workflow",
        "human-in-the-loop review",
    ],
    ctaPatterns: ["GET STARTED", "CONTACT US"],
    proofSignals: ["production-ready workflow", "review and improve"],
    summary: "Digital production and AI editorial workflow site.",
    cacheStatus: "cached",
    refreshedAt: "2026-04-23T00:00:00.000Z",
};

const testRuntimeConfig: AIBloggerStageConfig = {
    provider: "openai",
    model: "test-model",
    systemPrompt: "",
};

function buildTrendSignals(trends: AIBloggerViralTrendSignal[]): AIBloggerTrendSignals {
    return {
        mode: "live-topics",
        provider: "serpapi",
        location: "us",
        usedFallbackKey: false,
        candidateTopics: trends.map((trend) => trend.topic),
        relatedQueries: trends.flatMap((trend) => trend.relatedQueries),
        keywordResults: [],
        viralTrends: trends,
        selectedViralTrend: trends[0],
        summary: "Test live trends",
    };
}

function buildTrend(
    topic: string,
    categories: string[],
    relatedQueries: string[] = [],
    trendBreakdown: string[] = [],
): AIBloggerViralTrendSignal {
    return {
        topic,
        score: 60,
        viralScore: 70,
        fitScore: 0,
        active: true,
        searchVolume: 1_000,
        increasePercentage: 120,
        startedAt: "2026-04-23T00:00:00.000Z",
        categories,
        trendBreakdown,
        relatedQueries,
        reasons: [],
        sourceRank: 25,
        sourceGeo: "US",
        sourceHours: 24,
        acceptedForTrendFirst: false,
        rejectionReasons: [],
    };
}

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

test("website trend-first returns live topics without auto-selecting an unrelated website trend", async () => {
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
            fallbackCandidates: ["digital production", "AI content workflow", "editorial guardrails"],
        });

        assert.equal(signals.mode, "live-topics");
        assert.equal(signals.selectedViralTrend, undefined);
        assert.equal(signals.scanStats?.acceptedCount, 0);
        assert.ok(signals.candidateTopics.includes("ncaa gymnastics semifinals 2026"));
        assert.ok(signals.candidateTopics.includes("irs extension form"));
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("website trend-first does not rescue a near-fit live topic below threshold", async () => {
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
        assert.equal(signals.selectedViralTrend, undefined);
        assert.equal(signals.scanStats?.acceptedCount, 0);
        assert.ok(signals.candidateTopics.includes("brand voice governance"));
        const brandVoiceTrend = signals.viralTrends.find((trend) => trend.topic === "brand voice governance");
        assert.ok((brandVoiceTrend?.fitScore || 0) < trendsConfig.minimumTrendFitScore);
        assert.equal(brandVoiceTrend?.acceptedForTrendFirst, false);
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

test("trend-first lock is disabled for accepted trends that duplicate recent topics", () => {
    const duplicateTrend: AIBloggerViralTrendSignal = {
        ...buildTrend(
            "country calling 2026",
            ["Entertainment"],
            ["country"],
            ["country calling", "festival lineup"],
        ),
        score: 60,
        fitScore: 100,
        viralScore: 53,
        sourceRank: 794,
        sourceHours: 48,
        acceptedForTrendFirst: true,
    };
    const signals = buildTrendSignals([duplicateTrend]);
    const recentTopicTexts = [
        "Country Calling 2026: Festival Lineup and Search Demand",
    ];

    assert.equal(
        isAcceptedTrendFirstTopic("country calling 2026", signals, recentTopicTexts),
        false,
    );
    assert.equal(
        buildTrendFirstDiscoveryStage({
            trendSignals: signals,
            runtimeConfig: testRuntimeConfig,
            recentPostTitles: recentTopicTexts,
            sourceMode: "trending",
        }),
        null,
    );
});

test("trend-first direct selection skips duplicate accepted trend and uses a fresh accepted trend", () => {
    const duplicateTrend: AIBloggerViralTrendSignal = {
        ...buildTrend("country calling 2026", ["Entertainment"], ["country"], ["country calling"]),
        score: 70,
        fitScore: 100,
        viralScore: 65,
        acceptedForTrendFirst: true,
    };
    const freshTrend: AIBloggerViralTrendSignal = {
        ...buildTrend("AI content workflow 2026", ["Business", "Technology"], ["ai workflow"], ["content automation"]),
        score: 65,
        fitScore: 82,
        viralScore: 61,
        acceptedForTrendFirst: true,
    };
    const discovery = buildTrendFirstDiscoveryStage({
        trendSignals: buildTrendSignals([duplicateTrend, freshTrend]),
        runtimeConfig: testRuntimeConfig,
        recentPostTitles: ["Country Calling 2026: Festival Lineup and Search Demand"],
        sourceMode: "trending",
    });

    assert.equal(discovery?.discovery.selectedTopic, "AI content workflow 2026");
});

test("dynamic website fit rejects entertainment trends that only overlap on a year token", () => {
    const assessment = assessTrendAgainstWebsite(
        buildTrend(
            "country calling 2026",
            ["Entertainment"],
            ["country calling", "lainey wilson"],
            ["country calling", "festival lineup"],
        ),
        websiteIntelligence,
        websiteBrief,
        55,
    );

    assert.equal(assessment.accepted, false);
    assert.ok(assessment.score < 55);
    assert.deepEqual(assessment.matchedStrongTokens, []);
    assert.ok(
        assessment.reasons.some((reason) =>
            /no core site tokens matched|off-lane|below strict website-fit threshold/i.test(reason),
        ),
    );
});

test("dynamic website fit rejects local incident trends matched only by ambiguous site language", () => {
    const highSignalWebsiteIntelligence: AIBloggerWebsiteIntelligence = {
        ...websiteIntelligence,
        pageTitles: [
            "High Velocity Digital Production Systems",
            "High Quality Content Operations",
        ],
        topicHints: [
            "high velocity media production",
            "high quality brand systems",
        ],
        faqQuestions: [
            "How do high growth brands protect campaign quality?",
        ],
        priorityPages: [
            {
                path: "/services/high-velocity-production",
                url: "https://www.digitalcorvids.com/services/high-velocity-production",
                title: "High Velocity Production",
                description: "High quality digital production for content teams.",
                excerpt: "Build high impact launch systems.",
                highlights: ["high quality production", "high velocity content"],
                serviceSignals: ["high quality content", "high velocity media"],
                proofSignals: ["high impact launches"],
                ctaPatterns: ["GET STARTED"],
                pageCategory: "service",
                pageScore: 92,
            },
        ],
        serviceSignals: ["high quality content", "high velocity media"],
        proofSignals: ["high impact launches"],
        summary: "High velocity digital production site.",
    };

    const assessment = assessTrendAgainstWebsite(
        buildTrend(
            "foss high school",
            ["Law and Government"],
            ["foss high school stabbing", "tacoma washington"],
            ["foss high school stabbing", "hs"],
        ),
        highSignalWebsiteIntelligence,
        websiteBrief,
        55,
    );

    assert.equal(assessment.accepted, false);
    assert.ok(assessment.score < 55);
    assert.ok(!assessment.matchedStrongTokens.includes("high"));
    assert.ok(
        assessment.reasons.some((reason) =>
            /local institution incident|off-lane|no core site tokens|below strict website-fit threshold/i.test(reason),
        ),
    );
});

test("dynamic website fit accepts live topics with strong multi-signal site evidence", () => {
    const assessment = assessTrendAgainstWebsite(
        buildTrend(
            "editorial guardrails for ai-generated assets",
            ["Business", "Technology"],
            ["brand voice governance", "human-in-the-loop workflow"],
            ["brand voice insurance", "editorial guardrails"],
        ),
        websiteIntelligence,
        websiteBrief,
        55,
    );

    assert.equal(assessment.accepted, true);
    assert.ok(assessment.score >= 55);
    assert.ok(assessment.groupMatches.includes("services"));
    assert.ok(assessment.groupMatches.includes("topics"));
    assert.ok(assessment.matchedStrongTokens.length >= 2);
});
