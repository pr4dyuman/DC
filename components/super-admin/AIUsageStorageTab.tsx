"use client";

import { AlertTriangle, HardDrive } from "lucide-react";

import { EmptyState, PlanBadge, SortHeader } from "./AIUsageDashboardPrimitives";
import { fmtBytes, type StorageData } from "./ai-usage-dashboard-shared";

type StorageSortKey = "agencyName" | "storageUsed" | "storageLimit";

interface Props {
    sortedStorage: StorageData[];
    totalStorageUsed: number;
    totalStorageLimit: number;
    storageWarningCount: number;
    storageSort: {
        key: StorageSortKey;
        asc: boolean;
        toggle: (key: StorageSortKey) => void;
    };
}

export function AIUsageStorageTab({
    sortedStorage,
    totalStorageUsed,
    totalStorageLimit,
    storageWarningCount,
    storageSort,
}: Props) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card rounded-xl border border-border/60 p-5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Used</p>
                    <p className="text-2xl font-bold text-foreground mt-1 font-mono">{fmtBytes(totalStorageUsed)}</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div
                            className="h-1.5 bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${totalStorageLimit > 0 ? Math.min((totalStorageUsed / totalStorageLimit) * 100, 100) : 0}%` }}
                        />
                    </div>
                </div>
                <div className="bg-card rounded-xl border border-border/60 p-5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Capacity</p>
                    <p className="text-2xl font-bold text-foreground mt-1 font-mono">{fmtBytes(totalStorageLimit)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-mono text-emerald-500">{fmtBytes(totalStorageLimit - totalStorageUsed)}</span> available
                    </p>
                </div>
                <div className="bg-card rounded-xl border border-border/60 p-5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Warnings</p>
                    <p className={`text-2xl font-bold mt-1 font-mono ${storageWarningCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                        {storageWarningCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {storageWarningCount > 0
                            ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Agencies above 80%</span>
                            : "All agencies healthy"}
                    </p>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border/60">
                <div className="p-4 border-b border-border/60 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-500" />
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Storage per Agency</h2>
                </div>
                {sortedStorage.length === 0 ? (
                    <EmptyState icon={<HardDrive className="w-8 h-8" />} text="No storage data available" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/20">
                                    <SortHeader label="Agency" sortKey="agencyName" currentKey={storageSort.key} asc={storageSort.asc} onSort={storageSort.toggle} />
                                    <SortHeader label="Used" sortKey="storageUsed" currentKey={storageSort.key} asc={storageSort.asc} onSort={storageSort.toggle} align="right" />
                                    <SortHeader label="Limit" sortKey="storageLimit" currentKey={storageSort.key} asc={storageSort.asc} onSort={storageSort.toggle} align="right" />
                                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-[11px] uppercase tracking-wider w-48">Usage</th>
                                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-[11px] uppercase tracking-wider">Plan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {sortedStorage.map((storageItem) => {
                                    const pct = storageItem.storageLimit > 0 ? (storageItem.storageUsed / storageItem.storageLimit) * 100 : 0;
                                    const isWarning = pct > 80;
                                    const isCritical = pct > 90;
                                    return (
                                        <tr key={storageItem.agencyId} className={`transition-colors ${isCritical ? "bg-red-500/[0.03] hover:bg-red-500/[0.06]" : isWarning ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]" : "hover:bg-muted/20"}`}>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-border/60 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                                        {storageItem.agencyName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-foreground flex items-center gap-2 truncate">
                                                            {storageItem.agencyName}
                                                            {isCritical && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                                                            {isWarning && !isCritical && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">{storageItem.agencySlug}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmtBytes(storageItem.storageUsed)}</td>
                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmtBytes(storageItem.storageLimit)}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-muted rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-500 ${isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-mono font-semibold w-10 text-right ${isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}>
                                                        {pct.toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <PlanBadge plan={storageItem.plan} />
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
