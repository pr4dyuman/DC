import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { AIBloggerDatabaseUnavailableState } from "@/components/ai-blogger/AIBloggerDatabaseUnavailableState";
import { ClusterDashboard } from "@/components/ai-blogger/ClusterDashboard";
import { BlogStudioPostModel, connectDB } from "@/lib/mongodb";
import { analyzeBlogStudioClusters } from "@/lib/ai-blogger-cluster-analysis";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";

export const metadata = {
    title: "Content Clusters | AI Blogger",
    description: "Visualize and manage pillar post clusters and topic relationships",
};

async function loadClusterDashboardPageData() {
    const { access, agency } = await getAIBloggerDashboardContext();

    if (!access.canAccess) {
        return { access, analysis: null };
    }

    await connectDB();

    // Fetch all published posts with cluster info
    const posts = await BlogStudioPostModel.find({
        agencyId: agency.id,
        status: "Published",
    })
        .select(
            "id slug title status publishedAt publishedEntrySlug wordCount seoScore contentClusterId parentTopicSlug internalLinks"
        )
        .lean();

    // Analyze clusters
    const analysis = analyzeBlogStudioClusters(posts);

    return { access, analysis };
}

export default async function ClusterDashboardPage() {
    let pageData: Awaited<ReturnType<typeof loadClusterDashboardPageData>>;

    try {
        pageData = await loadClusterDashboardPageData();
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return (
            <AIBloggerDatabaseUnavailableState
                retryHref="/dashboard/ai-blogger/clusters"
                message="AI Blogger couldn't load cluster analysis because MongoDB is temporarily unavailable."
            />
        );
    }

    if (!pageData.access.canAccess || !pageData.analysis) {
        return <AIBloggerLockedState access={pageData.access} />;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Clusters" }]} />
            </div>
            <ClusterDashboard analysis={pageData.analysis} />
        </div>
    );
}
