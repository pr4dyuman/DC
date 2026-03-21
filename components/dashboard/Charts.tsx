"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/context/CurrencyContext";

interface RevenueChartPoint {
    [key: string]: string | number;
    name: string;
    revenue: number;
    expenses: number;
}

interface ProjectDistributionPoint {
    [key: string]: string | number;
    name: string;
    value: number;
}

interface RevenueChartProps {
    data: RevenueChartPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    const { symbol } = useCurrency();
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[250px] sm:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${symbol}${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: 'var(--card)', color: 'var(--card-foreground)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                            />
                            <Bar dataKey="revenue" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Revenue" />
                            <Bar dataKey="expenses" fill="#fb7185" radius={[4, 4, 0, 0]} name="Expenses" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

// Semantic colors keyed to project status values
const STATUS_COLORS: Record<string, string> = {
    Active: '#34d399',      // emerald
    Completed: '#a78bfa',   // violet
    'On Hold': '#fbbf24',   // amber
    Paused: '#60a5fa',      // blue
    Archived: '#6b7280',    // gray
    Unknown: '#fb7185',     // rose
};

const DEFAULT_COLOR = '#a78bfa';

interface StatusTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: ProjectDistributionPoint }>;
}

function StatusTooltip({ active, payload }: StatusTooltipProps) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0].payload;
    const total = payload[0].payload._total as number | undefined;
    const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
    return (
        <div style={{ backgroundColor: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontSize: 13 }}>
            <p style={{ fontWeight: 600, marginBottom: 2 }}>{name}</p>
            <p>{value} project{value !== 1 ? 's' : ''}{pct !== null ? ` (${pct}%)` : ''}</p>
        </div>
    );
}

export function ProjectDistributionChart({ data }: { data: ProjectDistributionPoint[] }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    // Attach total to each entry so the tooltip can compute percentages
    const enriched = data.map((d) => ({ ...d, _total: total }));

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Projects by Status</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] sm:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={enriched}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {enriched.map((entry) => (
                                    <Cell
                                        key={`cell-${entry.name}`}
                                        fill={STATUS_COLORS[entry.name] ?? DEFAULT_COLOR}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<StatusTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
