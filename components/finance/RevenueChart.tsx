"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface RevenueChartProps {
    data: {
        name: string;
        income: number;
        expense: number;
    }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
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
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: 'var(--card)', color: 'var(--card-foreground)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                        />
                        <Legend />
                        <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} name="Income" />
                        <Bar dataKey="expense" fill="#fb7185" radius={[4, 4, 0, 0]} name="Expense" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
