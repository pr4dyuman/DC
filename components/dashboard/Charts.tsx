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

const COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#fb7185'];

export function ProjectDistributionChart({ data }: { data: ProjectDistributionPoint[] }) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Project Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] sm:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
