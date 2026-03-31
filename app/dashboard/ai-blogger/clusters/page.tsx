import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { ClusterDashboard } from "@/components/ai-blogger/ClusterDashboard";
import { BlogStudioPostModel, connectDB } from "@/lib/mongodb";
import { analyzeBlogStudioClusters } from "@/lib/ai-blogger-cluster-analysis";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";

export const metadata = {
    title: "Content Clusters | AI Blogger",
    description: "Visualize and manage pillar post clusters and topic relationships",
};

export default async function ClusterDashboardPage() {
    const { access, agency } = await getAIBloggerDashboardContext();

    if (!access.canAccess) {
        return <AIBloggerLockedState access={access} />;
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

    return (
        <div className="flex flex-col">
            <div className="px-4 sm:px-6 py-6">
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Clusters" }]} />
            </div>
            <ClusterDashboard analysis={analysis} />
        </div>
    );
}
