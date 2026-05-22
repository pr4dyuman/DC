import test from "node:test";
import assert from "node:assert/strict";

import {
    buildFinalSeoQualityAssessment,
    buildSeoStrategyReadinessAssessment,
    cleanAIBloggerStylePhrasesForText,
    parseAdvancedBriefResponse,
} from "../lib/actions/ai-blogger";
import type { AIBloggerGroundedResearch } from "../lib/ai-blogger-grounded-research";
import type { BlogStudioPost, BlogStudioSeoAudit } from "../lib/types-ai-blogger";

const passingAudit: BlogStudioSeoAudit = {
    score: 88,
    checks: [
        {
            key: "cta-presence",
            label: "CTA presence",
            passed: true,
            severity: "recommended",
        },
    ],
    blockers: [],
    suggestions: [],
    requiredChecksPassed: true,
    counts: {
        passed: 8,
        total: 8,
        requiredPassed: 4,
        requiredTotal: 4,
        recommendedPassed: 4,
        recommendedTotal: 4,
    },
};

type FinalQualityDraft = Pick<
    BlogStudioPost,
    "title" | "metaTitle" | "metaDescription" | "excerpt" | "content" | "wordCount" | "outline" | "brief" | "draftBrief" | "faqItems" | "searchIntent" | "contentType" | "internalLinks"
>;

function buildNumericClaimQualityDraft(content: string): FinalQualityDraft {
    return {
        title: "Custom Marketing Campaign Architecture Blueprint",
        metaTitle: "Custom Marketing Campaign Architecture Blueprint",
        metaDescription: "Use a campaign architecture blueprint to align buyer journey proof, content assets, and conversion planning.",
        excerpt: "A practical blueprint for building custom marketing campaign architecture.",
        content,
        wordCount: 980,
        outline: [
            "Campaign Architecture Blueprint",
            "Buyer Journey Proof Map",
            "Custom Marketing Checklist",
            "Next Step",
        ],
        brief: {
            sourceMode: "website",
            sourceValue: "https://www.digitalcorvids.com/",
            audience: "Marketing directors",
            tone: "Strategic",
            cta: "Book a campaign architecture audit",
            primaryKeyword: "custom marketing campaign architecture",
            language: "en",
            location: "us",
        },
        draftBrief: {
            businessFitSummary: "Fits marketing strategy and SEO services.",
            businessFitScore: 92,
            targetAudience: "Marketing directors",
            ctaGoal: "Book a campaign architecture audit",
            toneDirection: "Strategic",
            titleDirection: "Blueprint guide",
            metadataDirection: "Blueprint metadata",
            entities: ["campaign architecture", "buyer journey"],
            topicalCluster: "custom marketing campaign architecture",
            readerPromise: "Build a custom campaign architecture blueprint",
            serpGap: "Competitors miss operational proof mapping",
            uniqueAngle: "Production-first campaign architecture",
            originalValueAsset: "Campaign architecture blueprint checklist",
            proofPlan: ["Use source-backed buyer journey evidence"],
            internalLinkPlan: ["Campaign strategy service page"],
            conversionPath: "Book a campaign architecture audit",
        },
        faqItems: [],
        searchIntent: "informational",
        contentType: "how-to",
        internalLinks: [
            {
                href: "/services/seo",
                title: "SEO Services",
                source: "service",
                anchorText: "SEO services",
                relationType: "service-authority",
                score: 90,
                matchReason: "Supports the conversion path.",
                clusterAligned: true,
            },
        ],
    };
}

function buildNumericClaimGroundedResearch(keyClaims: string[]): AIBloggerGroundedResearch {
    return {
        query: "custom marketing campaign architecture",
        normalizedQuery: "custom marketing campaign architecture",
        location: "us",
        summary: "Source-backed campaign architecture research.",
        cacheStatus: "live",
        refreshedAt: "2026-05-23T00:00:00.000Z",
        sources: [
            {
                id: "source-1",
                title: "Custom marketing campaign architecture research",
                url: "https://example.com/custom-marketing-campaign-architecture",
                domain: "example.com",
                summary: "A source about custom marketing campaign architecture, buyer journey proof, and conversion planning.",
                type: "industry",
                trustLevel: "high",
                freshness: "recent",
                keyClaims,
                citationBlock: "Custom marketing campaign architecture research.",
            },
        ],
    };
}

