"use client";

import { useState } from "react";
import { Brain, Zap, Database, TrendingUp, Server, HardDrive, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
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
