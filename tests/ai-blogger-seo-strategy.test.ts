import test from "node:test";
import assert from "node:assert/strict";

import { buildSeoStrategyReadinessAssessment, parseAdvancedBriefResponse } from "../lib/actions/ai-blogger";

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