test("seo strategy readiness rewards strong topic fit, original value, proof, and conversion path", () => {
    const assessment = buildSeoStrategyReadinessAssessment({
        sourceMode: "website",
        topic: "AI SEO automation for small business websites",
        businessFitScore: 92,
        topicIntegrityScore: 88,
        websiteTopicAccepted: true,
        rankingDifficulty: "Low competition",
        searchIntent: "commercial",
        dominantContentFormat: "comparison / explainer",
        contentGapCount: 5,
        groundedSourceCount: 4,
        highTrustSourceCount: 2,
        topicalCluster: "AI SEO automation",
        originalValueAsset: "A 10-point AI SEO workflow audit checklist",
        conversionPath: "Invite readers to review Digital Corvids SEO and AI Blogger services",
    });

    assert.equal(assessment.shouldBlock, false);
    assert.ok(assessment.score >= 80);
    assert.ok(assessment.components.originalValue >= 80);
    assert.ok(assessment.components.conversionFit >= 80);
});

test("seo strategy readiness blocks off-lane YMYL topics without expert proof", () => {
    const assessment = buildSeoStrategyReadinessAssessment({
        sourceMode: "website",
        topic: "capital one savings class action settlement payout",
        businessFitScore: 58,
        topicIntegrityScore: 42,
        websiteTopicAccepted: false,
        rankingDifficulty: "High authority competitors",
        searchIntent: "informational",
        dominantContentFormat: "news / official resources",
        contentGapCount: 1,
        groundedSourceCount: 1,
        highTrustSourceCount: 0,
        topicalCluster: "",
        originalValueAsset: "",
        conversionPath: "",
    });

    assert.equal(assessment.shouldBlock, true);
    assert.ok(assessment.score < 65);
    assert.ok(
        assessment.warnings.some((warning) => /YMYL|commercial pages|Original value|Conversion path/i.test(warning)),
    );
});

test("seo strategy readiness treats a thin source pack as a quality risk", () => {
    const assessment = buildSeoStrategyReadinessAssessment({
        sourceMode: "website",
        topic: "AI blog workflow for service businesses",
        businessFitScore: 88,
        topicIntegrityScore: 86,
        websiteTopicAccepted: true,
        rankingDifficulty: "Medium competition",
        searchIntent: "informational",
        dominantContentFormat: "guide / checklist",
        contentGapCount: 4,
        groundedSourceCount: 1,
        highTrustSourceCount: 0,
        topicalCluster: "AI Blogger service",
        originalValueAsset: "A practical blog workflow quality scorecard",
        conversionPath: "Invite readers to audit their AI Blogger workflow",
    });

    assert.ok(assessment.components.sourceDepth < 70);
    assert.ok(
        assessment.warnings.some((warning) => /Source pack is too thin/i.test(warning)),
    );
});

test("advanced brief parser tolerates array and object fields from model JSON", () => {
    const brief = parseAdvancedBriefResponse(
        JSON.stringify({
            businessFitSummary: ["Limited drop content strategy", "for a beverage campaign"],
            businessFitScore: 82,
            targetAudience: { label: "Retail marketers" },
            ctaGoal: { text: "Invite readers to audit launch content operations" },
            topicalCluster: { name: "Limited launch SEO operations" },
            readerPromise: ["A practical launch planning framework"],
            serpGap: { description: "Competitors explain the product but not the content system" },
            uniqueAngle: ["Turn the product launch into a search and social operations case study"],
            originalValueAsset: { title: "Limited-drop content readiness checklist" },
            proofPlan: [{ text: "Official launch timing" }, "Retail availability patterns"],
            internalLinkPlan: { service: "SEO services", blog: "AI Blogger service" },
            conversionPath: { summary: "Book a content operations review" },
            avoidAngles: [{ label: "Alcohol consumption advice" }],
            publishReadinessWarnings: [{ text: "Keep the angle marketing-led" }],
        }),
        {
            audience: "Marketers",
            ctaGoal: "Review the content plan",
            toneDirection: "Practical",
            searchIntent: "informational",
        },
    );

    assert.match(brief.businessFitSummary, /Limited drop content strategy/);
    assert.equal(brief.targetAudience, "Retail marketers");
    assert.equal(brief.topicalCluster, "Limited launch SEO operations");
    assert.equal(brief.originalValueAsset, "Limited-drop content readiness checklist");
    assert.deepEqual(brief.proofPlan, ["Official launch timing", "Retail availability patterns"]);
    assert.ok(brief.internalLinkPlan.some((item) => item.includes("SEO services")));
    assert.equal(brief.avoidAngles[0], "Alcohol consumption advice");
});

