import test from "node:test";
import assert from "node:assert/strict";

import { buildBlogStudioBlockerResolutionPreview } from "../lib/ai-blogger-blocker-resolution";
import type {
    BlogStudioCannibalizationReport,
    BlogStudioPost,
    BlogStudioPublishBlocker,
    BlogStudioPublishValidation,
    BlogStudioSeoAudit,
    BlogStudioSeoAuditCheck,
    BlogStudioSettings,
} from "../lib/types-ai-blogger";
import type { AIBloggerConfig } from "../lib/types-agency";

const now = "2026-04-02T00:00:00.000Z";

const basePost: BlogStudioPost = {
    id: "post-1",
    agencyId: "agency-1",
    slug: "test-post",
    title: "Test Post",
    excerpt: "Test excerpt",
    metaTitle: "Test Post",
    metaDescription: "Test description",
    canonicalUrl: "https://example.com/blog/test-post",
    schemaMarkup: "",
    featuredImageAlt: "Test image",
    featuredImageUrl: "https://example.com/image.jpg",
    featuredImageSource: "upload",
    content: "This is a test post with a clear CTA and some internal structure.",
    status: "SEO Review",
    target: {
        type: "webhook",
        label: "Main Blog",
        webhookConfig: {
            url: "https://example.com/api/blogs/webhook",
            active: true,
            retryAttempts: 3,
            timeout: 15000,
            secret: "secret",
            hasSecret: true,
        },
    },
    tags: ["seo"],
    outline: ["Intro", "Why it matters", "Next steps"],
    brief: {
        sourceMode: "website",
        sourceValue: "https://example.com",
        audience: "Founders",
        tone: "Direct",
        cta: "Book a call",
        primaryKeyword: "test keyword",
        language: "en",
        location: "us",
    },
    faqItems: [],
    searchIntent: "informational",
    contentType: "how-to",
    internalLinks: [],
    seoScore: 72,
    wordCount: 640,
    createdBy: "user-1",
    createdAt: now,
    updatedAt: now,
};

const baseSettings: BlogStudioSettings = {
    agencyId: "agency-1",
    brandVoice: {
        tone: "Direct",
        audience: "Founders",
        ctaStyle: "Book a call",
        bannedTerms: ["synergy"],
    },
    seo: {
        minWords: 600,
        maxWords: 1800,
        defaultLanguage: "en",
        defaultLocation: "us",
        requireInternalLinks: true,
        requireMetaDescription: true,
        requireSeoReview: true,
    },
    publishing: {
        defaultTarget: basePost.target,
        requireApproval: true,
        autoSchedule: false,
        publishMode: "approval-required",
    },
    createdBy: "user-1",
    createdAt: now,
    updatedAt: now,
};

const basePublishRules: AIBloggerConfig["publishRules"] = {
    requireInternalLinks: true,
    requireMetaDescription: true,
    requireFaqForInformational: true,
    requireImageAltText: true,
    requireManualApproval: true,
    minimumSeoScore: 70,
    requireCanonicalUrl: true,
    requireSchemaMarkup: true,
    aiReviewPolicy: {
        enableFinalChecker: true,
        autoFixStructuralIssues: true,
        autoFixToneMismatch: true,
        flagWeakBusinessFit: true,
        flagWeakCtaAlignment: true,
        softenQuestionableClaims: true,
        flagSoftCannibalization: true,
        requireHumanReviewForHighRiskClaims: true,
        requireHumanReviewForHighRiskCannibalization: true,
        requireGroundedSourcesForClaims: true,
    },
};

function makeAudit(
    checks: BlogStudioSeoAuditCheck[],
    cannibalization?: BlogStudioCannibalizationReport,
): BlogStudioSeoAudit {
    const requiredChecks = checks.filter((check) => check.severity === "required");
    const requiredFailed = requiredChecks.filter((check) => !check.passed);

    return {
        score: 58,
        checks,
        blockers: requiredFailed.map((check) => check.label),
        suggestions: [],
        requiredChecksPassed: requiredFailed.length === 0,
        cannibalization,
        counts: {
            passed: checks.filter((check) => check.passed).length,
            total: checks.length,
            requiredPassed: requiredChecks.filter((check) => check.passed).length,
            requiredTotal: requiredChecks.length,
            recommendedPassed: checks.filter((check) => check.severity === "recommended" && check.passed).length,
            recommendedTotal: checks.filter((check) => check.severity === "recommended").length,
        },
    };
}

function makePublishValidation(blockers: BlogStudioPublishBlocker[]): BlogStudioPublishValidation {
    return {
        canPublish: blockers.length === 0,
        blockers,
        warnings: [],
        blockersCount: blockers.length,
        warningsCount: 0,
        auditScore: 58,
        summary: blockers.length ? "Blockers found" : "Ready to publish",
        validatedAt: now,
    };
}

