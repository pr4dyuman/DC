import type {
    BlogStudioCannibalizationReport,
    BlogStudioPost,
    BlogStudioSeoAudit,
    BlogStudioSeoAuditCheck,
    BlogStudioSettings,
} from "./types-ai-blogger";
import type { AIBloggerConfig } from "./types";
import { countInternalLinks, hasInternalLinks } from "./ai-blogger-internal-link-utils";

function resolveSeoAuditSiteUrl(post: BlogStudioPost, config?: AIBloggerConfig | null) {
    const candidates = [
        post.canonicalUrl,
        config?.entityModeling?.organizationUrl,
        config?.author?.url,
        post.brief.sourceMode === "website" ? post.brief.sourceValue : "",
    ];

    for (const candidate of candidates) {
        const value = candidate?.trim();
        if (!value) {
            continue;
        }

        try {
            return new URL(value).origin;
        } catch {
            continue;
        }
    }

    return undefined;
}

function normalizeText(value?: string) {
    return value?.trim() || "";
}

function normalizeComparableText(value?: string) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/<[^>]+>/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[`*_>#]/g, " ")
        .replace(/&nbsp;|&amp;|&quot;|&#39;/g, " ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function countWords(value?: string) {
    const normalized = normalizeText(value);
    if (!normalized) {
        return 0;
    }

    return normalized
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

// countInternalLinks and hasInternalLinks imported from ai-blogger-internal-link-utils

function hasHeadings(content?: string) {
    if (!content) {
        return false;
    }

    return /^\s{0,3}#{2,6}\s+\S+/m.test(content) || /<h[2-6][^>]*>[\s\S]*?<\/h[2-6]>/i.test(content);
}

function cleanHeadingText(value: string) {
    return normalizeText(
        value
            .replace(/<[^>]+>/g, " ")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/[`*_>#]/g, " ")
            .replace(/\s+/g, " "),
    );
}