test("advanced brief parser preserves intentional line breaks in text fields", () => {
    const brief = parseAdvancedBriefResponse(
        JSON.stringify({
            businessFitSummary: "Line one\nLine two",
            businessFitScore: 80,
        }),
        {
            audience: "Marketers",
            ctaGoal: "Review the content plan",
            toneDirection: "Practical",
            searchIntent: "informational",
        },
    );

    assert.equal(brief.businessFitSummary, "Line one\nLine two");
});

test("final seo quality rewards executed original assets, intent match, cluster links, and CTA", () => {
    const draft: Pick<
        BlogStudioPost,
        "title" | "metaTitle" | "metaDescription" | "excerpt" | "content" | "wordCount" | "outline" | "brief" | "draftBrief" | "faqItems" | "searchIntent" | "contentType" | "internalLinks"
    > = {
        title: "AI Blog Workflow Audit Checklist for Service Businesses",
        metaTitle: "AI Blog Workflow Audit Checklist",
        metaDescription: "Use this AI blog workflow audit checklist to improve search intent, source proof, internal links, and conversion paths.",
        excerpt: "A practical audit checklist for improving AI-generated SEO blogs.",
        content: `AI blog workflow audit checklist helps service businesses turn automated drafts into useful search pages quickly.

## Start With The Search Task

Use the query to answer the reader's task in the opening paragraph, then map each section to one decision or action.

## AI Blog Workflow Audit Checklist

| Check | What good looks like |
| --- | --- |
| Intent | The first section answers the query directly |
| Proof | Claims cite source-backed evidence [1] |
| Cluster | The article links to the right service page |
| Conversion | The closing paragraph gives one relevant next step |

## Cluster And Internal Link Plan

- Keep the article inside the AI SEO automation cluster.
- Link to the SEO service page when the reader needs implementation help.
- Link to one related AI content article only when it supports the cluster.

## Next Step

Book a content strategy audit to review your AI blog workflow and improve the pages that are closest to ranking.

## Sources

1. [Search quality documentation](https://example.com/search-quality)`,
        wordCount: 980,
        outline: [
            "Start With The Search Task",
            "AI Blog Workflow Audit Checklist",
            "Cluster And Internal Link Plan",
            "Next Step",
        ],
        brief: {
            sourceMode: "website",
            sourceValue: "https://www.digitalcorvids.com/",
            audience: "Service business owners",
            tone: "Practical",
            cta: "Book a content strategy audit",
            primaryKeyword: "AI blog workflow audit checklist",
            language: "en",
            location: "us",
        },
        draftBrief: {
            businessFitSummary: "Fits AI SEO services.",
            businessFitScore: 92,
            targetAudience: "Service business owners",
            ctaGoal: "Book a content strategy audit",
            toneDirection: "Practical",
            titleDirection: "Checklist guide",
            metadataDirection: "Checklist metadata",
            entities: ["AI blog workflow", "SEO audit"],
            topicalCluster: "AI SEO automation",
            readerPromise: "Audit an AI blog workflow",
            serpGap: "Competitors miss operational checklists",
            uniqueAngle: "Service-led workflow scorecard",
            originalValueAsset: "AI blog workflow audit checklist",
            proofPlan: ["Use source-backed evidence"],
            internalLinkPlan: ["SEO service page"],
            conversionPath: "Book a content strategy audit",
        },
        faqItems: [
            {
                question: "How do you audit an AI blog workflow?",
                answer: "Check intent, proof, internal links, original value, and CTA alignment.",
            },
        ],
        searchIntent: "informational",
        contentType: "how-to",
        internalLinks: [
            {
                href: "/services/search-engine-optimization",
                title: "Search Engine Optimization",
                source: "service",
                anchorText: "SEO service page",
                relationType: "service-authority",
                score: 92,
                matchReason: "Supports the conversion path.",
                clusterAligned: true,
            },
        ],
    };

    const assessment = buildFinalSeoQualityAssessment({
        draft,
        audit: passingAudit,
        primaryKeyword: "AI blog workflow audit checklist",
        secondaryKeywords: ["AI SEO automation", "content strategy audit"],
    });

    assert.equal(assessment.blockers.length, 0);
    assert.ok(assessment.score >= 72);
    assert.ok(assessment.components.originalValueExecution >= 80);
    assert.ok(assessment.components.clusterFit >= 80);
});

