import type { BlogStudioPostStatus, BlogStudioPost, BlogStudioSettings } from "@/lib/types-ai-blogger";
import type { AIBloggerConfig } from "@/lib/types";
import { normalizeBlogStudioTargetType } from "@/lib/ai-blogger-targets";

export const BLOG_STUDIO_POST_STATUS_ORDER: BlogStudioPostStatus[] = [
    "Draft",
    "Research",
    "SEO Review",
    "Approved",
    "Scheduled",
    "Published",
];

const NEXT_STATUS_MAP: Record<BlogStudioPostStatus, BlogStudioPostStatus | null> = {
    Draft: "Research",
    Research: "SEO Review",
    "SEO Review": "Approved",
    Approved: "Scheduled",
    Scheduled: "Published",
    Published: null,
};

const TRANSITION_LABELS: Record<BlogStudioPostStatus, string | null> = {
    Draft: "Move To Research",
    Research: "Send To SEO Review",
    "SEO Review": "Approve Draft",
    Approved: "Schedule Draft",
    Scheduled: "Mark As Published",
    Published: null,
};

/**
 * Validates that a post meets requirements for a specific status transition
 * ENHANCEMENT: Added validation checks for each status to prevent invalid state transitions
 */
export interface StatusTransitionValidation {
    valid: boolean;
    errors: string[];
}

type BlogStudioPublishingConfig = Pick<BlogStudioSettings, "publishing"> | undefined;

function hasConfiguredWebhookTarget(post: BlogStudioPost, settings?: BlogStudioSettings) {
    const target = post.target?.type ? post.target : settings?.publishing.defaultTarget;
    if (!target) {
        return false;
    }

    if (normalizeBlogStudioTargetType(target?.type, "manual-export") !== "webhook") {
        return false;
    }

    const webhookConfig = target.webhookConfig;
    const webhookUrl = webhookConfig?.url?.trim() || "";
    const hasSecret = Boolean(
        webhookConfig?.secret?.trim() ||
        webhookConfig?.secretMasked?.trim() ||
        webhookConfig?.hasSecret,
    );

    return Boolean(webhookConfig?.active && webhookUrl && hasSecret);
}

export function isBlogStudioDraftOnlyMode(settings?: BlogStudioPublishingConfig) {
    return settings?.publishing.publishMode === "draft-only";
}

export function isBlogStudioApprovalRequired(settings?: BlogStudioPublishingConfig) {
    if (!settings) {
        return false;
    }

    return settings.publishing.requireApproval ||
        settings.publishing.publishMode === "approval-required" ||
        settings.publishing.publishMode === "schedule-after-approval";
}

export function shouldBlogStudioAutoSchedule(settings?: BlogStudioPublishingConfig) {
    if (!settings) {
        return false;
    }

    return settings.publishing.autoSchedule || settings.publishing.publishMode === "schedule-after-approval";
}

export function getDefaultBlogStudioScheduledFor(baseDate = new Date()) {
    const scheduledDate = new Date(baseDate);
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    scheduledDate.setHours(10, 0, 0, 0);

    if (scheduledDate <= baseDate) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    return scheduledDate.toISOString();
}

