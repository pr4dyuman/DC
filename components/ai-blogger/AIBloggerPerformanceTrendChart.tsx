"use client";

import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type { BlogStudioPerformanceSnapshot } from "@/lib/types-ai-blogger";

type AIBloggerPerformanceTrendChartProps = {
    history: BlogStudioPerformanceSnapshot[];
    className?: string;
};

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en-US", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

function formatPercent(value: number) {
    return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2).replace(/\.0$/, "")}%`;
}

function formatXAxisLabel(value: string) {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

type TrendTooltipProps = {
    active?: boolean;
    payload?: Array<{ value?: number; dataKey?: string }>;
    label?: string;
};

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
    if (!active || !payload || payload.length === 0 || !label) {
        return null;
    }

    const datum = payload[0];
    const data = (datum as { payload?: {
        clicks: number;
        ctr: number;
        endDate: string;
        impressions: number;
        label: string;
        position: number;
    } }).payload;

    if (!data) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-border/70 bg-background/95 px-4 py-3 text-xs shadow-xl">
            <p className="font-semibold text-foreground">{label}</p>
            <div className="mt-2 space-y-1.5 text-muted-foreground">
                <p>Window ended {new Date(data.endDate).toLocaleDateString()}</p>
                <p>Impressions {formatCompactNumber(data.impressions)}</p>
                <p>Clicks {formatCompactNumber(data.clicks)}</p>
                <p>CTR {formatPercent(data.ctr)}</p>
                <p>Avg position {data.position > 0 ? data.position.toFixed(1) : "-"}</p>
            </div>
        </div>
    );
}

export function AIBloggerPerformanceTrendChart({
    history,
    className,
}: AIBloggerPerformanceTrendChartProps) {
    if (history.length === 0) {
        return (
            <div className={`rounded-xl border border-dashed border-border/60 bg-background/40 px-5 py-10 text-sm text-muted-foreground ${className || ""}`.trim()}>
                Trend history will appear here after more than one Search Console sync window has been stored.
            </div>
        );
    }

    const data = history.map((snapshot) => ({
        label: formatXAxisLabel(snapshot.endDate),
        endDate: snapshot.endDate,
        impressions: snapshot.impressions,
        clicks: snapshot.clicks,
        ctr: snapshot.ctr,
        position: snapshot.position,
    }));

    return (
        <div className={`rounded-xl border border-border/60 bg-background/50 p-4 ${className || ""}`.trim()}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-foreground">Search Visibility Trend</p>
                    <p className="text-xs text-muted-foreground">
                        Impressions on the left axis, clicks on the right, with CTR and position in the tooltip.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-blue-600 dark:text-blue-300">
                        Impressions
                    </span>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-300">
                        Clicks
                    </span>
                </div>
            </div>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "currentColor" }}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            yAxisId="impressions"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "currentColor" }}
                            className="text-muted-foreground"
                            tickFormatter={formatCompactNumber}
                            width={54}
                        />
                        <YAxis
                            yAxisId="clicks"
                            orientation="right"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "currentColor" }}
                            className="text-muted-foreground"
                            tickFormatter={formatCompactNumber}
                            width={44}
                        />
                        <Tooltip content={<TrendTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
                        <Area
                            yAxisId="impressions"
                            type="monotone"
                            dataKey="impressions"
                            fill="rgba(59, 130, 246, 0.16)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                        />
                        <Line
                            yAxisId="clicks"
                            type="monotone"
                            dataKey="clicks"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 0, fill: "#10b981" }}
                            activeDot={{ r: 5 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
