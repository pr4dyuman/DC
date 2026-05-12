import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { AIBloggerDatabaseUnavailableState } from "@/components/ai-blogger/AIBloggerDatabaseUnavailableState";
import { AIBloggerPostsWorkspace } from "@/components/ai-blogger/AIBloggerPostsWorkspace";
import {
    getBlogStudioOverviewImpl,
    listBlogStudioPostsPageImpl,
} from "@/lib/actions/ai-blogger";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";
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

async function loadAIBloggerPostsPageData(
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>,
) {
    const [{ access, agency }, resolvedParams] = await Promise.all([
        getAIBloggerDashboardContext(),
        searchParams,
    ]);

    if (!access.canAccess) {
        return { access, postsPage: null, statusSummary: null };
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

    return { access, postsPage, statusSummary };
}

export default async function AIBloggerPostsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    let pageData: Awaited<ReturnType<typeof loadAIBloggerPostsPageData>>;

    try {
        pageData = await loadAIBloggerPostsPageData(searchParams);
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return (
            <AIBloggerDatabaseUnavailableState
                retryHref="/dashboard/ai-blogger/posts"
                message="AI Blogger couldn't load the posts workspace because MongoDB is temporarily unavailable."
            />
        );
    }

    if (!pageData.access.canAccess || !pageData.postsPage || !pageData.statusSummary) {
        return <AIBloggerLockedState access={pageData.access} />;
    }

    return (
        <>
            <div className="space-y-3">
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Posts" }]} />
            </div>
            <AIBloggerPostsWorkspace postsPage={pageData.postsPage} statusSummary={pageData.statusSummary} />
        </>
    );
}
