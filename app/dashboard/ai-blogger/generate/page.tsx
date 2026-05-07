import { AIBloggerDraftBuilder } from "@/components/ai-blogger/AIBloggerDraftBuilder";
import { AIBloggerDatabaseUnavailableState } from "@/components/ai-blogger/AIBloggerDatabaseUnavailableState";
import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { getBlogStudioSettingsImpl } from "@/lib/actions/ai-blogger";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";
import { getAgencyAIBloggerConfigServer } from "@/lib/utils-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AIBloggerGeneratePage() {
    try {
        const { access, agency } = await getAIBloggerDashboardContext();

        if (!access.canAccess) {
            return <AIBloggerLockedState access={access} />;
        }

        const [settings, aiBloggerConfig] = await Promise.all([
            getBlogStudioSettingsImpl(agency.id, agency.name),
            getAgencyAIBloggerConfigServer(),
        ]);

        return (
            <div className="flex flex-col min-h-screen">
                <div className="space-y-3">
                    <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Generate" }]} />
                </div>
                <AIBloggerDraftBuilder
                    settings={settings}
                    trendPlan={{
                        liveTrendsEnabled: aiBloggerConfig?.trends?.enabled ?? false,
                        fallbackToAi: aiBloggerConfig?.trends?.fallbackToAi ?? true,
                        defaultLocation: aiBloggerConfig?.trends?.defaultLocation ?? settings.seo.defaultLocation,
                        trendFirstMode: aiBloggerConfig?.trends?.trendFirstMode ?? true,
                        maxTrendRequestsPerBlog: aiBloggerConfig?.trends?.maxTrendRequestsPerBlog ?? 8,
                    }}
                    serpPlan={{
                        enabled: aiBloggerConfig?.serp?.enabled ?? false,
                        device: aiBloggerConfig?.serp?.device || "desktop",
                        defaultLocation: aiBloggerConfig?.serp?.defaultLocation ?? settings.seo.defaultLocation,
                    }}
                    crawlPlan={{
                        enabled: aiBloggerConfig?.crawl?.enabled ?? true,
                        maxPages: aiBloggerConfig?.crawl?.maxPages ?? 4,
                        refreshWindowHours: aiBloggerConfig?.crawl?.refreshWindowHours ?? 24,
                    }}
                    groundedResearchPlan={{
                        enabled: aiBloggerConfig?.groundedResearch?.enabled ?? false,
                        trustPreference: aiBloggerConfig?.groundedResearch?.trustPreference || "balanced",
                        freshnessPreference: aiBloggerConfig?.groundedResearch?.freshnessPreference || "balanced",
                    }}
                    pagePerformancePlan={{
                        enabled: aiBloggerConfig?.pagePerformance?.enabled ?? false,
                        provider: aiBloggerConfig?.pagePerformance?.provider || "pagespeed",
                        strategy: aiBloggerConfig?.pagePerformance?.strategy || "mobile",
                        performanceThreshold: aiBloggerConfig?.pagePerformance?.performanceThreshold ?? 75,
                        refreshWindowHours: aiBloggerConfig?.pagePerformance?.refreshWindowHours ?? 24,
                    }}
                    publishRulesPlan={{
                        minimumSeoScore: aiBloggerConfig?.publishRules?.minimumSeoScore ?? 80,
                        requireInternalLinks: aiBloggerConfig?.publishRules?.requireInternalLinks ?? true,
                        requireMetaDescription: aiBloggerConfig?.publishRules?.requireMetaDescription ?? true,
                        requireFaqForInformational: aiBloggerConfig?.publishRules?.requireFaqForInformational ?? false,
                        requireCanonicalUrl: aiBloggerConfig?.publishRules?.requireCanonicalUrl ?? true,
                        requireImageAltText: aiBloggerConfig?.publishRules?.requireImageAltText ?? true,
                        requireManualApproval: aiBloggerConfig?.publishRules?.requireManualApproval ?? settings.publishing.requireApproval,
                        requireSchemaMarkup: aiBloggerConfig?.publishRules?.requireSchemaMarkup ?? true,
                    }}
                />
            </div>
        );
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return (
            <AIBloggerDatabaseUnavailableState
                retryHref="/dashboard/ai-blogger/generate"
                message="AI Blogger couldn't load the generate workspace because MongoDB is temporarily unavailable."
            />
        );
    }
}
