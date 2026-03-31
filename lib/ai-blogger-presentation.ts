import type {
    BlogStudioBrief,
    BlogStudioContentType,
    BlogStudioInputMode,
    BlogStudioPostStatus,
    BlogStudioPublishMode,
    BlogStudioQueueReadiness,
    BlogStudioTargetType,
} from "@/lib/types";
import { normalizeBlogStudioTargetType } from "@/lib/ai-blogger-targets";

const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

const sourceLabels: Record<BlogStudioInputMode, string> = {
    website: "Website Brief",
    trending: "Trending Topic",
    keywords: "Keyword Cluster",
};

const publishModeLabels: Record<BlogStudioPublishMode, string> = {
    "draft-only": "Draft Only",
    "approval-required": "Approval Required",
    "schedule-after-approval": "Schedule After Approval",
};

const targetTypeLabels: Record<BlogStudioTargetType, string> = {
    "webhook": "Automated Publishing",
    "manual-export": "Manual Export",
};

const postStatusNotes: Record<BlogStudioPostStatus, string> = {
    Draft: "Shape the brief, confirm the angle, and prepare the first draft for research.",
    Research: "Add source context and supporting points before the SEO review layer runs.",
    "SEO Review": "Tighten keyword coverage, metadata, and internal linking before approval.",
    Approved: "Hand the draft into scheduling or publishing once editorial sign-off is complete.",
    Scheduled: "Monitor the publish window and make any final edits before the handoff goes live.",
    Published: "Track performance, refresh internal links, and look for follow-up topic opportunities.",
};

export function formatBlogStudioDate(value?: string, includeTime = false) {
    if (!value) {
        return includeTime ? "Not scheduled yet" : "Not set";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return includeTime ? dateTimeFormatter.format(date) : dateOnlyFormatter.format(date);
}

export function getBlogStudioSourceLabel(mode: BlogStudioInputMode) {
    return sourceLabels[mode];
}

export function getBlogStudioPublishModeLabel(mode: BlogStudioPublishMode) {
    return publishModeLabels[mode];
}

export function getBlogStudioTargetTypeLabel(type: BlogStudioTargetType | string) {
    return targetTypeLabels[normalizeBlogStudioTargetType(type, "manual-export")];
}

export function getBlogStudioPostStatusNote(status: BlogStudioPostStatus) {
    return postStatusNotes[status];
}

export function humanizeBlogStudioValue(value?: string) {
    if (!value) {
        return "Not set";
    }

    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function isBlogStudioTrendLed(input: {
    sourceMode?: BlogStudioInputMode;
    trendFocus?: string;
    contentType?: BlogStudioContentType;
}) {
    return input.sourceMode === "trending" ||
        input.contentType === "trend-reaction" ||
        Boolean(input.trendFocus?.trim());
}

export function getBlogStudioTrendBadgeLabel(brief?: Pick<BlogStudioBrief, "sourceMode" | "trendFocus">, contentType?: BlogStudioContentType) {
    if (!brief) {
        return "Trend Led";
    }

    if (brief.sourceMode === "trending") {
        return "Trend Led";
    }

    if (brief.trendFocus?.trim()) {
        return "Trend Blend";
    }

    if (contentType === "trend-reaction") {
        return "Trend Reaction";
    }

    return "Trend Led";
}

type BlogStudioReadinessInput =
    | Pick<BlogStudioQueueReadiness, "readyForApproval" | "blockersCount" | "needsAttention">
    | {
        readyForApproval: boolean;
        blockersCount: number;
        needsAttention?: boolean;
    };

export function getBlogStudioReadinessTone(readiness: BlogStudioReadinessInput) {
    if (readiness.readyForApproval) {
        return "emerald";
    }

    if ((readiness.needsAttention ?? false) || readiness.blockersCount > 0) {
        return "amber";
    }

    return "blue";
}

export function getBlogStudioReadinessLabel(readiness: BlogStudioReadinessInput) {
    if (readiness.readyForApproval) {
        return "Ready For Approval";
    }

    if ((readiness.needsAttention ?? false) || readiness.blockersCount > 0) {
        return "Needs Attention";
    }

    return "In Progress";
}

export function getBlogStudioReadinessSummary(readiness: BlogStudioReadinessInput) {
    if (readiness.readyForApproval) {
        return "All required SEO blockers are clear.";
    }

    if (readiness.blockersCount > 0) {
        return `${readiness.blockersCount} blocker${readiness.blockersCount === 1 ? "" : "s"} to clear`;
    }

    if (readiness.needsAttention ?? false) {
        return "This draft still needs editorial improvements.";
    }

    return "This draft is moving toward approval.";
}

export function getBlogStudioSeoScoreTone(score?: number) {
    if (typeof score !== "number") {
        return "blue";
    }

    if (score >= 90) {
        return "emerald";
    }

    if (score >= 75) {
        return "primary";
    }

    if (score >= 60) {
        return "blue";
    }

    return "amber";
}

export function getBlogStudioBlockerTone(blockersCount: number) {
    return blockersCount > 0 ? "amber" : "emerald";
}

export function getBlogStudioBlockerSummary(blockersCount: number) {
    if (blockersCount === 0) {
        return "No blockers";
    }

    return `${blockersCount} blocker${blockersCount === 1 ? "" : "s"}`;
}

type BlogStudioPublishPackageInput = Pick<
    BlogStudioQueueReadiness,
    "metaDescriptionReady" | "canonicalReady" | "featuredImageAltReady" | "schemaReady"
>;

export function getBlogStudioPublishPackageItems(publishPackage: BlogStudioPublishPackageInput) {
    return [
        {
            key: "meta-description",
            label: "Meta Description",
            ready: publishPackage.metaDescriptionReady,
        },
        {
            key: "canonical",
            label: "Canonical",
            ready: publishPackage.canonicalReady,
        },
        {
            key: "image-alt",
            label: "Image Alt",
            ready: publishPackage.featuredImageAltReady,
        },
        {
            key: "schema",
            label: "Schema",
            ready: publishPackage.schemaReady,
        },
    ];
}
