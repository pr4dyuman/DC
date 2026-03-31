import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { AIBloggerPostsWorkspace } from "@/components/ai-blogger/AIBloggerPostsWorkspace";
import {
    getBlogStudioOverviewImpl,
    listBlogStudioPostsPageImpl,
} from "@/lib/actions/ai-blogger";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import type { BlogStudioPostListFilter, BlogStudioPostSortBy, BlogStudioPostSortOrder } from "@/lib/types";

function readStringParam(
    value: string | string[] | undefined,
    fallback = "",
) {
    if (typeof value === "string") {
        return value;
    }

    return fallback;
}

function normalizeFilter(value: string): BlogStudioPostListFilter {
    if (
        value === "draft" ||
        value === "review" ||
        value === "approved" ||
        value === "scheduled" ||
        value === "published"
    ) {
        return value;
    }

    return "all";
}

function normalizePage(value: string) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeRefreshReason(value: string) {
    if (
        value === "low-ctr" ||
        value === "position-opportunity" ||
        value === "visibility-decay" ||
        value === "stale-content" ||
        value === "no-recent-sync" ||
        value === "no-snapshot"
    ) {
        return value;
    }

    return "";
}

function normalizeRefreshSort(value: string) {
    if (
        value === "refresh-score" ||
        value === "click-loss" ||
        value === "impression-loss" ||
        value === "sync-lag"
    ) {
        return value;
    }

    return "refresh-score";
}

const validSortByValues = new Set<BlogStudioPostSortBy>(["updatedAt", "createdAt", "seoScore", "wordCount", "title"]);

function normalizeSortBy(value: string): BlogStudioPostSortBy {
    return validSortByValues.has(value as BlogStudioPostSortBy)
        ? (value as BlogStudioPostSortBy)
        : "updatedAt";
}

function normalizeSortOrder(value: string): BlogStudioPostSortOrder {
    return value === "asc" ? "asc" : "desc";
}

export default async function AIBloggerPostsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const [{ access, agency }, resolvedParams] = await Promise.all([
        getAIBloggerDashboardContext(),
        searchParams,
    ]);

    if (!access.canAccess) {
        return <AIBloggerLockedState access={access} />;
    }

    const query = readStringParam(resolvedParams.q).trim();
    const filter = normalizeFilter(readStringParam(resolvedParams.filter, "all"));
    const page = normalizePage(readStringParam(resolvedParams.page, "1"));
    const targetType = readStringParam(resolvedParams.targetType);
    const sourceMode = readStringParam(resolvedParams.sourceMode);
    const searchIntent = readStringParam(resolvedParams.searchIntent);
    const contentType = readStringParam(resolvedParams.contentType);
    const needsAttention = readStringParam(resolvedParams.needsAttention) === "true";
    const refreshReason = normalizeRefreshReason(readStringParam(resolvedParams.refreshReason));
    const refreshSort = normalizeRefreshSort(readStringParam(resolvedParams.refreshSort, "refresh-score"));
    const sortBy = normalizeSortBy(readStringParam(resolvedParams.sortBy, "updatedAt"));
    const sortOrder = normalizeSortOrder(readStringParam(resolvedParams.sortOrder, "desc"));

    const [overview, postsPage] = await Promise.all([
        getBlogStudioOverviewImpl(agency.id, agency.name),
        listBlogStudioPostsPageImpl(agency.id, agency.name, {
            query,
            filter,
            page,
            pageSize: 12,
            targetType,
            sourceMode,
            searchIntent,
            contentType,
            needsAttention,
            refreshReason: refreshReason || undefined,
            refreshSort,
            sortBy,
            sortOrder,
        }),
    ]);

    const statusSummary = [
        {
            label: "Draft Queue",
            value: overview.statusCounts.Draft + overview.statusCounts.Research,
            status: "Draft" as const,
            tone: "primary" as const,
        },
        {
            label: "SEO Review",
            value: overview.statusCounts["SEO Review"],
            status: "SEO Review" as const,
            tone: "violet" as const,
        },
        {
            label: "Approved",
            value: overview.statusCounts.Approved,
            status: "Approved" as const,
            tone: "emerald" as const,
        },
        {
            label: "Scheduled",
            value: overview.statusCounts.Scheduled,
            status: "Scheduled" as const,
            tone: "blue" as const,
        },
    ];

    return (
        <>
            <div className="space-y-3">
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Posts" }]}/>
            </div>
            <AIBloggerPostsWorkspace postsPage={postsPage} statusSummary={statusSummary} />
        </>
    );
}
