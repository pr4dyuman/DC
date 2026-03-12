"use client";

import { useState } from "react";
import { Brain, Zap, Database, TrendingUp, Server, HardDrive, ChevronDown, ChevronUp, ArrowUpDown, Users, Building2, BarChart3, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type OverviewData = {
    totals: { totalRequests: number; totalInputTokens: number; totalOutputTokens: number; totalTokens: number; successCount: number; errorCount: number };
    byFeature: { _id: string; requests: number; totalTokens: number; inputTokens: number; outputTokens: number }[];
    byDay: { _id: string; requests: number; tokens: number }[];
    byProvider: { _id: string; requests: number; totalTokens: number }[];
    days: number;
};

type AgencyUsage = {
    agencyId: string;
    agencyName: string;
    agencySlug: string;
    plan: string;
    storageUsed: number;
    storageLimit: number;
    totalRequests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
};

type UserUsage = {
    userId: string;
    userName: string;
    userEmail: string;
    agencyName: string;
    totalRequests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    lastUsed: string | null;
};

type StorageData = {
    agencyId: string;
    agencyName: string;
    agencySlug: string;
    plan: string;
    storageUsed: number;
    storageLimit: number;
};

const FEATURE_LABELS: Record<string, string> = {
    'singularity-agent': 'Singularity Agent',
    'singularity-chat': 'Singularity Chat',
    'ai-explain': 'AI Explain',
    'ai-enhance': 'AI Enhance',
    'ai-task-chat': 'AI Task Chat',
    'ai-chatbot': 'AI Chatbot',
    'ai-hour-estimate': 'Hour Estimate',
};

const FEATURE_COLORS: Record<string, string> = {
    'singularity-agent': 'bg-purple-500',
    'singularity-chat': 'bg-blue-500',
    'ai-explain': 'bg-emerald-500',
    'ai-enhance': 'bg-yellow-500',
    'ai-task-chat': 'bg-pink-500',
    'ai-chatbot': 'bg-cyan-500',
    'ai-hour-estimate': 'bg-orange-500',
};

const FEATURE_BADGE_COLORS: Record<string, string> = {
    'singularity-agent': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    'singularity-chat': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'ai-explain': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'ai-enhance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    'ai-task-chat': 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    'ai-chatbot': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    'ai-hour-estimate': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const PROVIDER_COLORS: Record<string, string> = {
    gemini: 'bg-blue-500',
    openai: 'bg-green-500',
    nvidia: 'bg-green-600',
    github: 'bg-gray-500',
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
    overview: OverviewData;
    byAgency: AgencyUsage[];
    byUser: UserUsage[];
    storage: StorageData[];
}

type Tab = 'overview' | 'agencies' | 'users' | 'storage';
type AgencySortKey = 'agencyName' | 'totalRequests' | 'totalTokens' | 'inputTokens' | 'outputTokens';
type UserSortKey = 'userName' | 'agencyName' | 'totalRequests' | 'totalTokens' | 'lastUsed';
type StorageSortKey = 'agencyName' | 'storageUsed' | 'storageLimit';

function useSort<T extends string>(defaultKey: T) {
    const [key, setKey] = useState<T>(defaultKey);
    const [asc, setAsc] = useState(false);
    function toggle(k: T) {
        if (key === k) setAsc(v => !v);
        else { setKey(k); setAsc(false); }
    }
    return { key, asc, toggle };
}

export default function AIUsageDashboard({ overview, byAgency, byUser, storage }: Props) {
    const [tab, setTab] = useState<Tab>('overview');
    const agencySort = useSort<AgencySortKey>('totalRequests');
    const userSort = useSort<UserSortKey>('totalRequests');
    const storageSort = useSort<StorageSortKey>('storageUsed');

    const { totals, byFeature, byDay, byProvider } = overview;
    const successRate = totals.totalRequests > 0
        ? ((totals.successCount / totals.totalRequests) * 100).toFixed(1)
        : '100';

    const totalFeatureRequests = byFeature.reduce((s, f) => s + f.requests, 0);
    const maxDayRequests = byDay.length > 0 ? Math.max(...byDay.map(d => d.requests)) : 1;

    const sortedAgencies = [...byAgency].sort((a, b) => {
        const m = agencySort.asc ? 1 : -1;
        if (agencySort.key === 'agencyName') return m * a.agencyName.localeCompare(b.agencyName);
        return m * ((a[agencySort.key] || 0) - (b[agencySort.key] || 0));
    });

    const sortedUsers = [...byUser].sort((a, b) => {
        const m = userSort.asc ? 1 : -1;
        if (userSort.key === 'userName') return m * a.userName.localeCompare(b.userName);
        if (userSort.key === 'agencyName') return m * a.agencyName.localeCompare(b.agencyName);
        if (userSort.key === 'lastUsed') return m * ((a.lastUsed || '').localeCompare(b.lastUsed || ''));
        return m * ((a[userSort.key as 'totalRequests' | 'totalTokens'] || 0) - (b[userSort.key as 'totalRequests' | 'totalTokens'] || 0));
    });

    const sortedStorage = [...storage].sort((a, b) => {
        const m = storageSort.asc ? 1 : -1;
        if (storageSort.key === 'agencyName') return m * a.agencyName.localeCompare(b.agencyName);
        return m * ((a[storageSort.key] || 0) - (b[storageSort.key] || 0));
    });

    const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'agencies', label: 'By Agency', icon: <Building2 className="w-4 h-4" />, count: byAgency.length },
        { id: 'users', label: 'By User', icon: <Users className="w-4 h-4" />, count: byUser.length },
        { id: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" />, count: storage.length },
    ];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Zap className="w-5 h-5" />}
                    iconBg="bg-yellow-500/10 text-yellow-500"
                    label="Total Requests"
                    value={formatNumber(totals.totalRequests)}
                    sub={`Last ${overview.days} days`}
                    trend={null}
                />
                <StatCard
                    icon={<Brain className="w-5 h-5" />}
                    iconBg="bg-purple-500/10 text-purple-500"
                    label="Total Tokens"
                    value={formatNumber(totals.totalTokens)}
                    sub={`In: ${formatNumber(totals.totalInputTokens)} · Out: ${formatNumber(totals.totalOutputTokens)}`}
                    trend={null}
                />
                <StatCard
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    iconBg="bg-green-500/10 text-green-500"
                    label="Success Rate"
                    value={`${successRate}%`}
                    sub={`${totals.errorCount} error${totals.errorCount !== 1 ? 's' : ''}`}
                    trend={null}
                />
                <StatCard
                    icon={<Server className="w-5 h-5" />}
                    iconBg="bg-blue-500/10 text-blue-500"
                    label="Providers Active"
                    value={byProvider.length.toString()}
                    sub={byProvider.map(p => p._id || 'unknown').join(', ')}
                    trend={null}
                />
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit border border-border">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            tab === t.id
                                ? 'bg-background text-foreground shadow-sm border border-border'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t.icon}
                        {t.label}
                        {t.count !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-muted text-muted-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Feature breakdown + Provider side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
                            <h2 className="text-base font-semibold text-foreground mb-5">Usage by Feature</h2>
                            {byFeature.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No AI usage recorded yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {byFeature.map((f) => {
                                        const pct = totalFeatureRequests > 0 ? (f.requests / totalFeatureRequests) * 100 : 0;
                                        return (
                                            <div key={f._id}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${FEATURE_BADGE_COLORS[f._id] || 'bg-muted text-muted-foreground'}`}>
                                                            {FEATURE_LABELS[f._id] || f._id}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="font-mono">{formatNumber(f.requests)} req</span>
                                                        <span className="font-mono text-foreground font-medium">{formatNumber(f.totalTokens)} tok</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${FEATURE_COLORS[f._id] || 'bg-gray-500'}`}
                                                        style={{ width: `${Math.max(pct, 1)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-card rounded-xl border border-border p-6">
                            <h2 className="text-base font-semibold text-foreground mb-5">By Provider</h2>
                            {byProvider.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No data.</p>
                            ) : (
                                <div className="space-y-3">
                                    {byProvider.map((p) => {
                                        const allReq = byProvider.reduce((s, x) => s + x.requests, 0);
                                        const pct = allReq > 0 ? (p.requests / allReq) * 100 : 0;
                                        return (
                                            <div key={p._id}>
                                                <div className="flex justify-between items-center mb-1 text-sm">
                                                    <span className="capitalize font-medium text-foreground">{p._id || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{formatNumber(p.requests)}</span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${PROVIDER_COLORS[p._id] || 'bg-gray-500'}`}
                                                        style={{ width: `${Math.max(pct, 1)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">{formatNumber(p.totalTokens)} tokens</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Trend */}
                    {byDay.length > 0 && (
                        <div className="bg-card rounded-xl border border-border p-6">
                            <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                                Daily Trend — Last {overview.days} Days
                            </h2>
                            <div className="flex items-end gap-1 h-24">
                                {byDay.map((d) => {
                                    const h = maxDayRequests > 0 ? (d.requests / maxDayRequests) * 100 : 0;
                                    return (
                                        <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group relative">
                                            <div
                                                className="w-full bg-primary/80 hover:bg-primary rounded-sm transition-colors cursor-default"
                                                style={{ height: `${Math.max(h, 4)}%` }}
                                            />
                                            {/* Tooltip on hover */}
                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-popover border border-border rounded px-2 py-1 text-xs text-popover-foreground whitespace-nowrap z-10 shadow">
                                                <span className="font-medium">{d._id}</span>
                                                <span>{d.requests} req · {formatNumber(d.tokens)} tok</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                <span>{byDay[0]?._id}</span>
                                <span>{byDay[byDay.length - 1]?._id}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BY AGENCY TAB */}
            {tab === 'agencies' && (
                <div className="bg-card rounded-xl border border-border">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h2 className="text-base font-semibold text-foreground">AI Usage per Agency</h2>
                        <span className="text-xs text-muted-foreground">{byAgency.length} agencies</span>
                    </div>
                    {sortedAgencies.length === 0 ? (
                        <p className="text-muted-foreground text-sm p-6">No agency AI usage recorded yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <SortHeader label="Agency" sortKey="agencyName" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} />
                                        <SortHeader label="Requests" sortKey="totalRequests" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                        <SortHeader label="Total Tokens" sortKey="totalTokens" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                        <SortHeader label="Input" sortKey="inputTokens" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                        <SortHeader label="Output" sortKey="outputTokens" currentKey={agencySort.key} asc={agencySort.asc} onSort={agencySort.toggle} align="right" />
                                        <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Plan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {sortedAgencies.map((a, i) => (
                                        <tr key={a.agencyId} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center text-xs font-bold text-primary">
                                                        {a.agencyName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-foreground">{a.agencyName}</div>
                                                        <div className="text-xs text-muted-foreground">{a.agencySlug}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono font-semibold text-foreground">{formatNumber(a.totalRequests)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono font-semibold text-foreground">{formatNumber(a.totalTokens)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono text-muted-foreground">{formatNumber(a.inputTokens)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono text-muted-foreground">{formatNumber(a.outputTokens)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <PlanBadge plan={a.plan} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* BY USER TAB */}
            {tab === 'users' && (
                <div className="bg-card rounded-xl border border-border">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h2 className="text-base font-semibold text-foreground">AI Usage per User</h2>
                        <span className="text-xs text-muted-foreground">{byUser.length} users</span>
                    </div>
                    {sortedUsers.length === 0 ? (
                        <p className="text-muted-foreground text-sm p-6">No user AI usage recorded yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <SortHeader label="User" sortKey="userName" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} />
                                        <SortHeader label="Agency" sortKey="agencyName" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} />
                                        <SortHeader label="Requests" sortKey="totalRequests" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} align="right" />
                                        <SortHeader label="Total Tokens" sortKey="totalTokens" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} align="right" />
                                        <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Input</th>
                                        <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Output</th>
                                        <SortHeader label="Last Used" sortKey="lastUsed" currentKey={userSort.key} asc={userSort.asc} onSort={userSort.toggle} align="right" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {sortedUsers.map((u) => (
                                        <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/10 border border-border flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                                                        {u.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-foreground">{u.userName}</div>
                                                        <div className="text-xs text-muted-foreground">{u.userEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-muted-foreground text-sm">{u.agencyName}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono font-semibold text-foreground">{formatNumber(u.totalRequests)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono font-semibold text-foreground">{formatNumber(u.totalTokens)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono text-muted-foreground">{formatNumber(u.inputTokens)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="font-mono text-muted-foreground">{formatNumber(u.outputTokens)}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(u.lastUsed)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* STORAGE TAB */}
            {tab === 'storage' && (
                <div className="bg-card rounded-xl border border-border">
                    <div className="p-6 border-b border-border flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-blue-500" />
                        <h2 className="text-base font-semibold text-foreground">Storage Usage per Agency</h2>
                    </div>
                    {sortedStorage.length === 0 ? (
                        <p className="text-muted-foreground text-sm p-6">No storage data available.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <SortHeader label="Agency" sortKey="agencyName" currentKey={storageSort.key} asc={storageSort.asc} onSort={storageSort.toggle} />
                                        <SortHeader label="Used" sortKey="storageUsed" currentKey={storageSort.key} asc={storageSort.asc} onSort={storageSort.toggle} align="right" />
                                        <SortHeader label="Limit" sortKey="storageLimit" currentKey={storageSort.key} asc={storageSort.asc} onSort={storageSort.toggle} align="right" />
                                        <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Usage</th>
                                        <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Plan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {sortedStorage.map((s) => {
                                        const pct = s.storageLimit > 0 ? (s.storageUsed / s.storageLimit) * 100 : 0;
                                        return (
                                            <tr key={s.agencyId} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-border flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                                                            {s.agencyName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">{s.agencyName}</div>
                                                            <div className="text-xs text-muted-foreground">{s.agencySlug}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{formatBytes(s.storageUsed)}</td>
                                                <td className="py-3 px-4 text-right font-mono text-muted-foreground">{formatBytes(s.storageLimit)}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 max-w-32 bg-muted rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-medium ${pct > 90 ? 'text-red-500' : pct > 70 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                                            {pct.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <PlanBadge plan={s.plan} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, iconBg, label, value, sub }: {
    icon: React.ReactNode; iconBg: string; label: string; value: string; sub: string; trend: null;
}) {
    return (
        <div className="bg-card rounded-xl border border-border p-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-1 leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-1.5 truncate">{sub}</p>
            </div>
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
        </div>
    );
}

function PlanBadge({ plan }: { plan: string }) {
    const colors: Record<string, string> = {
        starter: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        agency: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };
    return (
        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors[plan] || 'bg-muted text-muted-foreground'}`}>
            {plan || '—'}
        </span>
    );
}

function SortHeader<T extends string>({ label, sortKey, currentKey, asc, onSort, align = 'left' }: {
    label: string; sortKey: T; currentKey: T; asc: boolean; onSort: (key: T) => void; align?: 'left' | 'right';
}) {
    const active = currentKey === sortKey;
    return (
        <th
            className={`py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none text-xs uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'}`}
            onClick={() => onSort(sortKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active
                    ? (asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                    : <ArrowUpDown className="w-3 h-3 opacity-30" />
                }
            </span>
        </th>
    );
}


type OverviewData = {
    totals: { totalRequests: number; totalInputTokens: number; totalOutputTokens: number; totalTokens: number; successCount: number; errorCount: number };
    byFeature: { _id: string; requests: number; totalTokens: number; inputTokens: number; outputTokens: number }[];
    byDay: { _id: string; requests: number; tokens: number }[];
    byProvider: { _id: string; requests: number; totalTokens: number }[];
    days: number;
};

type AgencyUsage = {
    agencyId: string;
    agencyName: string;
    agencySlug: string;
    plan: string;
    storageUsed: number;
    storageLimit: number;
    totalRequests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
};

type StorageData = {
    agencyId: string;
    agencyName: string;
    agencySlug: string;
    plan: string;
    storageUsed: number;
    storageLimit: number;
};

const FEATURE_LABELS: Record<string, string> = {
    'singularity-agent': 'Singularity Agent',
    'singularity-chat': 'Singularity Chat',
    'ai-explain': 'AI Explain',
    'ai-enhance': 'AI Enhance',
    'ai-task-chat': 'AI Task Chat',
    'ai-chatbot': 'AI Chatbot',
    'ai-hour-estimate': 'AI Hour Estimate',
};

const FEATURE_COLORS: Record<string, string> = {
    'singularity-agent': 'bg-purple-500',
    'singularity-chat': 'bg-blue-500',
    'ai-explain': 'bg-green-500',
    'ai-enhance': 'bg-yellow-500',
    'ai-task-chat': 'bg-pink-500',
    'ai-chatbot': 'bg-cyan-500',
    'ai-hour-estimate': 'bg-orange-500',
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

interface Props {
    overview: OverviewData;
    byAgency: AgencyUsage[];
    storage: StorageData[];
}

type SortKey = 'agencyName' | 'totalRequests' | 'totalTokens' | 'inputTokens' | 'outputTokens';
type StorageSortKey = 'agencyName' | 'storageUsed' | 'storageLimit';

export default function AIUsageDashboard({ overview, byAgency, storage }: Props) {
    const [agencySortKey, setAgencySortKey] = useState<SortKey>('totalRequests');
    const [agencySortAsc, setAgencySortAsc] = useState(false);
    const [storageSortKey, setStorageSortKey] = useState<StorageSortKey>('storageUsed');
    const [storageSortAsc, setStorageSortAsc] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const { totals, byFeature, byDay, byProvider } = overview;
    const successRate = totals.totalRequests > 0
        ? ((totals.successCount / totals.totalRequests) * 100).toFixed(1)
        : '0';

    // Sort agencies
    const sortedAgencies = [...byAgency].sort((a, b) => {
        const mul = agencySortAsc ? 1 : -1;
        if (agencySortKey === 'agencyName') return mul * a.agencyName.localeCompare(b.agencyName);
        return mul * ((a[agencySortKey] || 0) - (b[agencySortKey] || 0));
    });

    // Sort storage
    const sortedStorage = [...storage].sort((a, b) => {
        const mul = storageSortAsc ? 1 : -1;
        if (storageSortKey === 'agencyName') return mul * a.agencyName.localeCompare(b.agencyName);
        return mul * ((a[storageSortKey] || 0) - (b[storageSortKey] || 0));
    });

    function toggleAgencySort(key: SortKey) {
        if (agencySortKey === key) setAgencySortAsc(!agencySortAsc);
        else { setAgencySortKey(key); setAgencySortAsc(false); }
    }

    function toggleStorageSort(key: StorageSortKey) {
        if (storageSortKey === key) setStorageSortAsc(!storageSortAsc);
        else { setStorageSortKey(key); setStorageSortAsc(false); }
    }

    // Total feature requests for percentage bars
    const totalFeatureRequests = byFeature.reduce((s, f) => s + f.requests, 0);

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Zap className="w-8 h-8 text-yellow-500" />}
                    label="Total AI Requests"
                    value={formatNumber(totals.totalRequests)}
                    sub={`${overview.days}-day period`}
                />
                <StatCard
                    icon={<Brain className="w-8 h-8 text-purple-500" />}
                    label="Total Tokens"
                    value={formatNumber(totals.totalTokens)}
                    sub={`In: ${formatNumber(totals.totalInputTokens)} / Out: ${formatNumber(totals.totalOutputTokens)}`}
                />
                <StatCard
                    icon={<TrendingUp className="w-8 h-8 text-green-500" />}
                    label="Success Rate"
                    value={`${successRate}%`}
                    sub={`${totals.errorCount} errors`}
                />
                <StatCard
                    icon={<Server className="w-8 h-8 text-blue-500" />}
                    label="Active Providers"
                    value={byProvider.length.toString()}
                    sub={byProvider.map(p => p._id || 'unknown').join(', ')}
                />
            </div>

            {/* Feature Breakdown */}
            <div className="bg-card rounded-lg shadow border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Usage by Feature</h2>
                {byFeature.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No AI usage recorded yet.</p>
                ) : (
                    <div className="space-y-3">
                        {byFeature.map((f) => {
                            const pct = totalFeatureRequests > 0 ? (f.requests / totalFeatureRequests) * 100 : 0;
                            return (
                                <div key={f._id} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-foreground">{FEATURE_LABELS[f._id] || f._id}</span>
                                        <span className="text-muted-foreground">
                                            {formatNumber(f.requests)} requests &middot; {formatNumber(f.totalTokens)} tokens
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${FEATURE_COLORS[f._id] || 'bg-gray-500'}`}
                                            style={{ width: `${Math.max(pct, 1)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Daily Trend */}
            {byDay.length > 0 && (
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'daily' ? null : 'daily')}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <h2 className="text-lg font-semibold text-foreground">Daily Trend ({overview.days} days)</h2>
                        {expandedSection === 'daily' ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    {expandedSection === 'daily' && (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Requests</th>
                                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Tokens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byDay.map((d) => (
                                        <tr key={d._id} className="border-b border-border/50 hover:bg-muted/50">
                                            <td className="py-2 px-3 text-foreground">{d._id}</td>
                                            <td className="py-2 px-3 text-right text-foreground">{formatNumber(d.requests)}</td>
                                            <td className="py-2 px-3 text-right text-foreground">{formatNumber(d.tokens)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Per-Agency AI Usage */}
            <div className="bg-card rounded-lg shadow border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">AI Usage per Agency</h2>
                {sortedAgencies.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No agency AI usage recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <SortHeader label="Agency" sortKey="agencyName" currentKey={agencySortKey} asc={agencySortAsc} onSort={toggleAgencySort} />
                                    <SortHeader label="Requests" sortKey="totalRequests" currentKey={agencySortKey} asc={agencySortAsc} onSort={toggleAgencySort} align="right" />
                                    <SortHeader label="Total Tokens" sortKey="totalTokens" currentKey={agencySortKey} asc={agencySortAsc} onSort={toggleAgencySort} align="right" />
                                    <SortHeader label="Input Tokens" sortKey="inputTokens" currentKey={agencySortKey} asc={agencySortAsc} onSort={toggleAgencySort} align="right" />
                                    <SortHeader label="Output Tokens" sortKey="outputTokens" currentKey={agencySortKey} asc={agencySortAsc} onSort={toggleAgencySort} align="right" />
                                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Plan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAgencies.map((a) => (
                                    <tr key={a.agencyId} className="border-b border-border/50 hover:bg-muted/50">
                                        <td className="py-2 px-3">
                                            <div className="font-medium text-foreground">{a.agencyName}</div>
                                            <div className="text-xs text-muted-foreground">{a.agencySlug}</div>
                                        </td>
                                        <td className="py-2 px-3 text-right text-foreground font-mono">{formatNumber(a.totalRequests)}</td>
                                        <td className="py-2 px-3 text-right text-foreground font-mono">{formatNumber(a.totalTokens)}</td>
                                        <td className="py-2 px-3 text-right text-muted-foreground font-mono">{formatNumber(a.inputTokens)}</td>
                                        <td className="py-2 px-3 text-right text-muted-foreground font-mono">{formatNumber(a.outputTokens)}</td>
                                        <td className="py-2 px-3 text-right">
                                            <Badge variant="outline" className="capitalize">{a.plan}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Storage Usage per Agency */}
            <div className="bg-card rounded-lg shadow border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                    <HardDrive className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-foreground">Storage Usage per Agency</h2>
                </div>
                {sortedStorage.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No storage data available.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <SortHeader label="Agency" sortKey="agencyName" currentKey={storageSortKey} asc={storageSortAsc} onSort={toggleStorageSort} />
                                    <SortHeader label="Storage Used" sortKey="storageUsed" currentKey={storageSortKey} asc={storageSortAsc} onSort={toggleStorageSort} align="right" />
                                    <SortHeader label="Storage Limit" sortKey="storageLimit" currentKey={storageSortKey} asc={storageSortAsc} onSort={toggleStorageSort} align="right" />
                                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Usage</th>
                                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Plan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStorage.map((s) => {
                                    const pct = s.storageLimit > 0 ? (s.storageUsed / s.storageLimit) * 100 : 0;
                                    return (
                                        <tr key={s.agencyId} className="border-b border-border/50 hover:bg-muted/50">
                                            <td className="py-2 px-3">
                                                <div className="font-medium text-foreground">{s.agencyName}</div>
                                                <div className="text-xs text-muted-foreground">{s.agencySlug}</div>
                                            </td>
                                            <td className="py-2 px-3 text-right text-foreground font-mono">{formatBytes(s.storageUsed)}</td>
                                            <td className="py-2 px-3 text-right text-muted-foreground font-mono">{formatBytes(s.storageLimit)}</td>
                                            <td className="py-2 px-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-20 bg-muted rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <Badge variant="outline" className="capitalize">{s.plan}</Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Provider Breakdown */}
            {byProvider.length > 0 && (
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Usage by Provider</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {byProvider.map((p) => (
                            <div key={p._id} className="bg-muted/50 rounded-lg p-4">
                                <p className="text-sm font-medium text-foreground capitalize">{p._id || 'Unknown'}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{formatNumber(p.requests)}</p>
                                <p className="text-xs text-muted-foreground">{formatNumber(p.totalTokens)} tokens</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
    return (
        <div className="bg-card rounded-lg shadow border border-border p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
                {icon}
            </div>
        </div>
    );
}

function SortHeader<T extends string>({ label, sortKey, currentKey, asc, onSort, align = 'left' }: {
    label: string; sortKey: T; currentKey: T; asc: boolean; onSort: (key: T) => void; align?: 'left' | 'right';
}) {
    const active = currentKey === sortKey;
    return (
        <th
            className={`py-2 px-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
            onClick={() => onSort(sortKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active
                    ? (asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                    : <ArrowUpDown className="w-3 h-3 opacity-30" />
                }
            </span>
        </th>
    );
}
