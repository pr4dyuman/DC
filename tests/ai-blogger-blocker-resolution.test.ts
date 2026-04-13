import test from "node:test";
import assert from "node:assert/strict";

import { buildBlogStudioBlockerResolutionPreview } from "../lib/ai-blogger-blocker-resolution";
import { getBlogStudioSeoAudit } from "../lib/ai-blogger-seo-audit";
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

test("surfaces keyword-in-title as a narrow ai-fixable advisory check", () => {
    const preview = makePreview({
        checks: [
            {
                key: "keyword-in-title",
                label: "Primary keyword in title",
                passed: false,
                severity: "recommended",
                detail: "Helpful when it still sounds natural.",
            },
        ],
        postOverrides: {
            title: "How Agencies Plan Stronger Campaigns",
            target: {
                ...basePost.target,
                type: "manual-export",
            },
            brief: {
                ...basePost.brief,
                primaryKeyword: "influencer marketing strategy",
            },
        },
    });

    assert.ok(preview.aiFixable.some((blocker) => blocker.key === "keyword-in-title"));
    assert.ok(preview.blockers.some((blocker) => blocker.key === "keyword-in-title"));
    assert.equal(preview.humanRequiredCount, 0);
    assert.equal(preview.systemRequiredCount, 0);
});

test("does not promote unrelated recommended checks into blocker resolution", () => {
    const preview = makePreview({
        checks: [
            {
                key: "keyword-in-body",
                label: "Primary keyword in body",
                passed: false,
                severity: "recommended",
                detail: "Helpful when it still sounds natural.",
            },
        ],
        postOverrides: {
            target: {
                ...basePost.target,
                type: "manual-export",
            },
        },
    });

    assert.equal(preview.aiFixable.length, 0);
    assert.equal(preview.blockers.length, 0);
    assert.equal(preview.hasAiFixable, false);
    assert.equal(preview.hasBlockingIssues, false);
});

function buildSeoAuditPost(overrides?: Partial<BlogStudioPost>): BlogStudioPost {
    return {
        ...basePost,
        title: "Using AI to Optimize Influencer Marketing ROI: A 2026 Strategy",
        excerpt: "Learn how agencies can use AI-driven influencer discovery and analytics to improve campaign ROI in 2026.",
        metaTitle: "Using AI to Optimize Influencer Marketing ROI (2026 Guide)",
        metaDescription: "Learn how using AI to optimize influencer marketing ROI improves discovery, analytics, and campaign efficiency for agencies in 2026.",
        canonicalUrl: "https://example.com/blog/using-ai-to-optimize-influencer-marketing-roi",
        schemaMarkup: "{\"@context\":\"https://schema.org\"}",
        featuredImageAlt: "AI dashboard for influencer marketing ROI analysis",
        content: [
            "## From Guesswork to Data-Driven Precision",
            "Using AI to optimize influencer marketing ROI helps agencies replace manual guesswork with faster analysis and better decision-making. For example, teams can identify content gaps in 30 days and benchmark performance in 2026. [1]",
            "",
            "## Precision Matching With Smarter Discovery",
            "AI-driven influencer discovery tools help teams shortlist partners faster and reduce wasted outreach. Predictive analytics for influencer campaigns can highlight fit before budget is committed.",
            "",
            "## Protecting Campaign Quality",
            "Influencer audience authenticity checks help agencies spot suspicious signals before launch. Data-driven influencer campaign strategy also improves reporting quality and post-campaign learning.",
            "",
            "## Scaling Content Workflows",
            "Teams can use AI for marketing task automation to manage approvals, reporting, and optimization without losing editorial control.",
            "",
            "## Sources",
            "1. Coursera - AI for influencer marketing",
            "",
            "Ready to improve campaign performance? Book a call with our team to plan your next move.",
        ].join("\n"),
        outline: [
            "From Guesswork to Data-Driven Precision",
            "Precision Matching With Smarter Discovery",
            "Protecting Campaign Quality",
            "Scaling Content Workflows",
        ],
        faqItems: [
            {
                question: "What is AI for influencer marketing?",
                answer: "AI helps agencies automate discovery, validation, and campaign analysis.",
            },
        ],
        searchIntent: "informational",
        contentType: "how-to",
        internalLinks: [
            {
                href: "https://example.com/services/influencer-marketing",
                title: "Influencer marketing services",
                source: "service",
                anchorText: "influencer marketing services",
                relationType: "service-authority",
                score: 0.94,
                matchReason: "Targets a core service page aligned with the article topic.",
                clusterAligned: true,
                suggestedSectionHeading: "Scaling Content Workflows",
                placement: "body",
            },
        ],
        externalSources: [
            {
                id: "source-1",
                title: "AI for influencer marketing",
                url: "https://www.coursera.org/articles/ai-for-influencer-marketing",
                domain: "coursera.org",
                summary: "Overview of AI use cases in influencer marketing.",
                type: "education",
                freshness: "recent",
                trustLevel: "high",
                publishedAt: "2025-11-01T00:00:00.000Z",
                keyClaims: ["AI improves influencer discovery and campaign monitoring."],
                citationBlock: "Coursera, AI for influencer marketing",
            },
        ],
        generationDiagnostics: {
            fetchTrendsSource: "live-google-trends",
            fetchTrendsLabel: "Google Trends",
            fetchTrendsNotes: "Live trends used for topic discovery.",
            selectedTopic: "Leveraging AI News and Trends to Optimize Influencer Marketing ROI",
            businessFitWarnings: [],
            keywordPlan: {
                primaryKeyword: "using AI to optimize influencer marketing ROI",
                secondaryKeywords: [
                    "AI-driven influencer discovery tools",
                    "predictive analytics for influencer campaigns",
                    "influencer audience authenticity checks",
                    "data-driven influencer campaign strategy",
                    "AI for marketing task automation",
                ],
                metaKeywords: ["AI influencer marketing", "marketing ROI"],
                sectionAngles: [
                    "From Guesswork to Data-Driven Precision",
                    "Precision Matching With Smarter Discovery",
                    "Protecting Campaign Quality",
                    "Scaling Content Workflows",
                ],
            },
            steps: [],
        },
        ...overrides,
    };
}

