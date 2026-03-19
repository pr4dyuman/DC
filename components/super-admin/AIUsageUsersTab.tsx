"use client";

import { Clock, Filter, Users } from "lucide-react";

import { EmptyState, SearchInput, SortHeader } from "./AIUsageDashboardPrimitives";
import { activityStatus, fmt, timeAgo, type UserUsage } from "./ai-usage-dashboard-shared";

type UserSortKey = "userName" | "agencyName" | "totalRequests" | "totalTokens" | "lastUsed";

interface Props {
    filteredUsers: UserUsage[];
    userSearch: string;
    onUserSearchChange: (value: string) => void;
    userAgencyFilter: string;
    onUserAgencyFilterChange: (value: string) => void;
    uniqueAgencies: string[];
    userSort: {
        key: UserSortKey;
        asc: boolean;
        toggle: (key: UserSortKey) => void;
    };
}

export function AIUsageUsersTab({
    filteredUsers,
    userSearch,
    onUserSearchChange,
    userAgencyFilter,
    onUserAgencyFilterChange,
    uniqueAgencies,
    userSort,
}: Props) {
    return (
        <div className="bg-card rounded-xl border border-border/60">
            <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">User Usage</h2>
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{filteredUsers.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    {uniqueAgencies.length > 1 && (
                        <div className="relative">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            <select
                                value={userAgencyFilter}
                                onChange={(event) => onUserAgencyFilterChange(event.target.value)}
                                className="pl-8 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                            >
                                <option value="">All agencies</option>
                                {uniqueAgencies.map((agency) => <option key={agency} value={agency}>{agency}</option>)}
                            </select>
                        </div>
                    )}
                    <SearchInput value={userSearch} onChange={onUserSearchChange} placeholder="Search users..." />
                </div>
            </div>
            {filteredUsers.length === 0 ? (
                <EmptyState icon={<Users className="w-8 h-8" />} text={userSearch || userAgencyFilter ? "No users match your filters" : "No user usage data"} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/60 bg-muted/20">
                                <SortHeader label="User" sortKey="userName" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} />
                                <SortHeader label="Agency" sortKey="agencyName" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} />
                                <SortHeader label="Requests" sortKey="totalRequests" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} align="right" />
                                <SortHeader label="Tokens" sortKey="totalTokens" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} align="right" />
                                <th className="text-right py-3 px-4 text-muted-foreground font-medium text-[11px] uppercase tracking-wider">I/O Split</th>
                                <SortHeader label="Last Active" sortKey="lastUsed" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} align="right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filteredUsers.map((user) => {
                                const status = activityStatus(user.lastUsed);
                                const ioPct = user.totalTokens > 0 ? (user.inputTokens / user.totalTokens) * 100 : 50;
                                return (
                                    <tr key={user.userId} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/10 border border-border/60 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                                                        {user.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${status === "active" ? "bg-emerald-500" : status === "recent" ? "bg-amber-500" : "bg-gray-400"}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-foreground truncate">{user.userName}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate">{user.userEmail}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-muted-foreground">{user.agencyName}</td>
                                        <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmt(user.totalRequests)}</td>
                                        <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmt(user.totalTokens)}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 flex h-1.5 rounded-full overflow-hidden bg-muted/40">
                                                    <div className="bg-blue-400 h-full" style={{ width: `${ioPct}%` }} />
                                                    <div className="bg-violet-400 h-full" style={{ width: `${100 - ioPct}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                <span>{timeAgo(user.lastUsed)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
