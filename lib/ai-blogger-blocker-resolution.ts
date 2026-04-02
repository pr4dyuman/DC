import {
    isBlogStudioDraftOnlyMode,
    shouldBlogStudioAutoSchedule,
} from "./ai-blogger-workflow";
import type { AIBloggerConfig } from "./types-agency";
import type {
    BlogStudioBlockerResolutionPreview,
    BlogStudioPost,
    BlogStudioPublishBlocker,
    BlogStudioPublishValidation,
    BlogStudioResolvedBlocker,
    BlogStudioSeoAudit,
    BlogStudioSeoAuditCheck,
    BlogStudioSettings,
} from "./types-ai-blogger";

type BuildBlogStudioBlockerResolutionPreviewInput = {
    post: BlogStudioPost;
    settings: BlogStudioSettings;
    publishRules?: AIBloggerConfig["publishRules"];
    audit: BlogStudioSeoAudit;
    publishValidation: BlogStudioPublishValidation;
    siteUrl?: string;
};

function getResolvedAiReviewPolicy(publishRules?: AIBloggerConfig["publishRules"]) {
    return publishRules?.aiReviewPolicy ?? {
        enableFinalChecker: true,
        apiKey: "",
        model: "",
        customModelId: "",
        autoFixStructuralIssues: true,
        autoFixToneMismatch: true,
        flagWeakBusinessFit: true,
        flagWeakCtaAlignment: true,
        softenQuestionableClaims: true,
        flagSoftCannibalization: true,
        requireHumanReviewForHighRiskClaims: true,
        requireHumanReviewForHighRiskCannibalization: true,
        requireGroundedSourcesForClaims: true,
    };
}

function countHighRiskClaimSignals(content?: string) {
    if (!content) {
        return 0;
    }

    const patterns = [
        /\b\d+(?:\.\d+)?%/g,
        /\b(?:guarantee|guaranteed|proven|certified|always|never)\b/gi,
        /\b(?:regulation|compliance|legal|medical|financial)\b/gi,
        /\$\s?\d[\d,]*(?:\.\d+)?/g,
    ];

    return patterns.reduce((count, pattern) => count + (content.match(pattern)?.length || 0), 0);
}

