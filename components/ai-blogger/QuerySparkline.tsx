"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { BlogStudioPerformanceSnapshot } from "@/lib/types-ai-blogger";

type QuerySparklineProps = {
    query: string;
    history: BlogStudioPerformanceSnapshot[];
};

export function QuerySparkline({ query, history }: QuerySparklineProps) {
    const data = useMemo(() => {
        if (!history || history.length === 0) return [];

        // Extract click data for this specific query from history
        const queryHistory = history
            .map((snapshot) => {
                const queryData = snapshot.topQueries.find(
                    (q) => q.query.toLowerCase() === query.toLowerCase(),
                );
                return {
                    date: new Date(snapshot.endDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                    }),
                    clicks: queryData?.clicks || 0,
                };
            })
            .reverse();

        return queryHistory;
    }, [query, history]);

    if (data.length === 0 || data.every((d) => d.clicks === 0)) {
        return <span className="text-[10px] text-muted-foreground">No trend data</span>;
    }

    const maxClicks = Math.max(...data.map((d) => d.clicks), 1);

    return (
        <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="5%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0.3}
                            />
                            <stop
                                offset="95%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, Math.ceil(maxClicks * 1.1)]} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            padding: "4px 8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [`${value} clicks`, "Clicks"]}
                        cursor={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        fill="url(#colorClicks)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