export function validateStatusTransition(
    post: BlogStudioPost,
    currentStatus: BlogStudioPostStatus,
    nextStatus: BlogStudioPostStatus,
    settings?: BlogStudioSettings,
    publishRules?: AIBloggerConfig["publishRules"]
): StatusTransitionValidation {
    const errors: string[] = [];

    // Check if transition is allowed
    if (NEXT_STATUS_MAP[currentStatus] !== nextStatus) {
        errors.push(
            `Invalid transition from "${currentStatus}" to "${nextStatus}". Valid transitions: ${NEXT_STATUS_MAP[currentStatus] || "none"}`
        );
        return { valid: false, errors };
    }

    // Validate based on target status
    if (nextStatus === "Research") {
        // Moving to Research: Must have content or brief
        if (!post.content && !post.brief?.sourceValue) {
            errors.push("Cannot move to Research: Add content or provide a research source.");
        }
    } else if (nextStatus === "SEO Review") {
        // Moving to SEO Review: Must have content and basic metadata
        if (!post.content || !post.content.trim()) {
            errors.push("Cannot move to SEO Review: Content is required.");
        }
        if (!post.title || !post.title.trim()) {
            errors.push("Cannot move to SEO Review: Title is required.");
        }
        if (!post.excerpt || !post.excerpt.trim()) {
            errors.push("Cannot move to SEO Review: Excerpt is required.");
        }
    } else if (nextStatus === "Approved") {
        // Moving to Approved: Must pass SEO audit and have proper content
        if (!post.content || !post.content.trim()) {
            errors.push("Cannot approve: Content is required.");
        }
        if (settings?.seo?.requireInternalLinks && (!post.internalLinks || post.internalLinks.length === 0)) {
            errors.push("Cannot approve: Internal links are required by workspace settings.");
        }
        if (settings?.seo?.requireMetaDescription && (!post.metaDescription || !post.metaDescription.trim())) {
            errors.push("Cannot approve: Meta description is required by workspace settings.");
        }
    } else if (nextStatus === "Scheduled") {
        if (isBlogStudioDraftOnlyMode(settings)) {
            errors.push("Cannot schedule: this workspace is configured for Draft Only publishing.");
        }

        // Moving to Scheduled: Must have approval and scheduled date
        if (!post.scheduledFor) {
            if (!shouldBlogStudioAutoSchedule(settings)) {
                errors.push("Cannot schedule: Set a publish date and time.");
            }
        } else {
            const scheduledDate = new Date(post.scheduledFor);
            const now = new Date();
            if (scheduledDate <= now) {
                errors.push("Cannot schedule: Publish date must be in the future.");
            }
        }
        if (isBlogStudioApprovalRequired(settings) && !post.approvedBy) {
            errors.push("Cannot schedule: This workspace requires approval before scheduling.");
        }
    } else if (nextStatus === "Published") {
        if (isBlogStudioDraftOnlyMode(settings)) {
            errors.push("Cannot publish: this workspace is configured for Draft Only publishing.");
        }

        // Moving to Published: Must have scheduled date in past and pass SEO checks
        if (post.status !== "Scheduled") {
            errors.push("Cannot publish: Post must be in Scheduled status.");
        }
        if (!hasConfiguredWebhookTarget(post, settings)) {
            errors.push("Cannot publish: Configure an active webhook URL and secret before publishing.");
        }
        if (publishRules?.minimumSeoScore && post.seoScore && post.seoScore < publishRules.minimumSeoScore) {
            errors.push(
                `Cannot publish: SEO score (${post.seoScore}) below minimum (${publishRules.minimumSeoScore}).`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export function getNextBlogStudioPostStatus(status: BlogStudioPostStatus) {
    return NEXT_STATUS_MAP[status];
}

export function getBlogStudioStatusTransitionLabel(status: BlogStudioPostStatus) {
    return TRANSITION_LABELS[status];
}

export function canTransitionBlogStudioStatus(
    currentStatus: BlogStudioPostStatus,
    nextStatus: BlogStudioPostStatus,
) {
    return NEXT_STATUS_MAP[currentStatus] === nextStatus;
}

export function shouldTreatBlogStudioStatusTransitionAsNoop(
    currentStatus: BlogStudioPostStatus,
    requestedStatus: BlogStudioPostStatus,
    expectedCurrentStatus?: BlogStudioPostStatus,
) {
    const isStaleSameStatusRequest = Boolean(
        expectedCurrentStatus &&
        expectedCurrentStatus !== currentStatus &&
        currentStatus === requestedStatus,
    );

    if (isStaleSameStatusRequest) {
        return true;
    }

    const currentIndex = BLOG_STUDIO_POST_STATUS_ORDER.indexOf(currentStatus);
    const requestedIndex = BLOG_STUDIO_POST_STATUS_ORDER.indexOf(requestedStatus);

    if (currentIndex === -1 || requestedIndex === -1) {
        return false;
    }

    return currentIndex > requestedIndex;
}