test("final seo quality blocks generic drafts that miss the planned asset and intent", () => {
    const draft: Pick<
        BlogStudioPost,
        "title" | "metaTitle" | "metaDescription" | "excerpt" | "content" | "wordCount" | "outline" | "brief" | "draftBrief" | "faqItems" | "searchIntent" | "contentType" | "internalLinks"
    > = {
        title: "AI Blog Workflow",
        metaTitle: "AI Blog Workflow",
        metaDescription: "A general article about AI blog workflow.",
        excerpt: "A general article.",
        content: `AI blogs are important.

They can help many companies create more content. This article explains the topic in broad terms without a specific process.`,
        wordCount: 90,
        outline: [],
        brief: {
            sourceMode: "website",
            sourceValue: "https://www.digitalcorvids.com/",
            audience: "Service business owners",
            tone: "Practical",
            cta: "Book a content strategy audit",
            primaryKeyword: "AI blog workflow audit checklist",
            language: "en",
            location: "us",
        },
        draftBrief: {
            businessFitSummary: "Fits AI SEO services.",
            businessFitScore: 88,
            targetAudience: "Service business owners",
            ctaGoal: "Book a content strategy audit",
            toneDirection: "Practical",
            titleDirection: "Checklist guide",
            metadataDirection: "Checklist metadata",
            entities: [],
            topicalCluster: "AI SEO automation",
            originalValueAsset: "AI blog workflow audit checklist",
            conversionPath: "Book a content strategy audit",
        },
        faqItems: [],
        searchIntent: "informational",
        contentType: "how-to",
        internalLinks: [],
    };

    const assessment = buildFinalSeoQualityAssessment({
        draft,
        audit: {
            ...passingAudit,
            score: 54,
            checks: [],
        },
        primaryKeyword: "AI blog workflow audit checklist",
    });

    assert.ok(assessment.score < 65);
    assert.ok(assessment.blockers.some((blocker) => /Final SEO quality|original value|search intent/i.test(blocker)));
});

test("final seo quality does not flag valid markdown table body rows as malformed", () => {
    const draft = buildNumericClaimQualityDraft(`Conversion funnel mapping and optimization helps teams find weak handoffs between campaign traffic, landing pages, forms, and sales follow-up.

## Campaign Architecture Blueprint

Use this conversion funnel mapping template to inspect the path from first touch to booked call.

| Funnel Stage | User Goal | Key Content Assets | Optimization Actions |
| :--- | :--- | :--- | :--- |
| **Awareness** | Find useful guidance | SEO guides and social posts | Clarify the promise and page speed |
| **Interest** | Compare options | Case studies and demos | Match proof to the reader's use case |
| **Decision** | Validate trust | Pricing pages and consultations | Reduce form friction and add proof |

## Buyer Journey Proof Map

Review the table, inspect analytics events, and document where users stop moving forward.

## Custom Marketing Checklist

- Check whether every funnel stage has a page, proof point, and next step.
- Connect analytics events to your highest-value conversion path.
- Review internal links from SEO, PPC, and video service pages.

## Next Step

Book a campaign architecture audit to review your funnel, proof plan, and SEO services alignment.`);

    const assessment = buildFinalSeoQualityAssessment({
        draft,
        audit: passingAudit,
        primaryKeyword: "conversion funnel mapping and optimization",
        secondaryKeywords: ["campaign architecture audit", "buyer journey proof"],
        groundedResearch: buildNumericClaimGroundedResearch([
            "Conversion funnel mapping helps teams inspect traffic, landing pages, forms, and sales follow-up.",
        ]),
    });

    assert.equal(
        assessment.warnings.some((warning) => /Markdown table appears malformed/i.test(warning)),
        false,
    );
    assert.equal(
        assessment.blockers.some((blocker) => /Markdown table/i.test(blocker)),
        false,
    );
});

