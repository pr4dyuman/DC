import test from "node:test";
import assert from "node:assert/strict";

import { getAIBloggerGroundedResearch } from "../lib/ai-blogger-grounded-research";

function buildHtml(input: {
    title: string;
    description: string;
    publishedAt?: string;
}) {
    const publishedMeta = input.publishedAt
        ? `<meta property="article:published_time" content="${input.publishedAt}" />`
        : "";
    const paragraph = [
        "The NCAA gymnastics championship source page includes schedule details, venue context,",
        "bracket information, ticket guidance, and event logistics for content teams planning",
        "coverage. This paragraph is intentionally long enough for the grounded research parser",
        "to treat it as usable article body copy with real source context.",
    ].join(" ");

    return `<!doctype html>
<html>
<head>
<title>${input.title}</title>
<meta name="description" content="${input.description}" />
${publishedMeta}
</head>
<body>
<h1>${input.title}</h1>
<h2>Schedule and event details</h2>
<p>${paragraph}</p>
<p>${paragraph}</p>
<p>${paragraph}</p>
</body>
</html>`;
}

test("grounded research keeps fetched authority sources when high-only filters would remove every source", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response(
            buildHtml({
                title: "2026 NCAA Women's Gymnastics Championships bracket, schedule, results",
                description: "Official championship bracket and schedule details from NCAA.com.",
                publishedAt: "2026-03-23T00:00:00Z",
            }),
            {
                status: 200,
                headers: { "content-type": "text/html" },
            },
        );
    }) as typeof fetch;

    try {
        const research = await getAIBloggerGroundedResearch("ncaa gymnastics semifinals 2026", {
            location: "us",
            sourceUrls: [
                "https://www.ncaa.com/news/gymnastics-women/article/2026-03-23/2026-ncaa-womens-gymnastics-championships-bracket-schedule-results",
            ],
            groundedResearchConfig: {
                maxSources: 5,
                allowedSourceTypes: ["news"],
                blockedDomains: [],
                trustPreference: "high-only",
                freshnessPreference: "recent-first",
            },
        });

        assert.equal(research.result?.sources.length, 1);
        assert.equal(research.result?.sources[0]?.type, "news");
        assert.equal(research.result?.sources[0]?.trustLevel, "medium");
        assert.equal(research.fetchDiagnostics[0]?.filterStatus, "accepted");
        assert.match(research.fetchDiagnostics[0]?.filterReasons?.[0] || "", /authority recovery/i);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("grounded research diagnostics explain fetched sources rejected by filters", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        return new Response(
            buildHtml({
                title: "Sports news article without date",
                description: "A low trust undated article that should not satisfy high-only recent filters.",
            }),
            {
                status: 200,
                headers: { "content-type": "text/html" },
            },
        );
    }) as typeof fetch;

    try {
        const research = await getAIBloggerGroundedResearch("sports trend", {
            location: "us",
            sourceUrls: ["https://example.com/news/sports-trend"],
            groundedResearchConfig: {
                maxSources: 5,
                allowedSourceTypes: ["news"],
                blockedDomains: [],
                trustPreference: "high-only",
                freshnessPreference: "recent-first",
            },
        });

        assert.equal(research.result, null);
        assert.equal(research.fetchDiagnostics[0]?.directStatus, "ok");
        assert.equal(research.fetchDiagnostics[0]?.filterStatus, "rejected");
        assert.deepEqual(research.fetchDiagnostics[0]?.filterReasons, [
            "trust level low is below high-only setting",
            "freshness unknown is outside recent-first setting",
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