function extractHeadings(content?: string) {
    if (!content) {
        return [] as Array<{ level: number; text: string }>;
    }

    const headings: Array<{ level: number; text: string }> = [];
    const markdownRegex = /^\s{0,3}(#{2,6})\s+(.+?)\s*$/gm;
    const htmlRegex = /<h([2-6])[^>]*>([\s\S]*?)<\/h\1>/gi;

    for (const match of content.matchAll(markdownRegex)) {
        const level = match[1]?.length ?? 0;
        const text = cleanHeadingText(match[2] || "");
        if (level >= 2 && text) {
            headings.push({ level, text });
        }
    }

    for (const match of content.matchAll(htmlRegex)) {
        const level = Number(match[1] || 0);
        const text = cleanHeadingText(match[2] || "");
        if (level >= 2 && text) {
            headings.push({ level, text });
        }
    }

    return headings;
}

function extractContentSections(content?: string) {
    const normalized = normalizeText(content);
    if (!normalized) {
        return [] as string[];
    }

    const markdownSections = normalized
        .split(/^\s{0,3}#{2,6}\s+.+$/gm)
        .map((section) => section.trim())
        .filter((section) => section.length >= 80);

    if (markdownSections.length > 0) {
        return markdownSections;
    }

    const paragraphSections = normalized
        .split(/\n\s*\n/)
        .map((section) => section.trim())
        .filter((section) => section.length >= 120);

    return paragraphSections;
}

function hasConcreteSpecifics(section: string) {
    if (!section) {
        return false;
    }

    const patterns = [
        /\bfor example\b/i,
        /\bfor instance\b/i,
        /\bsay you\b/i,
        /\bimagine\b/i,
        /\bscenario\b/i,
        /\bcase study\b/i,
        /\b\d+(?:\.\d+)?%/i,
        /\b\d{4}\b/i,
        /\$\s?\d[\d,]*(?:\.\d+)?/i,
        /\b\d+(?:\.\d+)?\s*(?:days?|weeks?|months?|years?|hours?)\b/i,
    ];

    return patterns.some((pattern) => pattern.test(section));
}

function getConcreteSpecificsCoverage(content?: string) {
    const sections = extractContentSections(content).slice(0, 8);

    if (sections.length === 0) {
        const fallback = normalizeText(content);
        return {
            sectionCount: fallback ? 1 : 0,
            specificSections: fallback && hasConcreteSpecifics(fallback) ? 1 : 0,
        };
    }

    return {
        sectionCount: sections.length,
        specificSections: sections.filter((section) => hasConcreteSpecifics(section)).length,
    };
}

function countMeaningfulWords(value?: string) {
    const normalized = normalizeComparableText(value);
    if (!normalized) {
        return 0;
    }

    return normalized.split(/\s+/).filter((token) => token.length > 1).length;
}

function isGenericTitle(title: string) {
    const normalized = normalizeComparableText(title);
    return [
        "blog post",
        "new blog post",
        "untitled",
        "draft",
        "seo article",
        "new article",
    ].includes(normalized);
}

function titleHasRepeatedPunctuation(title: string) {
    return /[!?.,:;]{2,}/.test(title);
}

function containsCallToAction(content?: string, ctaGoal?: string) {
    if (!content) {
        return false;
    }

    const normalizedContent = normalizeComparableText(content);
    const endingWindow = normalizedContent.slice(Math.max(0, normalizedContent.length - 1400));
    const genericPhrases = [
        "contact us",
        "get in touch",
        "reach out",
        "book a call",
        "schedule a call",
        "schedule a consultation",
        "request a quote",
        "request a proposal",
        "request a consultation",
        "talk to our team",
        "talk to us",
        "call us",
        "email us",
        "get started",
        "start your project",
        "explore our services",
        "book a consultation",
    ];

    if (genericPhrases.some((phrase) => endingWindow.includes(phrase) || normalizedContent.includes(phrase))) {
        return true;
    }

    const normalizedGoal = normalizeComparableText(ctaGoal);
    if (!normalizedGoal) {
        return false;
    }

    if (normalizedGoal.length >= 8 && (endingWindow.includes(normalizedGoal) || normalizedContent.includes(normalizedGoal))) {
        return true;
    }

    const goalTokens = normalizedGoal.split(/\s+/).filter((token) => token.length >= 4);
    return goalTokens.length >= 2 && goalTokens.every((token) => endingWindow.includes(token));
}

function getAiReviewPolicy(publishRules?: AIBloggerConfig["publishRules"]) {
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

function getMatchedBannedTerms(content: string, bannedTerms: string[]) {
    const normalizedContent = normalizeComparableText(content);
    if (!normalizedContent) {
        return [] as string[];
    }

    return bannedTerms
        .map((term) => normalizeComparableText(term))
        .filter((term) => term.length >= 3 && normalizedContent.includes(term));
}

function countClaimSignals(content: string) {
    if (!content) {
        return 0;
    }

    const patterns = [
        /\b\d+(?:\.\d+)?%/g,
        /\b\d{4}\b/g,
        /\b(?:study|studies|research|report|reports|survey|surveys|data|statistics)\b/gi,
        /\b\d+(?:\.\d+)?\s*(?:x|times|hours|days|weeks|months|years)\b/gi,
        /\$\s?\d[\d,]*(?:\.\d+)?/g,
    ];

    return patterns.reduce((count, pattern) => count + (content.match(pattern)?.length || 0), 0);
}

function countHighRiskClaimSignals(content: string) {
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

function includesKeyword(text: string, keyword: string) {
    if (!text || !keyword) {
        return false;
    }

    return text.toLowerCase().includes(keyword.toLowerCase());
}

function getCheckWeights(checks: BlogStudioSeoAuditCheck[]) {
    return checks.reduce(
        (totals, check) => {
            const weight = check.severity === "required" ? 2 : 1;
            totals.total += weight;

            if (check.passed) {
                totals.passed += weight;
            }

            return totals;
        },
        { passed: 0, total: 0 },
    );
}

function getScore(checks: BlogStudioSeoAuditCheck[]) {
    const weights = getCheckWeights(checks);

    if (weights.total === 0) {
        return 100;
    }

    return Math.round((weights.passed / weights.total) * 100);
}

function buildSuggestions(
    checks: BlogStudioSeoAuditCheck[],
    settings: BlogStudioSettings,
) {
    const failed = new Set(checks.filter((check) => !check.passed).map((check) => check.key));
    const suggestions: string[] = [];

    if (failed.has("primary-keyword")) {
        suggestions.push("Set a primary keyword so the draft has a clear SEO target before review.");
    }

    if (failed.has("keyword-in-title")) {
        suggestions.push("Bring the primary keyword into the title if it still reads naturally.");
    }

    if (failed.has("keyword-in-body")) {
        suggestions.push("Use the primary keyword naturally in the intro or one of the main section headings.");
    }

    if (failed.has("title-quality")) {
        suggestions.push("Refine the title so it is specific, natural, and strong enough for search results.");
    }

    if (failed.has("internal-links")) {
        suggestions.push("Add 2-3 internal links to relevant services, case studies, or supporting articles.");
    }

    if (failed.has("cta-presence")) {
        suggestions.push("Add a clear business CTA near the end of the draft so readers know the next step.");
    }

    if (failed.has("meta-description")) {
        suggestions.push(
            settings.seo.requireMetaDescription
                ? "Add a dedicated meta description before approval so the live page has controlled search metadata."
                : "Add a dedicated meta description instead of relying only on the excerpt fallback.",
        );
    }

    if (failed.has("meta-description-length")) {
        suggestions.push("Trim the meta description closer to 150-160 characters for cleaner search snippets.");
    }

    if (failed.has("meta-title")) {
        suggestions.push("Set a dedicated meta title so the article can target search results more precisely.");
    }

    if (failed.has("meta-title-length")) {
        suggestions.push("Trim the meta title closer to 50-60 characters so it stays clean in search results.");
    }

    if (failed.has("featured-image-alt")) {
        suggestions.push("Add featured image alt text before publishing this article.");
    }

    if (failed.has("canonical-url")) {
        suggestions.push("Set a canonical URL so the live page has explicit indexation guidance.");
    }

    if (failed.has("faq-pack")) {
        suggestions.push("Add a short FAQ pack for this informational draft so it covers common search questions.");
    }

    if (failed.has("business-fit")) {
        suggestions.push("Tighten the topic around a real business offer, audience pain point, and CTA path before approval.");
    }

    if (failed.has("cannibalization-risk")) {
        suggestions.push("Retarget the keyword, angle, or title so this post does not compete with an existing published article.");
    }

    if (failed.has("claims-grounding")) {
        suggestions.push("Support concrete claims with grounded sources, soften the wording, or remove unsupported specifics before publishing.");
    }

    if (failed.has("tone-alignment")) {
        suggestions.push("Rewrite the draft to remove banned brand terms or tone mismatches before the next review step.");
    }

    if (failed.has("word-range")) {
        suggestions.push(`Adjust the draft toward the ${settings.seo.minWords}-${settings.seo.maxWords} word target range.`);
    }

    if (failed.has("outline")) {
        suggestions.push("Add or refine the outline so reviewers can scan the structure quickly.");
    }

    if (failed.has("tags")) {
        suggestions.push("Attach tags so the editorial queue and publishing rules can classify the post cleanly.");
    }

    if (failed.has("headings")) {
        suggestions.push("Break the body into clear section headings so the article is easier to scan and optimize.");
    }

    if (failed.has("section-coverage")) {
        suggestions.push("Expand the body structure so the draft covers the planned sections with clearer H2 headings.");
    }

    if (failed.has("heading-depth")) {
        suggestions.push("Add at least one supporting subheading so longer sections are broken into clearer topic layers.");
    }

    if (failed.has("concrete-specifics")) {
        suggestions.push("Replace generic advice with examples, scenarios, timeframes, or grounded proof points across the main sections.");
    }

    if (failed.has("excerpt")) {
        suggestions.push("Write a sharper excerpt so the queue and public blog cards communicate the topic quickly.");
    }

    if (suggestions.length === 0) {
        suggestions.push("The core SEO structure looks solid. Focus on polish, approvals, and publish timing.");
    }

    return suggestions.slice(0, 6);
}

export function getBlogStudioSeoLabel(score: number) {
    if (score >= 90) {
        return "Excellent";
    }

    if (score >= 75) {
        return "Strong";
    }

    if (score >= 60) {
        return "Improving";
    }

    return "Needs Work";
}

export function getBlogStudioSeoAudit(
    post: BlogStudioPost,
    settings: BlogStudioSettings,
    publishRules?: AIBloggerConfig["publishRules"],
    options?: {
        cannibalization?: BlogStudioCannibalizationReport;
    },
): BlogStudioSeoAudit {
    const title = normalizeText(post.title);
    const excerpt = normalizeText(post.excerpt);
    const metaTitle = normalizeText(post.metaTitle);
    const metaDescription = normalizeText(post.metaDescription);
    const canonicalUrl = normalizeText(post.canonicalUrl);
    const content = normalizeText(post.content);
    const primaryKeyword = normalizeText(post.brief.primaryKeyword);
    const featuredImageAlt = normalizeText(post.featuredImageAlt);
    const wordCount = post.wordCount ?? countWords(content);
    const titleAndContent = `${title}\n${content}`;
    const requireInternalLinks = publishRules?.requireInternalLinks ?? settings.seo.requireInternalLinks;
    const requireMetaDescription =
        publishRules?.requireMetaDescription ?? settings.seo.requireMetaDescription;
    const requireImageAltText =
        publishRules?.requireImageAltText ?? post.target.type === "webhook";
    const requireCanonicalUrl = publishRules?.requireCanonicalUrl ?? false;
    const requireFaqForInformational = publishRules?.requireFaqForInformational ?? false;
    const aiReviewPolicy = getAiReviewPolicy(publishRules);
    const keywordInTitle = primaryKeyword ? includesKeyword(title, primaryKeyword) : false;
    const keywordInBody = primaryKeyword ? includesKeyword(titleAndContent, primaryKeyword) : false;
    const siteUrl = resolveSeoAuditSiteUrl(post);
    const internalLinkCount = countInternalLinks(content, siteUrl);
    const internalLinksPresent = requireInternalLinks ? internalLinkCount >= 2 : hasInternalLinks(content, siteUrl);
    const withinWordRange =
        wordCount >= settings.seo.minWords && wordCount <= settings.seo.maxWords;
    const metaTitleLengthAligned = metaTitle.length > 0 && metaTitle.length <= 60;
    const metaDescriptionLengthAligned = metaDescription.length > 0 && metaDescription.length <= 160;
    const headingsPresent = hasHeadings(content);
    const headings = extractHeadings(content);
    const sectionHeadingCount = headings.length;
    const subheadingCount = headings.filter((heading) => heading.level >= 3).length;
    const concreteSpecificsCoverage = getConcreteSpecificsCoverage(content);
    const minimumSectionCount = content
        ? Math.max(
            wordCount >= 1800 ? 4 : wordCount >= 1000 ? 3 : wordCount >= 600 ? 2 : 1,
            post.outline.length > 0
                ? Math.min(post.outline.length, wordCount >= 1800 ? 5 : wordCount >= 1000 ? 4 : 3)
                : 0,
        )
        : 0;
    const sectionCoverageAligned = content ? sectionHeadingCount >= minimumSectionCount : false;
    const requiresHeadingDepth = wordCount >= 1400 || post.outline.length >= 6;
    const headingDepthAligned = content
        ? requiresHeadingDepth
            ? subheadingCount >= 1
            : sectionHeadingCount >= 2 || subheadingCount >= 1
        : false;
    const concreteSpecificsAligned = content
        ? concreteSpecificsCoverage.specificSections >= Math.max(1, Math.ceil(concreteSpecificsCoverage.sectionCount * 0.5))
        : false;
    const titleLengthAligned = title.length >= 35 && title.length <= 70;
    const titleWordCount = countMeaningfulWords(title);
    const titleQualityAligned =
        Boolean(title) &&
        titleLengthAligned &&
        titleWordCount >= 5 &&
        titleWordCount <= 14 &&
        !isGenericTitle(title) &&
        !titleHasRepeatedPunctuation(title);
    const featuredImageAltReady = requireImageAltText ? Boolean(featuredImageAlt) : true;
    const canonicalUrlReady = requireCanonicalUrl ? Boolean(canonicalUrl) : true;
    const faqItemsPresent = (post.faqItems || []).some(
        (item) => Boolean(item.question?.trim() && item.answer?.trim()),
    );
    const faqPackReady =
        requireFaqForInformational && post.searchIntent === "informational"
            ? faqItemsPresent
            : true;
    const businessFitScore = post.draftBrief?.businessFitScore;
    const businessFitWarnings = post.draftBrief?.businessFitWarnings || [];
    const hasBusinessFitScore = typeof businessFitScore === "number" && Number.isFinite(businessFitScore);
    const businessFitBlocked = hasBusinessFitScore ? businessFitScore < 60 : false;
    const businessFitCritical = hasBusinessFitScore ? businessFitScore < 40 : false;
    const businessFitDetail = hasBusinessFitScore
        ? `Stored fit score: ${businessFitScore}/100.${businessFitWarnings.length > 0 ? ` Warnings: ${businessFitWarnings.join(" | ")}` : ""}`
        : "Business-fit scoring has not been stored for this draft yet.";
    const cannibalization = options?.cannibalization;
    const cannibalizationRisk = cannibalization?.risk || "low";
    const cannibalizationSeverity =
        cannibalizationRisk === "high"
            ? (aiReviewPolicy.requireHumanReviewForHighRiskCannibalization ? "required" : "recommended")
            : cannibalizationRisk === "medium"
                ? (aiReviewPolicy.flagSoftCannibalization ? "recommended" : "required")
                : "recommended";
    const ctaGoal = normalizeText(post.draftBrief?.ctaGoal || post.brief.cta);
    const ctaPresent = containsCallToAction(content, ctaGoal);
    const ctaRequired =
        post.searchIntent === "commercial" ||
        post.searchIntent === "transactional" ||
        post.contentType === "solution-explainer";
    const ctaSeverity = ctaRequired && !ctaPresent && aiReviewPolicy.flagWeakCtaAlignment ? "recommended" : ctaRequired ? "required" : "recommended";
    const groundedSources = post.externalSources || [];
    const highTrustGroundedSources = groundedSources.filter((source) => source.trustLevel === "high").length;
    const claimSignalCount = countClaimSignals(content);
    const highRiskClaimSignalCount = countHighRiskClaimSignals(content);
    const claimsNeedSupport = aiReviewPolicy.enableFinalChecker && aiReviewPolicy.requireGroundedSourcesForClaims && claimSignalCount > 0;
    const claimsSupported = !claimsNeedSupport || groundedSources.length > 0;
    const claimsSeverity =
        highRiskClaimSignalCount > 0 && aiReviewPolicy.requireHumanReviewForHighRiskClaims
            ? "required"
            : aiReviewPolicy.softenQuestionableClaims
                ? "recommended"
                : "required";
    const matchedBannedTerms = getMatchedBannedTerms(content, settings.brandVoice.bannedTerms || []);
    const toneMismatchDetected = aiReviewPolicy.enableFinalChecker && matchedBannedTerms.length > 0;
    const toneSeverity = aiReviewPolicy.autoFixToneMismatch ? "recommended" : "required";

    const checks: BlogStudioSeoAuditCheck[] = [
        {
            key: "title",
            label: "Title set",
            passed: Boolean(title),
            severity: "required",
            detail: "Needed before approval and publishing.",
        },
        {
            key: "content",
            label: "Main content ready",
            passed: Boolean(content),
            severity: "required",
            detail: "The draft needs full body copy before it can move forward.",
        },
        {
            key: "excerpt",
            label: "Excerpt present",
            passed: Boolean(excerpt),
            severity: "recommended",
            detail: "Used in queue previews and blog cards.",
        },
        {
            key: "meta-title",
            label: "Meta title ready",
            passed: Boolean(metaTitle),
            severity: "recommended",
            detail: "Falls back to the blog title if left blank.",
        },
        {
            key: "meta-title-length",
            label: "Meta title length aligned",
            passed: metaTitleLengthAligned,
            severity: "recommended",
            detail: "Aim for roughly 50-60 characters when practical.",
        },
        {
            key: "meta-description",
            label: "Meta description ready",
            passed: Boolean(metaDescription),
            severity: requireMetaDescription ? "required" : "recommended",
            detail: requireMetaDescription
                ? "This workspace requires a meta description before approval."
                : "Recommended for cleaner search snippets.",
        },
        {
            key: "meta-description-length",
            label: "Meta description length aligned",
            passed: metaDescriptionLengthAligned,
            severity: "recommended",
            detail: "Aim for roughly 150-160 characters when practical.",
        },
        {
            key: "primary-keyword",
            label: "Primary keyword defined",
            passed: Boolean(primaryKeyword),
            severity: "required",
            detail: "Used to keep the draft focused on one search target.",
        },
        {
            key: "keyword-in-title",
            label: "Primary keyword in title",
            passed: !primaryKeyword || keywordInTitle,
            severity: "recommended",
            detail: "Helpful when it still sounds natural.",
        },
        {
            key: "title-quality",
            label: "Title quality aligned",
            passed: titleQualityAligned,
            severity: "recommended",
            detail: `Current title: ${title.length} characters and ${titleWordCount} meaningful words. Aim for a specific, natural title in roughly the 35-70 character range.`,
        },
        {
            key: "keyword-in-body",
            label: "Primary keyword covered in draft",
            passed: !primaryKeyword || keywordInBody,
            severity: "recommended",
            detail: "Use it naturally in the intro or body copy.",
        },
        {
            key: "cta-presence",
            label: "Clear CTA included",
            passed: ctaPresent,
            severity: ctaSeverity,
            detail: ctaGoal
                ? `Expected CTA path: ${ctaGoal}. Add a clear next step near the end of the draft.`
                : "Add a clear next step for readers, ideally near the end of the draft.",
        },
        {
            key: "internal-links",
            label: "Internal links included",
            passed: internalLinksPresent,
            severity: requireInternalLinks ? "required" : "recommended",
            detail: requireInternalLinks
                ? `This workspace requires at least 2 internal links before approval. Currently found: ${internalLinkCount}.`
                : `Helpful for crawl paths and topic clusters. Currently found: ${internalLinkCount}.`,
        },
        {
            key: "section-coverage",
            label: "Section coverage aligned",
            passed: sectionCoverageAligned,
            severity: "recommended",
            detail: `Detected ${sectionHeadingCount} section heading${sectionHeadingCount === 1 ? "" : "s"} against a target of at least ${minimumSectionCount || 1}.`,
        },
        {
            key: "heading-depth",
            label: "Heading depth aligned",
            passed: headingsPresent && headingDepthAligned,
            severity: "recommended",
            detail: requiresHeadingDepth
                ? `Long-form drafts should include at least one deeper subheading. Currently found: ${subheadingCount}.`
                : `Shorter drafts still benefit from layered structure. Currently found: ${subheadingCount} supporting subheading${subheadingCount === 1 ? "" : "s"}.`,
        },
        {
            key: "concrete-specifics",
            label: "Concrete specifics included",
            passed: concreteSpecificsAligned,
            severity: "recommended",
            detail: `Detected specificity signals in ${concreteSpecificsCoverage.specificSections} of ${Math.max(concreteSpecificsCoverage.sectionCount, 1)} reviewed section${Math.max(concreteSpecificsCoverage.sectionCount, 1) === 1 ? "" : "s"}. Add examples, scenarios, timeframes, or grounded details to more sections if the draft feels generic.`,
        },
        {
            key: "featured-image-alt",
            label: "Featured image alt set",
            passed: featuredImageAltReady,
            severity: requireImageAltText ? "required" : "recommended",
            detail: requireImageAltText
                ? "This workspace requires featured image alt text before approval."
                : "Optional for manual export targets.",
        },
        {
            key: "canonical-url",
            label: "Canonical URL ready",
            passed: canonicalUrlReady,
            severity: requireCanonicalUrl ? "required" : "recommended",
            detail: requireCanonicalUrl
                ? "This workspace requires a canonical URL before approval."
                : "Recommended when the public page should use an explicit canonical target.",
        },
        {
            key: "faq-pack",
            label: "FAQ pack ready",
            passed: faqPackReady,
            severity:
                requireFaqForInformational && post.searchIntent === "informational"
                    ? "required"
                    : "recommended",
            detail:
                requireFaqForInformational && post.searchIntent === "informational"
                    ? "This workspace requires FAQ coverage for informational drafts."
                    : "Useful when the topic benefits from FAQ coverage or People Also Ask targeting.",
        },
        {
            key: "business-fit",
            label: "Business fit is strong enough",
            passed: hasBusinessFitScore ? businessFitScore >= 60 : true,
            severity:
                businessFitBlocked
                    ? businessFitCritical || !aiReviewPolicy.flagWeakBusinessFit
                        ? "required"
                        : "recommended"
                    : "recommended",
            detail: businessFitDetail,
        },
        {
            key: "cannibalization-risk",
            label: "Cannibalization risk cleared",
            passed:
                !cannibalization ||
                (cannibalizationRisk === "high"
                    ? !aiReviewPolicy.requireHumanReviewForHighRiskCannibalization
                    : cannibalizationRisk !== "medium" && !cannibalization.shouldBlock),
            severity: cannibalizationSeverity,
            detail: cannibalization
                ? cannibalization.summary
                : "Checks whether the draft is likely to compete with an existing published article targeting the same topic.",
        },
        {
            key: "claims-grounding",
            label: "Claim support is grounded",
            passed: claimsSupported,
            severity: claimsNeedSupport ? claimsSeverity : "recommended",
            detail: claimsNeedSupport
                ? groundedSources.length > 0
                    ? `Grounded sources available (${groundedSources.length} total, ${highTrustGroundedSources} high-trust) for ${claimSignalCount} detected claim signal${claimSignalCount === 1 ? "" : "s"}.`
                    : `Detected ${claimSignalCount} factual claim signal${claimSignalCount === 1 ? "" : "s"} but no grounded sources are stored for support.`
                : "No extra claim-support review was triggered for this draft.",
        },
        {
            key: "tone-alignment",
            label: "Tone stays within brand guardrails",
            passed: !toneMismatchDetected,
            severity: toneMismatchDetected ? toneSeverity : "recommended",
            detail: toneMismatchDetected
                ? `Detected banned brand terms in the draft: ${matchedBannedTerms.join(", ")}.`
                : "No banned brand terms were detected in the current draft.",
        },
        {
            key: "outline",
            label: "Outline prepared",
            passed: post.outline.length > 0,
            severity: "recommended",
            detail: "Makes editorial review faster.",
        },
        {
            key: "tags",
            label: "Tags attached",
            passed: post.tags.length > 0,
            severity: "recommended",
            detail: "Useful for queue filtering and classification.",
        },
        {
            key: "word-range",
            label: "Word range aligned",
            passed: withinWordRange,
            severity: "recommended",
            detail: `${wordCount} words against a ${settings.seo.minWords}-${settings.seo.maxWords} target.`,
        },
    ];

    const blockers = checks
        .filter((check) => !check.passed && check.severity === "required")
        .map((check) => {
            switch (check.key) {
                case "title":
                    return "add a title";
                case "content":
                    return "add the main blog content";
                case "meta-description":
                    return "add a meta description";
                case "primary-keyword":
                    return "set a primary keyword";
                case "cta-presence":
                    return "add a clear CTA in the draft";
                case "internal-links":
                    return requireInternalLinks
                        ? "add at least 2 internal links in the content"
                        : "add at least one internal link in the content";
                case "featured-image-alt":
                    return "add featured image alt text";
                case "canonical-url":
                    return "set a canonical URL";
                case "faq-pack":
                    return "add FAQ items for this informational draft";
                case "business-fit":
                    return "improve the business fit, CTA path, or topic relevance";
                case "cannibalization-risk":
                    return "resolve keyword cannibalization with similar published posts";
                default:
                    return `fix ${check.label.toLowerCase()}`;
            }
        });

    const counts = checks.reduce(
        (totals, check) => {
            totals.total += 1;

            if (check.severity === "required") {
                totals.requiredTotal += 1;
                if (check.passed) {
                    totals.requiredPassed += 1;
                }
            } else {
                totals.recommendedTotal += 1;
                if (check.passed) {
                    totals.recommendedPassed += 1;
                }
            }

            if (check.passed) {
                totals.passed += 1;
            }

            return totals;
        },
        {
            passed: 0,
            total: 0,
            requiredPassed: 0,
            requiredTotal: 0,
            recommendedPassed: 0,
            recommendedTotal: 0,
        },
    );

    return {
        score: getScore(checks),
        checks,
        blockers,
        suggestions: buildSuggestions(checks, settings),
        cannibalization,
        requiredChecksPassed: blockers.length === 0,
        counts,
    };
}