test("style phrase cleanup removes common AI phrasing before final quality scoring", () => {
    const cleanup = cleanAIBloggerStylePhrasesForText(
        `In today's digital landscape, teams need reliable funnel operations. This is where a checklist can help you optimize your handoffs and streamline your review process.`,
        500,
    );

    assert.ok(cleanup.removedPhrases.includes("in today's digital landscape"));
    assert.ok(cleanup.removedPhrases.includes("this is where"));
    assert.ok(cleanup.removedPhrases.includes("optimize your"));
    assert.ok(cleanup.removedPhrases.includes("streamline your"));
    assert.equal(/in today's digital landscape|this is where|optimize your|streamline your/i.test(cleanup.text), false);
    assert.match(cleanup.text, /Today|today|Here|here|improve your|simplify your/);
});

test("final seo quality blocks numeric campaign rules absent from grounded sources", () => {
    const draft = buildNumericClaimQualityDraft(`Custom marketing campaign architecture helps marketing directors align buyer journey proof with conversion planning.

## Campaign Architecture Blueprint

Use the 7-11-4 rule to plan 7 hours of education across 11 touchpoints and 4 channels before a high-value buying decision.

## Buyer Journey Proof Map

The 3-3-3 framework gives teams 3 seconds to earn attention, 30 seconds to clarify the value proposition, and 3 minutes to establish credibility.

## Custom Marketing Checklist

| Check | What good looks like |
| --- | --- |
| Intent | The first section answers the campaign architecture question |
| Proof | Claims cite source-backed evidence [1] |
| Cluster | The article links to a relevant service page |
| Conversion | The closing paragraph gives one relevant next step |

## Next Step

Book a campaign architecture audit to review your buyer journey, proof plan, and SEO services alignment.

## Sources

1. [Campaign architecture research](https://example.com/custom-marketing-campaign-architecture)`);

    const assessment = buildFinalSeoQualityAssessment({
        draft,
        audit: passingAudit,
        primaryKeyword: "custom marketing campaign architecture",
        secondaryKeywords: ["buyer journey proof", "campaign architecture audit"],
        groundedResearch: buildNumericClaimGroundedResearch([
            "Custom marketing campaign architecture works best when teams align proof, buyer journey content, and conversion planning.",
        ]),
    });

    assert.ok(
        assessment.blockers.some((blocker) =>
            /Precise numeric claims are not present in grounded sources/i.test(blocker),
        ),
    );
    assert.ok(
        assessment.warnings.some((warning) =>
            /Precise numeric claims need source verification/i.test(warning),
        ),
    );
});

test("final seo quality accepts numeric campaign claims present in grounded sources", () => {
    const draft = buildNumericClaimQualityDraft(`Custom marketing campaign architecture helps marketing directors align buyer journey proof with conversion planning.

## Campaign Architecture Blueprint

Use the 7-11-4 rule to plan 7 hours of education across 11 touchpoints and 4 channels before a high-value buying decision.

## Buyer Journey Proof Map

The 3-3-3 framework gives teams 3 seconds to earn attention, 30 seconds to clarify the value proposition, and 3 minutes to establish credibility.

## Custom Marketing Checklist

| Check | What good looks like |
| --- | --- |
| Intent | The first section answers the campaign architecture question |
| Proof | Claims cite source-backed evidence [1] |
| Cluster | The article links to a relevant service page |
| Conversion | The closing paragraph gives one relevant next step |

## Next Step

Book a campaign architecture audit to review your buyer journey, proof plan, and SEO services alignment.

## Sources

1. [Campaign architecture research](https://example.com/custom-marketing-campaign-architecture)`);

    const assessment = buildFinalSeoQualityAssessment({
        draft,
        audit: passingAudit,
        primaryKeyword: "custom marketing campaign architecture",
        secondaryKeywords: ["buyer journey proof", "campaign architecture audit"],
        groundedResearch: buildNumericClaimGroundedResearch([
            "The 7-11-4 rule describes 7 hours of education across 11 touchpoints and 4 channels.",
            "The 3-3-3 framework covers 3 seconds, 30 seconds, and 3 minutes of engagement depth.",
        ]),
    });

    assert.equal(
        assessment.blockers.some((blocker) =>
            /Precise numeric claims are not present in grounded sources/i.test(blocker),
        ),
        false,
    );
});
