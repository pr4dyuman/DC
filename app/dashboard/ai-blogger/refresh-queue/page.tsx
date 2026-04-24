import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { AIBloggerDatabaseUnavailableState } from "@/components/ai-blogger/AIBloggerDatabaseUnavailableState";
import { RefreshQueuePage } from "@/components/ai-blogger/RefreshQueuePage";
import { getBlogStudioOverviewImpl } from "@/lib/actions/ai-blogger";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";

export const metadata = {
    title: "Refresh Queue | AI Blogger",
    description: "Manage and prioritize published posts that need performance optimization",
};

export default async function RefreshQueueDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    try {
        const { access, agency } = await getAIBloggerDashboardContext();

        if (!access.canAccess) {
            return <AIBloggerLockedState access={access} />;
        }

        await searchParams;

        const overview = await getBlogStudioOverviewImpl(agency.id, agency.name);

        return (
            <>
                <div className="space-y-3 mb-6">
                    <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Refresh Queue" }]} />
                </div>
                <RefreshQueuePage refreshQueue={overview.refreshQueue} syncStatus={overview.syncStatus} />
            </>
        );
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return (
            <AIBloggerDatabaseUnavailableState
                retryHref="/dashboard/ai-blogger/refresh-queue"
                message="AI Blogger couldn't load the refresh queue because MongoDB is temporarily unavailable."
            />
        );
    }
}
