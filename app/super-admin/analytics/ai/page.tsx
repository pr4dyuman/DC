import { getAIUsageOverview, getAIUsageByAgency, getStorageByAgency } from "@/lib/actions/super-admin";
import AIUsageDashboard from "@/components/super-admin/AIUsageDashboard";

export default async function AIUsagePage() {
    const [overview, byAgency, storage] = await Promise.all([
        getAIUsageOverview(30),
        getAIUsageByAgency(30),
        getStorageByAgency(),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">AI Usage Monitor</h1>
                <p className="text-muted-foreground mt-1">Track AI requests, token consumption, and storage usage across all agencies</p>
            </div>
            <AIUsageDashboard
                overview={overview}
                byAgency={byAgency}
                storage={storage}
            />
        </div>
    );
}
