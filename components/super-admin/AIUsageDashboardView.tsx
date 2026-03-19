"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
    BarChart3,
    Brain,
    Building2,
    CheckCircle2,
    HardDrive,
    Server,
    Sparkles,
    Users,
    Zap,
} from "lucide-react";

import { AIUsageAgenciesTab } from "./AIUsageAgenciesTab";
import { AIUsageOverviewTab } from "./AIUsageOverviewTab";
import { AIUsageStorageTab } from "./AIUsageStorageTab";
import { AIUsageUsersTab } from "./AIUsageUsersTab";
import {
    fmt,
    type AgencyUsage,
    type OverviewData,
    type StorageData,
    type Tab,
    type UserUsage,
} from "./ai-usage-dashboard-shared";

interface Props {
    overview: OverviewData;
    byAgency: AgencyUsage[];
    byUser: UserUsage[];
    storage: StorageData[];
}

function useSort<T extends string>(defaultKey: T) {
    const [key, setKey] = useState<T>(defaultKey);
    const [asc, setAsc] = useState(false);

    function toggle(nextKey: T) {
        if (key === nextKey) setAsc((value) => !value);
        else {
            setKey(nextKey);
            setAsc(false);
        }
    }

    return { key, asc, toggle };
}

export default function AIUsageDashboardView({ overview, byAgency, byUser, storage }: Props) {
    const [tab, setTab] = useState<Tab>("overview");
    const [agencySearch, setAgencySearch] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [userAgencyFilter, setUserAgencyFilter] = useState("");

    const agencySort = useSort<"agencyName" | "totalRequests" | "totalTokens" | "inputTokens" | "outputTokens">("totalRequests");
    const userSort = useSort<"userName" | "agencyName" | "totalRequests" | "totalTokens" | "lastUsed">("totalRequests");
    const storageSort = useSort<"agencyName" | "storageUsed" | "storageLimit">("storageUsed");

    const { totals, byFeature, byDay, byProvider } = overview;
    const successRate = totals.totalRequests > 0
        ? ((totals.successCount / totals.totalRequests) * 100).toFixed(1)
        : "100";
    const avgTokensPerRequest = totals.totalRequests > 0
        ? Math.round(totals.totalTokens / totals.totalRequests)
        : 0;
    const totalFeatureRequests = byFeature.reduce((sum, feature) => sum + feature.requests, 0);
    const maxDayRequests = byDay.length > 0 ? Math.max(...byDay.map((day) => day.requests)) : 1;
    const maxDayTokens = byDay.length > 0 ? Math.max(...byDay.map((day) => day.tokens)) : 1;

    const uniqueAgencies = useMemo(
        () => [...new Set(byUser.map((user) => user.agencyName))].sort(),
        [byUser],
    );

    const filteredAgencies = useMemo(() => {
        let list = [...byAgency];
        if (agencySearch) {
            const query = agencySearch.toLowerCase();
            list = list.filter((agency) =>
                agency.agencyName.toLowerCase().includes(query) ||
                agency.agencySlug.toLowerCase().includes(query),
            );
        }

        return list.sort((left, right) => {
            const multiplier = agencySort.asc ? 1 : -1;
            if (agencySort.key === "agencyName") {
                return multiplier * left.agencyName.localeCompare(right.agencyName);
            }
            return multiplier * ((left[agencySort.key] || 0) - (right[agencySort.key] || 0));
        });
    }, [agencySearch, agencySort.asc, agencySort.key, byAgency]);

    const filteredUsers = useMemo(() => {
        let list = [...byUser];
        if (userSearch) {
            const query = userSearch.toLowerCase();
            list = list.filter((user) =>
                user.userName.toLowerCase().includes(query) ||
                user.userEmail.toLowerCase().includes(query),
            );
        }
        if (userAgencyFilter) {
            list = list.filter((user) => user.agencyName === userAgencyFilter);
        }

        return list.sort((left, right) => {
            const multiplier = userSort.asc ? 1 : -1;
            if (userSort.key === "userName") return multiplier * left.userName.localeCompare(right.userName);
            if (userSort.key === "agencyName") return multiplier * left.agencyName.localeCompare(right.agencyName);
            if (userSort.key === "lastUsed") return multiplier * ((left.lastUsed || "").localeCompare(right.lastUsed || ""));
            return multiplier * ((left[userSort.key as "totalRequests" | "totalTokens"] || 0) - (right[userSort.key as "totalRequests" | "totalTokens"] || 0));
        });
    }, [byUser, userAgencyFilter, userSearch, userSort.asc, userSort.key]);

    const sortedStorage = useMemo(
        () => [...storage].sort((left, right) => {
            const multiplier = storageSort.asc ? 1 : -1;
            if (storageSort.key === "agencyName") {
                return multiplier * left.agencyName.localeCompare(right.agencyName);
            }
            return multiplier * ((left[storageSort.key] || 0) - (right[storageSort.key] || 0));
        }),
        [storage, storageSort.asc, storageSort.key],
    );

    const totalStorageUsed = storage.reduce((sum, item) => sum + item.storageUsed, 0);
    const totalStorageLimit = storage.reduce((sum, item) => sum + item.storageLimit, 0);
    const storageWarningCount = storage.filter((item) => item.storageLimit > 0 && (item.storageUsed / item.storageLimit) > 0.8).length;

    const topAgency = byAgency.length > 0
        ? byAgency.reduce((left, right) => left.totalRequests > right.totalRequests ? left : right)
        : null;
    const maxAgencyRequests = topAgency?.totalRequests || 1;
    const totalProviderRequests = byProvider.reduce((sum, provider) => sum + provider.requests, 0);

    const tabs: { id: Tab; label: string; icon: ReactNode; count?: number; badge?: string }[] = [
        { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
        { id: "agencies", label: "Agencies", icon: <Building2 className="w-4 h-4" />, count: byAgency.length },
        { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, count: byUser.length },
        { id: "storage", label: "Storage", icon: <HardDrive className="w-4 h-4" />, count: storage.length, badge: storageWarningCount > 0 ? `${storageWarningCount} \u26A0` : undefined },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    icon={<Zap className="w-[18px] h-[18px]" />}
                    gradient="from-amber-500/20 to-orange-500/10"
                    iconColor="text-amber-500"
                    label="Total Requests"
                    value={fmt(totals.totalRequests)}
                    sub={`Last ${overview.days} days`}
                />
                <StatCard
                    icon={<Brain className="w-[18px] h-[18px]" />}
                    gradient="from-purple-500/20 to-violet-500/10"
                    iconColor="text-purple-500"
                    label="Total Tokens"
                    value={fmt(totals.totalTokens)}
                    sub={`~${fmt(avgTokensPerRequest)} per request`}
                />
                <StatCard
                    icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
                    gradient="from-emerald-500/20 to-green-500/10"
                    iconColor="text-emerald-500"
                    label="Success Rate"
                    value={`${successRate}%`}
                    sub={`${totals.errorCount} error${totals.errorCount !== 1 ? "s" : ""}`}
                />
                <StatCard
                    icon={<Server className="w-[18px] h-[18px]" />}
                    gradient="from-blue-500/20 to-indigo-500/10"
                    iconColor="text-blue-500"
                    label="Providers"
                    value={byProvider.length.toString()}
                    sub={byProvider.map((provider) => provider._id || "unknown").join(", ")}
                />
                <StatCard
                    icon={<Building2 className="w-[18px] h-[18px]" />}
                    gradient="from-cyan-500/20 to-teal-500/10"
                    iconColor="text-cyan-500"
                    label="Active Agencies"
                    value={byAgency.length.toString()}
                    sub={`${byUser.length} total users`}
                />
                <StatCard
                    icon={<Sparkles className="w-[18px] h-[18px]" />}
                    gradient="from-pink-500/20 to-rose-500/10"
                    iconColor="text-pink-500"
                    label="AI Features"
                    value={byFeature.length.toString()}
                    sub={`${byFeature.length} features active`}
                />
            </div>

            <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border/60 backdrop-blur-sm">
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${tab === item.id
                            ? "bg-background text-foreground shadow-sm border border-border/80"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                    >
                        {item.icon}
                        <span className="hidden sm:inline">{item.label}</span>
                        {item.count !== undefined && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab === item.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {item.count}
                            </span>
                        )}
                        {item.badge && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {tab === "overview" && (
                <AIUsageOverviewTab
                    overview={overview}
                    totalFeatureRequests={totalFeatureRequests}
                    totalProviderRequests={totalProviderRequests}
                    maxDayRequests={maxDayRequests}
                    maxDayTokens={maxDayTokens}
                />
            )}

            {tab === "agencies" && (
                <AIUsageAgenciesTab
                    topAgency={topAgency}
                    filteredAgencies={filteredAgencies}
                    agencySearch={agencySearch}
                    onAgencySearchChange={setAgencySearch}
                    agencySort={agencySort}
                    maxAgencyRequests={maxAgencyRequests}
                />
            )}

            {tab === "users" && (
                <AIUsageUsersTab
                    filteredUsers={filteredUsers}
                    userSearch={userSearch}
                    onUserSearchChange={setUserSearch}
                    userAgencyFilter={userAgencyFilter}
                    onUserAgencyFilterChange={setUserAgencyFilter}
                    uniqueAgencies={uniqueAgencies}
                    userSort={userSort}
                />
            )}

            {tab === "storage" && (
                <AIUsageStorageTab
                    sortedStorage={sortedStorage}
                    totalStorageUsed={totalStorageUsed}
                    totalStorageLimit={totalStorageLimit}
                    storageWarningCount={storageWarningCount}
                    storageSort={storageSort}
                />
            )}
        </div>
    );
}

function StatCard({ icon, gradient, iconColor, label, value, sub }: {
    icon: ReactNode;
    gradient: string;
    iconColor: string;
    label: string;
    value: string;
    sub: string;
}) {
    return (
        <div className="bg-card rounded-xl border border-border/60 p-5 hover:border-border transition-colors group">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1.5 font-mono leading-none">{value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>
                </div>
                <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