function getAuditCheck(post: BlogStudioPost, key: string) {
    const audit = getBlogStudioSeoAudit(post, baseSettings, basePublishRules as Parameters<typeof getBlogStudioSeoAudit>[2]);
    const check = audit.checks.find((item) => item.key === key);
    assert.ok(check, `Expected check ${key} to exist.`);
    return check;
}

test("seo audit passes outline fidelity, keyword coverage, and citation traceability when draft structure is preserved", () => {
    const post = buildSeoAuditPost();

    assert.equal(getAuditCheck(post, "outline-fidelity").passed, true);
    assert.equal(getAuditCheck(post, "secondary-keyword-coverage").passed, true);
    assert.equal(getAuditCheck(post, "citation-traceability").passed, true);
    assert.equal(getAuditCheck(post, "claims-grounding").passed, true);
});

test("seo audit flags missing outline coverage, weak keyword usage, and untraceable citations", () => {
    const post = buildSeoAuditPost({
        content: [
            "## A Better Way to Run Campaigns",
            "Agencies can improve results with smarter planning, faster execution, and better reporting. Research shows the right workflow improves outcomes in 2026. [1]",
            "",
            "## Operational Improvements",
            "Teams can automate approvals and build better reports without the manual overhead that slows campaign delivery.",
            "",
            "Ready to improve campaign performance? Book a call with our team to plan your next move.",
        ].join("\n"),
    });

    assert.equal(getAuditCheck(post, "outline-fidelity").passed, false);
    assert.equal(getAuditCheck(post, "secondary-keyword-coverage").passed, false);
    assert.equal(getAuditCheck(post, "citation-traceability").passed, false);
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

test("does not keep medium cannibalization overlap as a blocking issue", () => {
    const preview = makePreview({
        checks: [
            { key: "cannibalization-risk", label: "Cannibalization Risk", passed: false, severity: "recommended", detail: "Risk is medium." },
        ],
        cannibalization: {
            risk: "medium",
            shouldBlock: false,
            score: 58,
            summary: "Partial overlap detected with one connected post.",
            matches: [
                {
                    source: "ai-blogger",
                    slug: "existing-page",
                    title: "Existing Page",
                    href: "https://example.com/blog/existing-page",
                    statusLabel: "Published",
                    reason: "Moderate title/theme overlap.",
                    similarityScore: 58,
                    primaryKeyword: "related keyword",
                    searchIntent: "informational",
                    publishedAt: now,
                },
            ],
        },
    });

    assert.equal(preview.humanRequired.some((blocker) => blocker.key === "cannibalization-risk"), false);
    assert.equal(preview.aiFixable.some((blocker) => blocker.key === "cannibalization-risk"), false);
    assert.equal(preview.blockers.some((blocker) => blocker.key === "cannibalization-risk"), false);
});
