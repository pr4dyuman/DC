import test from "node:test";
import assert from "node:assert/strict";

import { buildFinalSeoQualityAssessment, buildSeoStrategyReadinessAssessment, parseAdvancedBriefResponse } from "../lib/actions/ai-blogger";
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
