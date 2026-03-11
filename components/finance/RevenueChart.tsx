"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useCurrency } from "@/context/CurrencyContext";

interface RevenueChartProps {
    data: {
        name: string;
        income: number;
        expense: number;
    }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    const { symbol } = useCurrency();
    return (
        <Card>
            <CardHeader>
                <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${symbol}${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                color: 'hsl(var(--card-foreground))',
                                borderRadius: '8px',
                                border: '1px solid hsl(var(--border))',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}
                            labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                            itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                        />
                        <Legend
                            formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
                        />
                        <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} name="Income" />
                        <Bar dataKey="expense" fill="#fb7185" radius={[4, 4, 0, 0]} name="Expense" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
