import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { AIBloggerSettingsWorkspace } from "@/components/ai-blogger/AIBloggerSettingsWorkspace";
import {
    getBlogStudioPerformanceSyncStatusImpl,
    getBlogStudioSettingsImpl,
    listBlogStudioRunsImpl,
    listBlogStudioSchedulesImpl,
} from "@/lib/actions/ai-blogger";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";

export default async function AIBloggerSettingsPage() {
    const { access, agency } = await getAIBloggerDashboardContext();

    if (!access.canAccess) {
        return <AIBloggerLockedState access={access} />;
    }

    const [settings, schedules, syncStatus, runs] = await Promise.all([
        getBlogStudioSettingsImpl(agency.id, agency.name),
        listBlogStudioSchedulesImpl(agency.id, 12),
        getBlogStudioPerformanceSyncStatusImpl(agency.id),
        listBlogStudioRunsImpl(agency.id, 60),
    ]);

    return (
        <>
            <div className="space-y-3 mb-6">
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Settings" }]} />
            </div>
            <AIBloggerSettingsWorkspace settings={settings} schedules={schedules} syncStatus={syncStatus} runs={runs} />
        </>
    );
}
