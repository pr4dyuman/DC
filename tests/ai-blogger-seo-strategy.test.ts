import test from "node:test";
import assert from "node:assert/strict";

import { buildSeoStrategyReadinessAssessment } from "../lib/actions/ai-blogger";

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
