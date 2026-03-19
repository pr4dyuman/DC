"use client";

import { Activity, Server, Sparkles } from "lucide-react";

import {
    FEATURE_COLORS,
    FEATURE_LABELS,
    fmt,
    PROVIDER_COLORS,
    type OverviewData,
} from "./ai-usage-dashboard-shared";
import { EmptyState } from "./AIUsageDashboardPrimitives";

type AIUsageOverviewTabProps = {
    overview: OverviewData;
    totalFeatureRequests: number;
    totalProviderRequests: number;
    maxDayRequests: number;
    maxDayTokens: number;
};

export function AIUsageOverviewTab({
    overview,
    totalFeatureRequests,
    totalProviderRequests,
    maxDayRequests,
    maxDayTokens,
}: AIUsageOverviewTabProps) {
    const { byFeature, byDay, byProvider, totals } = overview;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Feature Usage</h2>
                        <span className="text-xs text-muted-foreground font-mono">{fmt(totalFeatureRequests)} total</span>
                    </div>
                    {byFeature.length === 0 ? (
                        <EmptyState icon={<Sparkles className="w-8 h-8" />} text="No AI usage recorded yet" />
                    ) : (
                        <div className="space-y-5">
                            {byFeature.map((feature, index) => {
                                const pct = totalFeatureRequests > 0 ? (feature.requests / totalFeatureRequests) * 100 : 0;
                                const colors = FEATURE_COLORS[feature._id] || FEATURE_COLORS["singularity-agent"];
                                const ioPct = feature.totalTokens > 0 ? (feature.inputTokens / feature.totalTokens) * 100 : 50;

                                return (
                                    <div key={feature._id}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                                                    {index + 1}
                                                </span>
                                                <span className="text-sm font-medium text-foreground">
                                                    {FEATURE_LABELS[feature._id] || feature._id}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="font-mono">{fmt(feature.requests)} <span className="opacity-60">req</span></span>
                                                <span className="font-mono font-medium text-foreground">{fmt(feature.totalTokens)} <span className="opacity-60 font-normal">tok</span></span>
                                                <span className="font-mono w-10 text-right">{pct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-muted/60 rounded-full h-2 mb-1.5">
                                            <div
                                                className={`h-2 rounded-full ${colors.bar} transition-all duration-700 ease-out`}
                                                style={{ width: `${Math.max(pct, 1)}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex h-1 rounded-full overflow-hidden bg-muted/40">
                                                <div className="bg-blue-400/70 h-full transition-all duration-500" style={{ width: `${ioPct}%` }} />
                                                <div className="bg-violet-400/70 h-full transition-all duration-500" style={{ width: `${100 - ioPct}%` }} />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                                <span className="text-blue-500">in</span>{" "}
                                                <span className="text-violet-500">out</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-card rounded-xl border border-border/60 p-6">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">Providers</h2>
                    {byProvider.length === 0 ? (
                        <EmptyState icon={<Server className="w-8 h-8" />} text="No provider data" />
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="relative w-40 h-40 mb-6">
                                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                    {(() => {
                                        let cumulative = 0;
                                        return byProvider.map((provider) => {
                                            const pct = totalProviderRequests > 0 ? (provider.requests / totalProviderRequests) * 100 : 0;
                                            const offset = cumulative;
                                            cumulative += pct;
                                            const color = PROVIDER_COLORS[provider._id] || "#6b7280";
                                            return (
                                                <circle
                                                    key={provider._id}
                                                    cx="18"
                                                    cy="18"
                                                    r="15.5"
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
                            <div className="w-full space-y-3">
                                {byProvider.map((provider) => {
                                    const pct = totalProviderRequests > 0 ? (provider.requests / totalProviderRequests) * 100 : 0;
                                    const color = PROVIDER_COLORS[provider._id] || "#6b7280";
                                    return (
                                        <div key={provider._id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                <span className="text-sm capitalize text-foreground">{provider._id || "Unknown"}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-muted-foreground">{fmt(provider.requests)}</span>
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
                        {byDay.map((day) => {
                            const height = maxDayRequests > 0 ? (day.requests / maxDayRequests) * 100 : 0;
                            const dayOfWeek = new Date(day._id).getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            return (
                                <div key={day._id} className="flex-1 flex flex-col items-center group relative">
                                    <div
                                        className={`w-full rounded-t-sm transition-all duration-300 cursor-default ${isWeekend
                                            ? "bg-primary/40 hover:bg-primary/60"
                                            : "bg-primary/70 hover:bg-primary"}`}
                                        style={{ height: `${Math.max(height, 3)}%` }}
                                    />
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-popover border border-border rounded-lg px-3 py-2 text-xs text-popover-foreground whitespace-nowrap z-20 shadow-lg">
                                        <span className="font-semibold">{day._id}</span>
                                        <span className="text-muted-foreground mt-0.5">{day.requests.toLocaleString()} requests</span>
                                        <span className="text-muted-foreground">{fmt(day.tokens)} tokens</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-mono">
                        <span>{byDay[0]?._id}</span>
                        {byDay.length > 10 && <span>{byDay[Math.floor(byDay.length / 2)]?._id}</span>}
                        <span>{byDay[byDay.length - 1]?._id}</span>
                    </div>
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
    );
}
