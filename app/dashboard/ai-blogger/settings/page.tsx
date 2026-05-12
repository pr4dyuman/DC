import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { AIBloggerDatabaseUnavailableState } from "@/components/ai-blogger/AIBloggerDatabaseUnavailableState";
import { AIBloggerSettingsWorkspace } from "@/components/ai-blogger/AIBloggerSettingsWorkspace";
import {
    getBlogStudioPerformanceSyncStatusImpl,
    getBlogStudioSettingsImpl,
    listBlogStudioRunsImpl,
    listBlogStudioSchedulesImpl,
} from "@/lib/actions/ai-blogger";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";

async function loadAIBloggerSettingsPageData() {
    const { access, agency } = await getAIBloggerDashboardContext();

    if (!access.canAccess) {
        return { access, settings: null, schedules: null, syncStatus: null, runs: null };
    }

    const [settings, schedules, syncStatus, runs] = await Promise.all([
        getBlogStudioSettingsImpl(agency.id, agency.name),
        listBlogStudioSchedulesImpl(agency.id, 12),
        getBlogStudioPerformanceSyncStatusImpl(agency.id),
        listBlogStudioRunsImpl(agency.id, 60),
    ]);

    return { access, settings, schedules, syncStatus, runs };
}

export default async function AIBloggerSettingsPage() {
    let pageData: Awaited<ReturnType<typeof loadAIBloggerSettingsPageData>>;

    try {
        pageData = await loadAIBloggerSettingsPageData();
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return (
            <AIBloggerDatabaseUnavailableState
                retryHref="/dashboard/ai-blogger/settings"
                message="AI Blogger couldn't load settings because MongoDB is temporarily unavailable."
            />
        );
    }

    if (
        !pageData.access.canAccess ||
        !pageData.settings ||
        !pageData.schedules ||
        !pageData.syncStatus ||
        !pageData.runs
    ) {
        return <AIBloggerLockedState access={pageData.access} />;
    }

    return (
        <>
            <div className="space-y-3 mb-6">
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Settings" }]} />
            </div>
            <AIBloggerSettingsWorkspace
                settings={pageData.settings}
                schedules={pageData.schedules}
                syncStatus={pageData.syncStatus}
                runs={pageData.runs}
            />
        </>
    );
}
