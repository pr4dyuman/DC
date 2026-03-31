import Link from "next/link";
import { redirect } from "next/navigation";
import { Brain, Building2, ChevronRight, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getAllAgenciesWithStats } from "@/lib/actions/super-admin";
import { getBlogStudioOverviewImpl } from "@/lib/actions/ai-blogger";
import { getAIBloggerSuperAdminContext } from "@/lib/ai-blogger-superadmin";

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

export default async function SuperAdminAIBloggerPage() {
    const { agency } = await getAIBloggerSuperAdminContext();

    if (agency) {
        redirect(`/super-admin/ai-blogger/agency/${agency.id}`);
    }

    const agencies = await getAllAgenciesWithStats();
    const agencyOverviewEntries = await Promise.all(
        agencies.map(async (item) => [
            item.id,
            item.features?.aiBlogger ? await getBlogStudioOverviewImpl(item.id, item.name) : null,
        ] as const),
    );
    const overviewByAgencyId = new Map(agencyOverviewEntries);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg">
                        <Brain className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">AI Blogger Admin</h1>
                        <p className="mt-1 max-w-3xl text-muted-foreground">
                            Separate superadmin area for AI Blogger pipeline keys, live trends provider keys, models, fallback keys, and prompts.
                            Choose an agency to manage its dedicated blog generation setup.
                        </p>
                    </div>
                </div>

                <Badge variant="outline" className="gap-1 rounded-full px-3 py-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Separate from system AI settings
                </Badge>
            </div>

            <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm leading-6 text-muted-foreground">
                This super-admin workspace is config-first today. Use it to select an agency, review readiness, and manage AI Blogger setup without touching the rest of the dashboard workflow.
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">Agencies</h2>
                        <p className="text-sm text-muted-foreground">
                            Open the dedicated AI Blogger admin for the agency you want to configure.
                        </p>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {agencies.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                            {(() => {
                                const overview = overviewByAgencyId.get(item.id) || null;

                                return (
                                    <>
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                                        {item.plan.toUpperCase()}
                                    </span>
                                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                                        {item.status}
                                    </span>
                                    {item.features?.aiBlogger ? (
                                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-300">
                                            AI Blogger on
                                        </span>
                                    ) : (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                                            AI Blogger off
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <Building2 className="h-3.5 w-3.5" />
                                        {item.stats.users} users
                                    </span>
                                    <span>{item.stats.projects} projects</span>
                                    <span>{item.stats.clients} clients</span>
                                    {overview ? (
                                        <>
                                            <span>{formatCompactNumber(overview.metrics.publishedPosts)} published</span>
                                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                                                <TrendingUp className="h-3.5 w-3.5" />
                                                {overview.metrics.refreshCandidates} refresh
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                                {overview?.refreshQueue.items[0] ? (
                                    <p className="text-xs text-muted-foreground">
                                        Top refresh signal: <span className="font-medium text-foreground">{overview.refreshQueue.items[0].post.title}</span> • {overview.refreshQueue.items[0].refreshOpportunity.summary}
                                    </p>
                                ) : null}
                            </div>

                            <Link
                                href={`/super-admin/ai-blogger/agency/${item.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                            >
                                Manage AI
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                                    </>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