function makePreview(input: {
    checks: BlogStudioSeoAuditCheck[];
    publishBlockers?: BlogStudioPublishBlocker[];
    postOverrides?: Partial<BlogStudioPost>;
    settingsOverrides?: Partial<BlogStudioSettings>;
    publishRulesOverrides?: Partial<AIBloggerConfig["publishRules"]>;
    cannibalization?: BlogStudioCannibalizationReport;
    siteUrl?: string;
}) {
    const post: BlogStudioPost = {
        ...basePost,
        ...input.postOverrides,
        target: {
            ...basePost.target,
            ...input.postOverrides?.target,
        },
        brief: {
            ...basePost.brief,
            ...input.postOverrides?.brief,
        },
    };
    const settings: BlogStudioSettings = {
        ...baseSettings,
        ...input.settingsOverrides,
        publishing: {
            ...baseSettings.publishing,
            ...input.settingsOverrides?.publishing,
        },
        seo: {
            ...baseSettings.seo,
            ...input.settingsOverrides?.seo,
        },
        brandVoice: {
            ...baseSettings.brandVoice,
            ...input.settingsOverrides?.brandVoice,
        },
    };
    const publishRules: AIBloggerConfig["publishRules"] = {
        ...basePublishRules,
        ...input.publishRulesOverrides,
        aiReviewPolicy: {
            ...basePublishRules.aiReviewPolicy,
            ...input.publishRulesOverrides?.aiReviewPolicy,
        },
    };
    const audit = makeAudit(input.checks, input.cannibalization);
    const publishValidation = makePublishValidation(input.publishBlockers || []);

    return buildBlogStudioBlockerResolutionPreview({
        post,
        settings,
        publishRules,
        audit,
        publishValidation,
        siteUrl: input.siteUrl ?? "https://example.com",
    });
}

test("classifies metadata, content, internal-link, and image blockers as ai-fixable", () => {
    const preview = makePreview({
        checks: [
            { key: "meta-description", label: "Meta Description", passed: false, severity: "required", detail: "Missing meta description." },
            { key: "content", label: "Content", passed: false, severity: "required", detail: "Main content is missing." },
            { key: "internal-links", label: "Internal Links", passed: false, severity: "required", detail: "Add internal links." },
            { key: "featured-image-alt", label: "Featured Image Alt", passed: false, severity: "required", detail: "Add alt text." },
        ],
        postOverrides: {
            target: {
                ...basePost.target,
                type: "manual-export",
            },
        },
    });

    assert.deepEqual(
        preview.aiFixable.map((blocker) => blocker.key).sort(),
        ["content", "featured-image-alt", "internal-links", "meta-description"],
    );
    assert.equal(preview.humanRequiredCount, 0);
    assert.equal(preview.systemRequiredCount, 0);
});

test("classifies manual approval, webhook config, and workflow blockers as human or system required", () => {
    const preview = makePreview({
        checks: [],
        publishBlockers: [
            {
                category: "approval",
                severity: "blocker",
                message: "Manual approval is still required before direct publish",
                fixHint: "Approve the draft before publishing.",
            },
            {
                category: "metadata",
                severity: "blocker",
                message: "Webhook target must use HTTPS and include a secret",
                fixHint: "Update the webhook target settings.",
            },
        ],
        postOverrides: {
            status: "Approved",
            canonicalUrl: "",
        },
        settingsOverrides: {
            publishing: {
                ...baseSettings.publishing,
                publishMode: "draft-only",
            },
        },
    });

    assert.ok(preview.humanRequired.some((blocker) => blocker.key === "manual-approval"));
    assert.ok(preview.humanRequired.some((blocker) => blocker.key === "workflow-stage"));
    assert.ok(preview.systemRequired.some((blocker) => blocker.key === "webhook-target"));
    assert.ok(preview.systemRequired.some((blocker) => blocker.key === "workflow-draft-only"));
});

test("keeps high-risk claims and cannibalization human-gated when rules require review", () => {
    const preview = makePreview({
        checks: [
            { key: "claims-grounding", label: "Claims Grounding", passed: false, severity: "required", detail: "Claims need support." },
            { key: "cannibalization-risk", label: "Cannibalization Risk", passed: false, severity: "required", detail: "Risk is high." },
        ],
        postOverrides: {
            content: "We guarantee 42% more revenue and always win this category.",
        },
        cannibalization: {
            risk: "high",
            shouldBlock: true,
            score: 92,
            summary: "This draft overlaps heavily with an existing page.",
            matches: [
                {
                    source: "ai-blogger",
                    slug: "existing-page",
                    title: "Existing Page",
                    href: "https://example.com/blog/existing-page",
                    statusLabel: "Published",
                    reason: "Same keyword and angle",
                    similarityScore: 92,
                    primaryKeyword: "test keyword",
                    searchIntent: "informational",
                    publishedAt: now,
                },
            ],
        },
    });

    assert.ok(preview.humanRequired.some((blocker) => blocker.key === "claims-grounding"));
    assert.ok(preview.humanRequired.some((blocker) => blocker.key === "cannibalization-risk"));
    assert.equal(preview.aiFixable.some((blocker) => blocker.key === "claims-grounding"), false);
});
