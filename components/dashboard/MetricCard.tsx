import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface MetricCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
    iconColor?: string;
    href?: string;
}

export function MetricCard({ title, value, description, icon: Icon, trend, iconColor = "text-amber-500", href }: MetricCardProps) {
    const card = (
        <Card className={`transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 ${href ? 'hover:border-indigo-500/50 cursor-pointer' : 'hover:border-amber-500/30'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="rounded-md bg-amber-500/10 p-1.5">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{value}</span>
                    {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                    {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
                {href && <p className="text-xs text-indigo-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View details →</p>}
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href} className="group block">
                {card}
            </Link>
        );
    }

    return card;
}
