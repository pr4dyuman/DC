"use client";

import { useState, useMemo } from "react";
import {
    Brain, Zap, Server, HardDrive, ChevronDown, ChevronUp, ArrowUpDown,
    Users, Building2, BarChart3, Activity, CheckCircle2, Clock,
    Search, TrendingUp, AlertTriangle, Gauge, Sparkles, Filter
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type OverviewData = {
    totals: { totalRequests: number; totalInputTokens: number; totalOutputTokens: number; totalTokens: number; successCount: number; errorCount: number };
    byFeature: { _id: string; requests: number; totalTokens: number; inputTokens: number; outputTokens: number }[];
    byDay: { _id: string; requests: number; tokens: number }[];
    byProvider: { _id: string; requests: number; totalTokens: number }[];
    days: number;
};

type AgencyUsage = {
    agencyId: string; agencyName: string; agencySlug: string; plan: string;
    storageUsed: number; storageLimit: number;
    totalRequests: number; totalTokens: number; inputTokens: number; outputTokens: number;
};

type UserUsage = {
    userId: string; userName: string; userEmail: string; agencyName: string;
    totalRequests: number; totalTokens: number; inputTokens: number; outputTokens: number;
    lastUsed: string | null;
};

type StorageData = {
    agencyId: string; agencyName: string; agencySlug: string; plan: string;
    storageUsed: number; storageLimit: number;
};

interface Props {
    overview: OverviewData;
    byAgency: AgencyUsage[];
    byUser: UserUsage[];
    storage: StorageData[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_LABELS: Record<string, string> = {
    'singularity-agent': 'Singularity Agent',
    'singularity-chat': 'Singularity Chat',
    'ai-explain': 'AI Explain',
    'ai-enhance': 'AI Enhance',
    'ai-task-chat': 'AI Task Chat',
    'ai-chatbot': 'AI Chatbot',
    'ai-hour-estimate': 'Hour Estimate',
};

const FEATURE_COLORS: Record<string, { bg: string; text: string; bar: string; ring: string }> = {
    'singularity-agent': { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500', ring: 'ring-purple-500/20' },
    'singularity-chat': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', ring: 'ring-blue-500/20' },
    'ai-explain': { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
    'ai-enhance': { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', ring: 'ring-amber-500/20' },
    'ai-task-chat': { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', bar: 'bg-pink-500', ring: 'ring-pink-500/20' },
    'ai-chatbot': { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', bar: 'bg-cyan-500', ring: 'ring-cyan-500/20' },
    'ai-hour-estimate': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', bar: 'bg-orange-500', ring: 'ring-orange-500/20' },
};

const PROVIDER_COLORS: Record<string, string> = {
    gemini: '#6366f1',
    openai: '#22c55e',
    nvidia: '#84cc16',
    github: '#6b7280',
};

const PLAN_STYLES: Record<string, string> = {
    free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    starter: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    pro: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    enterprise: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

// ============================================================================
// HELPERS
// ============================================================================

function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
}

function fmtBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function timeAgo(iso: string | null): string {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function activityStatus(iso: string | null): 'active' | 'recent' | 'inactive' {
    if (!iso) return 'inactive';
    const hrs = (Date.now() - new Date(iso).getTime()) / 3600000;
    if (hrs < 24) return 'active';
    if (hrs < 168) return 'recent';
    return 'inactive';
}

type Tab = 'overview' | 'agencies' | 'users' | 'storage';

function useSort<T extends string>(defaultKey: T) {
    const [key, setKey] = useState<T>(defaultKey);
    const [asc, setAsc] = useState(false);
    function toggle(k: T) {
        if (key === k) setAsc(v => !v);
        else { setKey(k); setAsc(false); }
    }
    return { key, asc, toggle };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIUsageDashboard({ overview, byAgency, byUser, storage }: Props) {
    const [tab, setTab] = useState<Tab>('overview');
    const [agencySearch, setAgencySearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userAgencyFilter, setUserAgencyFilter] = useState('');

    const agencySort = useSort<'agencyName' | 'totalRequests' | 'totalTokens' | 'inputTokens' | 'outputTokens'>('totalRequests');
    const userSort = useSort<'userName' | 'agencyName' | 'totalRequests' | 'totalTokens' | 'lastUsed'>('totalRequests');
    const storageSort = useSort<'agencyName' | 'storageUsed' | 'storageLimit'>('storageUsed');

    const { totals, byFeature, byDay, byProvider } = overview;
    const successRate = totals.totalRequests > 0
        ? ((totals.successCount / totals.totalRequests) * 100).toFixed(1) : '100';
    const avgTokensPerRequest = totals.totalRequests > 0
        ? Math.round(totals.totalTokens / totals.totalRequests) : 0;
    const totalFeatureRequests = byFeature.reduce((s, f) => s + f.requests, 0);
    const maxDayRequests = byDay.length > 0 ? Math.max(...byDay.map(d => d.requests)) : 1;
    const maxDayTokens = byDay.length > 0 ? Math.max(...byDay.map(d => d.tokens)) : 1;

    // Agency names for user filter dropdown
    const uniqueAgencies = useMemo(() =>
        [...new Set(byUser.map(u => u.agencyName))].sort(),
        [byUser]
    );

    // Sorted + filtered agencies
    const filteredAgencies = useMemo(() => {
        let list = [...byAgency];
        if (agencySearch) {
            const q = agencySearch.toLowerCase();
            list = list.filter(a => a.agencyName.toLowerCase().includes(q) || a.agencySlug.toLowerCase().includes(q));
        }
        return list.sort((a, b) => {
            const m = agencySort.asc ? 1 : -1;
            if (agencySort.key === 'agencyName') return m * a.agencyName.localeCompare(b.agencyName);
            return m * ((a[agencySort.key] || 0) - (b[agencySort.key] || 0));
        });
    }, [byAgency, agencySearch, agencySort.key, agencySort.asc]);

    // Sorted + filtered users
    const filteredUsers = useMemo(() => {
        let list = [...byUser];
        if (userSearch) {
            const q = userSearch.toLowerCase();
            list = list.filter(u => u.userName.toLowerCase().includes(q) || u.userEmail.toLowerCase().includes(q));
        }
        if (userAgencyFilter) {
            list = list.filter(u => u.agencyName === userAgencyFilter);
        }
        return list.sort((a, b) => {
            const m = userSort.asc ? 1 : -1;
            if (userSort.key === 'userName') return m * a.userName.localeCompare(b.userName);
            if (userSort.key === 'agencyName') return m * a.agencyName.localeCompare(b.agencyName);
            if (userSort.key === 'lastUsed') return m * ((a.lastUsed || '').localeCompare(b.lastUsed || ''));
            return m * ((a[userSort.key as 'totalRequests' | 'totalTokens'] || 0) - (b[userSort.key as 'totalRequests' | 'totalTokens'] || 0));
        });
    }, [byUser, userSearch, userAgencyFilter, userSort.key, userSort.asc]);

    // Sorted storage
    const sortedStorage = useMemo(() =>
        [...storage].sort((a, b) => {
            const m = storageSort.asc ? 1 : -1;
            if (storageSort.key === 'agencyName') return m * a.agencyName.localeCompare(b.agencyName);
            return m * ((a[storageSort.key] || 0) - (b[storageSort.key] || 0));
        }),
        [storage, storageSort.key, storageSort.asc]
    );

    // Storage aggregates
    const totalStorageUsed = storage.reduce((s, a) => s + a.storageUsed, 0);
    const totalStorageLimit = storage.reduce((s, a) => s + a.storageLimit, 0);
    const storageWarningCount = storage.filter(s => s.storageLimit > 0 && (s.storageUsed / s.storageLimit) > 0.8).length;

    // Top agency
    const topAgency = byAgency.length > 0 ? byAgency.reduce((a, b) => a.totalRequests > b.totalRequests ? a : b) : null;
    const maxAgencyRequests = topAgency?.totalRequests || 1;

    // Provider donut
    const totalProviderRequests = byProvider.reduce((s, p) => s + p.requests, 0);

    const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number; badge?: string }[] = [
        { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'agencies', label: 'Agencies', icon: <Building2 className="w-4 h-4" />, count: byAgency.length },
        { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, count: byUser.length },
        { id: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" />, count: storage.length, badge: storageWarningCount > 0 ? `${storageWarningCount} ⚠` : undefined },
    ];

    return (
        <div className="space-y-6">
            {/* ── STAT CARDS ── */}
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
                    sub={`${totals.errorCount} error${totals.errorCount !== 1 ? 's' : ''}`}
                />
                <StatCard
                    icon={<Server className="w-[18px] h-[18px]" />}
                    gradient="from-blue-500/20 to-indigo-500/10"
                    iconColor="text-blue-500"
                    label="Providers"
                    value={byProvider.length.toString()}
                    sub={byProvider.map(p => p._id || 'unknown').join(', ')}
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

            {/* ── TAB BAR ── */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border/60 backdrop-blur-sm">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${tab === t.id
                            ? 'bg-background text-foreground shadow-sm border border-border/80'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                    >
                        {t.icon}
                        <span className="hidden sm:inline">{t.label}</span>
                        {t.count !== undefined && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {t.count}
                            </span>
                        )}
                        {t.badge && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                {t.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Feature + Provider row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Feature Usage */}
                        <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Feature Usage</h2>
                                <span className="text-xs text-muted-foreground font-mono">{fmt(totalFeatureRequests)} total</span>
                            </div>
                            {byFeature.length === 0 ? (
                                <EmptyState icon={<Sparkles className="w-8 h-8" />} text="No AI usage recorded yet" />
                            ) : (
                                <div className="space-y-5">
                                    {byFeature.map((f, i) => {
                                        const pct = totalFeatureRequests > 0 ? (f.requests / totalFeatureRequests) * 100 : 0;
                                        const colors = FEATURE_COLORS[f._id] || FEATURE_COLORS['singularity-agent'];
                                        const ioPct = f.totalTokens > 0 ? (f.inputTokens / f.totalTokens) * 100 : 50;
                                        return (
                                            <div key={f._id}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-sm font-medium text-foreground">
                                                            {FEATURE_LABELS[f._id] || f._id}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="font-mono">{fmt(f.requests)} <span className="opacity-60">req</span></span>
                                                        <span className="font-mono font-medium text-foreground">{fmt(f.totalTokens)} <span className="opacity-60 font-normal">tok</span></span>
                                                        <span className="font-mono w-10 text-right">{pct.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                                {/* Request bar */}
                                                <div className="w-full bg-muted/60 rounded-full h-2 mb-1.5">
                                                    <div
                                                        className={`h-2 rounded-full ${colors.bar} transition-all duration-700 ease-out`}
                                                        style={{ width: `${Math.max(pct, 1)}%` }}
                                                    />
                                                </div>
                                                {/* Token I/O mini bar */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 flex h-1 rounded-full overflow-hidden bg-muted/40">
                                                        <div className="bg-blue-400/70 h-full transition-all duration-500" style={{ width: `${ioPct}%` }} />
                                                        <div className="bg-violet-400/70 h-full transition-all duration-500" style={{ width: `${100 - ioPct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                                        <span className="text-blue-500">in</span>{' '}<span className="text-violet-500">out</span>
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Provider Distribution */}
                        <div className="bg-card rounded-xl border border-border/60 p-6">
                            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">Providers</h2>
                            {byProvider.length === 0 ? (
                                <EmptyState icon={<Server className="w-8 h-8" />} text="No provider data" />
                            ) : (
                                <div className="flex flex-col items-center">
                                    {/* CSS Donut Chart */}
                                    <div className="relative w-40 h-40 mb-6">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            {(() => {
                                                let cumulative = 0;
                                                return byProvider.map((p) => {
                                                    const pct = totalProviderRequests > 0 ? (p.requests / totalProviderRequests) * 100 : 0;
                                                    const offset = cumulative;
                                                    cumulative += pct;
                                                    const color = PROVIDER_COLORS[p._id] || '#6b7280';
                                                    return (
                                                        <circle
                                                            key={p._id}
                                                            cx="18" cy="18" r="15.5"
                                                            fill="none"
                                                            stroke={color}
                                                            strokeWidth="4"
                                                            strokeDasharray={`${pct} ${100 - pct}`}
                                                            strokeDashoffset={-offset}
                                                            strokeLinecap="round"
                                                            className="transition-all duration-700"
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold text-foreground">{byProvider.length}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Providers</span>
                                        </div>
                                    </div>
                                    {/* Legend */}
                                    <div className="w-full space-y-3">
                                        {byProvider.map((p) => {
                                            const pct = totalProviderRequests > 0 ? (p.requests / totalProviderRequests) * 100 : 0;
                                            const color = PROVIDER_COLORS[p._id] || '#6b7280';
                                            return (
                                                <div key={p._id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                        <span className="text-sm capitalize text-foreground">{p._id || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-mono text-muted-foreground">{fmt(p.requests)}</span>
                                                        <span className="text-xs font-mono font-medium text-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Trend */}
                    {byDay.length > 0 && (
                        <div className="bg-card rounded-xl border border-border/60 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Daily Trend</h2>
                                </div>
                                <span className="text-xs text-muted-foreground">Last {overview.days} days</span>
                            </div>
                            <div className="flex items-end gap-[3px] h-40">
                                {byDay.map((d) => {
                                    const h = maxDayRequests > 0 ? (d.requests / maxDayRequests) * 100 : 0;
                                    const dayOfWeek = new Date(d._id).getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    return (
                                        <div key={d._id} className="flex-1 flex flex-col items-center group relative">
                                            <div
                                                className={`w-full rounded-t-sm transition-all duration-300 cursor-default ${isWeekend
                                                    ? 'bg-primary/40 hover:bg-primary/60'
                                                    : 'bg-primary/70 hover:bg-primary'
                                                    }`}
                                                style={{ height: `${Math.max(h, 3)}%` }}
                                            />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-popover border border-border rounded-lg px-3 py-2 text-xs text-popover-foreground whitespace-nowrap z-20 shadow-lg">
                                                <span className="font-semibold">{d._id}</span>
                                                <span className="text-muted-foreground mt-0.5">{d.requests.toLocaleString()} requests</span>
                                                <span className="text-muted-foreground">{fmt(d.tokens)} tokens</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* X-axis labels */}
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-mono">
                                <span>{byDay[0]?._id}</span>
                                {byDay.length > 10 && <span>{byDay[Math.floor(byDay.length / 2)]?._id}</span>}
                                <span>{byDay[byDay.length - 1]?._id}</span>
                            </div>
                            {/* Y-axis legend */}
                            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                                <span>Peak: <span className="font-mono font-medium text-foreground">{maxDayRequests.toLocaleString()}</span> req/day</span>
                                <span>·</span>
                                <span>Peak tokens: <span className="font-mono font-medium text-foreground">{fmt(maxDayTokens)}</span>/day</span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-sm bg-primary/40" /> Weekend
                                    <span className="w-2 h-2 rounded-sm bg-primary/70 ml-1" /> Weekday
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Token Split Summary */}
                    <div className="bg-card rounded-xl border border-border/60 p-6">
                        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Token Distribution</h2>
                        <div className="flex gap-6 flex-wrap">
                            <div className="flex-1 min-w-48">
                                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                    <span>Input Tokens</span>
                                    <span>Output Tokens</span>
                                </div>
                                <div className="flex h-4 rounded-full overflow-hidden bg-muted/40">
                                    <div
                                        className="bg-blue-500 transition-all duration-700 flex items-center justify-center"
                                        style={{ width: `${totals.totalTokens > 0 ? (totals.totalInputTokens / totals.totalTokens) * 100 : 50}%` }}
                                    >
                                        <span className="text-[9px] font-bold text-white drop-shadow-sm">{fmt(totals.totalInputTokens)}</span>
                                    </div>
                                    <div
                                        className="bg-violet-500 transition-all duration-700 flex items-center justify-center"
                                        style={{ width: `${totals.totalTokens > 0 ? (totals.totalOutputTokens / totals.totalTokens) * 100 : 50}%` }}
                                    >
                                        <span className="text-[9px] font-bold text-white drop-shadow-sm">{fmt(totals.totalOutputTokens)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                                    <span>{totals.totalTokens > 0 ? ((totals.totalInputTokens / totals.totalTokens) * 100).toFixed(0) : 50}%</span>
                                    <span>{totals.totalTokens > 0 ? ((totals.totalOutputTokens / totals.totalTokens) * 100).toFixed(0) : 50}%</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center min-w-60">
                                <div>
                                    <p className="text-lg font-bold text-foreground font-mono">{fmt(totals.totalInputTokens)}</p>
                                    <p className="text-[10px] text-blue-500 uppercase tracking-wider font-semibold">Input</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground font-mono">{fmt(totals.totalOutputTokens)}</p>
                                    <p className="text-[10px] text-violet-500 uppercase tracking-wider font-semibold">Output</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground font-mono">{fmt(totals.totalTokens)}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── AGENCIES TAB ── */}
            {tab === 'agencies' && (
                <div className="space-y-4">
                    {/* Top Agency Highlight */}
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

                    {/* Agency Table */}
                    <div className="bg-card rounded-xl border border-border/60">
                        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Agency Usage</h2>
                                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{filteredAgencies.length}</span>
                            </div>
                            <SearchInput value={agencySearch} onChange={setAgencySearch} placeholder="Search agencies..." />
                        </div>
                        {filteredAgencies.length === 0 ? (
                            <EmptyState icon={<Building2 className="w-8 h-8" />} text={agencySearch ? 'No agencies match your search' : 'No agency usage data'} />
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
                                        {filteredAgencies.map((a) => {
                                            const reqPct = maxAgencyRequests > 0 ? (a.totalRequests / maxAgencyRequests) * 100 : 0;
                                            return (
                                                <tr key={a.agencyId} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border/60 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                                                {a.agencyName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-foreground truncate">{a.agencyName}</div>
                                                                <div className="text-[10px] text-muted-foreground font-mono">{a.agencySlug}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="font-mono font-semibold text-foreground">{fmt(a.totalRequests)}</span>
                                                            <div className="w-16 h-1 bg-muted rounded-full">
                                                                <div className="h-1 bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${reqPct}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmt(a.totalTokens)}</td>
                                                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmt(a.inputTokens)}</td>
                                                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmt(a.outputTokens)}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <PlanBadge plan={a.plan} />
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
            )}

            {/* ── USERS TAB ── */}
            {tab === 'users' && (
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
                                        onChange={e => setUserAgencyFilter(e.target.value)}
                                        className="pl-8 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                                    >
                                        <option value="">All agencies</option>
                                        {uniqueAgencies.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            )}
                            <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search users..." />
                        </div>
                    </div>
                    {filteredUsers.length === 0 ? (
                        <EmptyState icon={<Users className="w-8 h-8" />} text={userSearch || userAgencyFilter ? 'No users match your filters' : 'No user usage data'} />
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
                                    {filteredUsers.map((u) => {
                                        const status = activityStatus(u.lastUsed);
                                        const ioPct = u.totalTokens > 0 ? (u.inputTokens / u.totalTokens) * 100 : 50;
                                        return (
                                            <tr key={u.userId} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/10 border border-border/60 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                                                                {u.userName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${status === 'active' ? 'bg-emerald-500' : status === 'recent' ? 'bg-amber-500' : 'bg-gray-400'
                                                                }`} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-foreground truncate">{u.userName}</div>
                                                            <div className="text-[10px] text-muted-foreground truncate">{u.userEmail}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">{u.agencyName}</td>
                                                <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmt(u.totalRequests)}</td>
                                                <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmt(u.totalTokens)}</td>
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
                                                        <span>{timeAgo(u.lastUsed)}</span>
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
            )}

            {/* ── STORAGE TAB ── */}
            {tab === 'storage' && (
                <div className="space-y-4">
                    {/* Storage Summary */}
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
                            <p className={`text-2xl font-bold mt-1 font-mono ${storageWarningCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {storageWarningCount}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {storageWarningCount > 0
                                    ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Agencies above 80%</span>
                                    : 'All agencies healthy'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Storage Table */}
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
                                        {sortedStorage.map((s) => {
                                            const pct = s.storageLimit > 0 ? (s.storageUsed / s.storageLimit) * 100 : 0;
                                            const isWarning = pct > 80;
                                            const isCritical = pct > 90;
                                            return (
                                                <tr key={s.agencyId} className={`transition-colors ${isCritical ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : isWarning ? 'bg-amber-500/[0.02] hover:bg-amber-500/[0.04]' : 'hover:bg-muted/20'}`}>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-border/60 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                                                {s.agencyName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-foreground flex items-center gap-2 truncate">
                                                                    {s.agencyName}
                                                                    {isCritical && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                                                                    {isWarning && !isCritical && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground font-mono">{s.agencySlug}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmtBytes(s.storageUsed)}</td>
                                                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{fmtBytes(s.storageLimit)}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 bg-muted rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-xs font-mono font-semibold w-10 text-right ${isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-muted-foreground'}`}>
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
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon, gradient, iconColor, label, value, sub }: {
    icon: React.ReactNode; gradient: string; iconColor: string; label: string; value: string; sub: string;
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

function PlanBadge({ plan }: { plan: string }) {
    return (
        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize border ${PLAN_STYLES[plan] || 'bg-muted text-muted-foreground border-border'}`}>
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
            className={`py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none text-[11px] uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-left'}`}
            onClick={() => onSort(sortKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active
                    ? (asc ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />)
                    : <ArrowUpDown className="w-3 h-3 opacity-20" />
                }
            </span>
        </th>
    );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-8 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 w-48 transition-all"
            />
        </div>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="opacity-30 mb-3">{icon}</div>
            <p className="text-sm">{text}</p>
        </div>
    );
}