function normalizeMessageKey(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

function blockerPriority(kind: BlogStudioResolvedBlocker["resolutionKind"]) {
    if (kind === "system-required") {
        return 3;
    }

    if (kind === "human-required") {
        return 2;
    }

    return 1;
}

function dedupeResolvedBlockers(blockers: BlogStudioResolvedBlocker[]) {
    const deduped = new Map<string, BlogStudioResolvedBlocker>();

    for (const blocker of blockers) {
        const existing = deduped.get(blocker.key);
        if (!existing) {
            deduped.set(blocker.key, blocker);
            continue;
        }

        if (blockerPriority(blocker.resolutionKind) > blockerPriority(existing.resolutionKind)) {
            deduped.set(blocker.key, blocker);
        }
    }

    return Array.from(deduped.values());
}

function buildResolvedBlocker(
    key: string,
    category: BlogStudioResolvedBlocker["category"],
    source: BlogStudioResolvedBlocker["source"],
    resolutionKind: BlogStudioResolvedBlocker["resolutionKind"],
    message: string,
    fixHint: string,
): BlogStudioResolvedBlocker {
    return {
        key,
        category,
        source,
        resolutionKind,
        message,
        fixHint,
    };
}

function classifyAuditCheck(
    check: BlogStudioSeoAuditCheck,
    input: BuildBlogStudioBlockerResolutionPreviewInput,
) {
    const workflowSettings = { publishing: input.settings.publishing };
    const hasSiteUrl = Boolean(input.siteUrl?.trim());
    const aiReviewPolicy = getResolvedAiReviewPolicy(input.publishRules);
    const hasHighRiskClaimSignals = countHighRiskClaimSignals(input.post.content) > 0;
    const hasHighRiskCannibalization =
        input.audit.cannibalization?.risk === "high"
        && aiReviewPolicy.requireHumanReviewForHighRiskCannibalization;
    const toneCanBeAutoFixed = aiReviewPolicy.autoFixToneMismatch;
    const claimsCanBeAutoFixed =
        aiReviewPolicy.softenQuestionableClaims
        && !(hasHighRiskClaimSignals && aiReviewPolicy.requireHumanReviewForHighRiskClaims);

    switch (check.key) {
        case "title":
            return buildResolvedBlocker(
                "title",
                "metadata",
                "seo-audit",
                "ai-fixable",
                "Title is missing.",
                "Let AI generate a stronger, specific title that fits the draft.",
            );
        case "content":
            return buildResolvedBlocker(
                "content",
                "content",
                "seo-audit",
                "ai-fixable",
                "Main blog content is missing.",
                "Let AI write or expand the body copy before review.",
            );
        case "primary-keyword":
            return buildResolvedBlocker(
                "primary-keyword",
                "metadata",
                "seo-audit",
                "ai-fixable",
                "Primary keyword is missing.",
                "Let AI infer and set a primary keyword from the current title, brief, and content.",
            );
        case "meta-description":
            return buildResolvedBlocker(
                "meta-description",
                "metadata",
                "seo-audit",
                "ai-fixable",
                "Meta description is missing.",
                "Let AI write a stronger search snippet for this post.",
            );
        case "cta-presence":
            return buildResolvedBlocker(
                "cta-presence",
                "content",
                "seo-audit",
                "ai-fixable",
                "CTA is weak or missing.",
                "Let AI strengthen the closing CTA so the draft has a clear next step.",
            );
        case "internal-links":
            return buildResolvedBlocker(
                "internal-links",
                "internal-links",
                "seo-audit",
                "ai-fixable",
                "Internal links are required in the body copy.",
                "Let AI place natural internal links using the accepted or suggested targets.",
            );
        case "featured-image-alt":
            return buildResolvedBlocker(
                "featured-image-alt",
                "image",
                "seo-audit",
                "ai-fixable",
                "Featured image alt text is missing.",
                "Let AI add descriptive alt text for the hero image.",
            );
        case "canonical-url":
            return buildResolvedBlocker(
                "canonical-url",
                "metadata",
                "seo-audit",
                hasSiteUrl ? "ai-fixable" : "system-required",
                hasSiteUrl
                    ? "Canonical URL can be generated from the site URL."
                    : "Canonical URL cannot be generated because the site URL is not configured.",
                hasSiteUrl
                    ? "Let AI fill the canonical URL using the configured site origin."
                    : "Set the workspace site URL or enter a canonical URL manually.",
            );
        case "faq-pack":
            return buildResolvedBlocker(
                "faq-pack",
                "content",
                "seo-audit",
                "ai-fixable",
                "FAQ coverage is required for this informational draft.",
                "Let AI add a short FAQ pack based on the post context.",
            );
        case "business-fit":
            return buildResolvedBlocker(
                "business-fit",
                "business-fit",
                "seo-audit",
                "human-required",
                "Business fit is too weak for direct publish.",
                "A human should decide whether to reposition the topic, CTA path, or offer alignment.",
            );
        case "cannibalization-risk":
            return buildResolvedBlocker(
                "cannibalization-risk",
                "cannibalization",
                "seo-audit",
                hasHighRiskCannibalization ? "human-required" : "ai-fixable",
                input.audit.cannibalization?.summary || "Cannibalization risk needs review.",
                hasHighRiskCannibalization
                    ? "A human should review this conflict before publish."
                    : "Let AI retarget the angle, title, and copy to reduce overlap.",
            );
        case "claims-grounding":
            return buildResolvedBlocker(
                "claims-grounding",
                "claims",
                "seo-audit",
                claimsCanBeAutoFixed ? "ai-fixable" : "human-required",
                "Claims need grounded support or softer wording.",
                claimsCanBeAutoFixed
                    ? "Let AI soften unsupported claims and keep only what can be stated safely."
                    : "A human should review the risky claims or add stronger sources.",
            );
        case "tone-alignment":
            return buildResolvedBlocker(
                "tone-alignment",
                "tone",
                "seo-audit",
                toneCanBeAutoFixed ? "ai-fixable" : "human-required",
                "Draft tone conflicts with brand guardrails.",
                toneCanBeAutoFixed
                    ? "Let AI rewrite the draft to remove banned terms and tone mismatches."
                    : "A human should edit the tone to match the workspace brand voice.",
            );
        default:
            return buildResolvedBlocker(
                `audit-${check.key}`,
                "workflow",
                "seo-audit",
                "human-required",
                check.detail || `${check.label} still needs work.`,
                "Review and resolve this blocker manually.",
            );
    }
}

function getPublishBlockerKey(blocker: BlogStudioPublishBlocker) {
    const message = blocker.message.toLowerCase();

    if (blocker.category === "metadata") {
        if (message.includes("title is missing")) return "title";
        if (message.includes("meta description")) return "meta-description";
        if (message.includes("canonical")) return "canonical-url";
        if (message.includes("webhook") || message.includes("secret") || message.includes("https")) return "webhook-target";
    }

    if (blocker.category === "content") {
        if (message.includes("cta")) return "cta-presence";
        if (message.includes("faq")) return "faq-pack";
        if (message.includes("content")) return "content";
    }

    if (blocker.category === "image" && message.includes("alt text")) {
        return "featured-image-alt";
    }

    if (blocker.category === "internal-links") return "internal-links";
    if (blocker.category === "schema") return "schema-markup";
    if (blocker.category === "business-fit") return "business-fit";
    if (blocker.category === "cannibalization") return "cannibalization-risk";
    if (blocker.category === "claims") return "claims-grounding";
    if (blocker.category === "tone") return "tone-alignment";
    if (blocker.category === "seo-score") return "seo-score";
    if (blocker.category === "approval") return "manual-approval";

    return `${blocker.category}-${normalizeMessageKey(blocker.message)}`;
}

function classifyPublishBlocker(
    blocker: BlogStudioPublishBlocker,
    input: BuildBlogStudioBlockerResolutionPreviewInput,
) {
    const hasSiteUrl = Boolean(input.siteUrl?.trim());
    const canGenerateSchema = Boolean(hasSiteUrl || input.post.canonicalUrl?.trim());
    const aiReviewPolicy = getResolvedAiReviewPolicy(input.publishRules);
    const hasHighRiskClaimSignals = countHighRiskClaimSignals(input.post.content) > 0;
    const hasHighRiskCannibalization =
        input.audit.cannibalization?.risk === "high"
        && aiReviewPolicy.requireHumanReviewForHighRiskCannibalization;
    const claimsCanBeAutoFixed =
        aiReviewPolicy.softenQuestionableClaims
        && !(hasHighRiskClaimSignals && aiReviewPolicy.requireHumanReviewForHighRiskClaims);
    const toneCanBeAutoFixed = aiReviewPolicy.autoFixToneMismatch;
    const key = getPublishBlockerKey(blocker);
    const message = blocker.message.trim();

    if (blocker.category === "approval") {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "human-required",
            message,
            blocker.fixHint,
        );
    }

    if (blocker.category === "business-fit") {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "human-required",
            message,
            blocker.fixHint,
        );
    }

    if (blocker.category === "metadata" && key === "webhook-target") {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "system-required",
            message,
            blocker.fixHint,
        );
    }

    if (blocker.category === "metadata" && key === "canonical-url" && !hasSiteUrl) {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "system-required",
            message,
            "Set the site URL or enter the canonical URL manually before retrying.",
        );
    }

    if (blocker.category === "schema" && !canGenerateSchema) {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "system-required",
            message,
            "Add a site URL or canonical URL so schema can be generated deterministically.",
        );
    }

    if (blocker.category === "claims" && !claimsCanBeAutoFixed) {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "human-required",
            message,
            blocker.fixHint,
        );
    }

    if (blocker.category === "tone" && !toneCanBeAutoFixed) {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "human-required",
            message,
            blocker.fixHint,
        );
    }

    if (blocker.category === "cannibalization" && hasHighRiskCannibalization) {
        return buildResolvedBlocker(
            key,
            blocker.category,
            "publish-validation",
            "human-required",
            message,
            blocker.fixHint,
        );
    }

    return buildResolvedBlocker(
        key,
        blocker.category,
        "publish-validation",
        "ai-fixable",
        message,
        blocker.fixHint,
    );
}

