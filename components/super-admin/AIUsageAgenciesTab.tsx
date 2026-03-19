"use client";

import { Building2, TrendingUp } from "lucide-react";

import { fmt, type AgencyUsage } from "./ai-usage-dashboard-shared";
import { EmptyState, PlanBadge, SearchInput, SortHeader } from "./AIUsageDashboardPrimitives";

type AgencySortKey = "agencyName" | "totalRequests" | "totalTokens" | "inputTokens" | "outputTokens";

type AIUsageAgenciesTabProps = {
    topAgency: AgencyUsage | null;
    filteredAgencies: AgencyUsage[];
    agencySearch: string;
    onAgencySearchChange: (value: string) => void;
    agencySort: {
        key: AgencySortKey;
        asc: boolean;
        toggle: (key: AgencySortKey) => void;
    };
    maxAgencyRequests: number;
};

export function AIUsageAgenciesTab({
    topAgency,
    filteredAgencies,
    agencySearch,
    onAgencySearchChange,
    agencySort,
    maxAgencyRequests,
}: AIUsageAgenciesTabProps) {
    return (
        <div className="space-y-4">
            {topAgency && (
                <div className="bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent rounded-xl border border-primary/20 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                            {topAgency.agencyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Top Consumer</span>
                                <TrendingUp className="w-3 h-3 text-primary" />
                            </div>
                            <p className="text-foreground font-semibold mt-0.5">{topAgency.agencyName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                        <div>
                            <p className="text-lg font-bold font-mono text-foreground">{fmt(topAgency.totalRequests)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">Requests</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono text-foreground">{fmt(topAgency.totalTokens)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">Tokens</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-card rounded-xl border border-border/60">
                <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Agency Usage</h2>
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{filteredAgencies.length}</span>
                    </div>
                    <SearchInput value={agencySearch} onChange={onAgencySearchChange} placeholder="Search agencies..." />
                </div>
                {filteredAgencies.length === 0 ? (
                    <EmptyState icon={<Building2 className="w-8 h-8" />} text={agencySearch ? "No agencies match your search" : "No agency usage data"} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/20">
                                    <SortHeader label="Agency" sortKey="agencyName" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} />
                                    <SortHeader label="Requests" sortKey="totalRequests" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                    <SortHeader label="Total Tokens" sortKey="totalTokens" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                    <SortHeader label="Input" sortKey="inputTokens" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                    <SortHeader label="Output" sortKey="outputTokens" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-[11px] uppercase tracking-wider">Plan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filteredAgencies.map((agency) => {
                                    const reqPct = maxAgencyRequests > 0 ? (agency.totalRequests / maxAgencyRequests) * 100 : 0;
                                    return (
                                        <tr key={agency.agencyId} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border/60 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                                        {agency.agencyName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-foreground truncate">{agency.agencyName}</div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">{agency.agencySlug}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-mono font-semibold text-foreground">{fmt(agency.totalRequests)}</span>
                                                    <div className="w-16 h-1 bg-muted rounded-full">
                                                        <div className="h-1 bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${reqPct}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmt(agency.totalTokens)}</td>
                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmt(agency.inputTokens)}</td>
                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmt(agency.outputTokens)}</td>
                                            <td className="py-3 px-4 text-right">
                                                <PlanBadge plan={agency.plan} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