function buildWorkflowBlockers(input: BuildBlogStudioBlockerResolutionPreviewInput) {
    const blockers: BlogStudioResolvedBlocker[] = [];
    const workflowSettings = { publishing: input.settings.publishing };

    if (input.post.target.type !== "webhook" || input.post.status === "Published") {
        return blockers;
    }

    if (isBlogStudioDraftOnlyMode(workflowSettings)) {
        blockers.push(
            buildResolvedBlocker(
                "workflow-draft-only",
                "workflow",
                "workflow",
                "system-required",
                "Draft Only mode is enabled, so this post cannot publish directly.",
                "Switch the workspace publish mode before attempting direct publish.",
            ),
        );
    }

    if (input.post.status !== "Scheduled") {
        const needsScheduleInput =
            input.post.status === "Approved"
            && !shouldBlogStudioAutoSchedule(workflowSettings)
            && !input.post.scheduledFor;

        blockers.push(
            buildResolvedBlocker(
                "workflow-stage",
                "workflow",
                "workflow",
                "human-required",
                needsScheduleInput
                    ? "A publish date is still required before final publish."
                    : "This draft must move through the workflow before final publish.",
                needsScheduleInput
                    ? "Set a publish date and move the post to Scheduled."
                    : "Advance the post through approval and scheduling after the AI fixes are saved.",
            ),
        );
    }

    return blockers;
}

export function buildBlogStudioBlockerResolutionPreview(
    input: BuildBlogStudioBlockerResolutionPreviewInput,
): BlogStudioBlockerResolutionPreview {
    const seoBlockers = input.audit.checks
        .filter((check) => !check.passed && check.severity === "required")
        .map((check) => classifyAuditCheck(check, input));
    const publishBlockers = input.publishValidation.blockers.map((blocker) => classifyPublishBlocker(blocker, input));
    const workflowBlockers = buildWorkflowBlockers(input);
    const blockers = dedupeResolvedBlockers([...seoBlockers, ...publishBlockers, ...workflowBlockers]);
    const aiFixable = blockers.filter((blocker) => blocker.resolutionKind === "ai-fixable");
    const humanRequired = blockers.filter((blocker) => blocker.resolutionKind === "human-required");
    const systemRequired = blockers.filter((blocker) => blocker.resolutionKind === "system-required");

    return {
        blockers,
        aiFixable,
        humanRequired,
        systemRequired,
        aiFixableCount: aiFixable.length,
        humanRequiredCount: humanRequired.length,
        systemRequiredCount: systemRequired.length,
        hasAiFixable: aiFixable.length > 0,
        hasBlockingIssues: blockers.length > 0,
    };
}
