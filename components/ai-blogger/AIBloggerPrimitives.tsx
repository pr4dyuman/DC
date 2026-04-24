import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AIBloggerGlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
    glow?: boolean;
    hover?: boolean;
};

export function AIBloggerGlassCard({
    className,
    glow = false,
    hover = true,
    children,
    ...props
}: AIBloggerGlassCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground",
                "shadow-sm",
                hover && "transition-all duration-300 hover:border-primary/25 hover:shadow-md",
                glow && "border-primary/30 ring-1 ring-primary/10",
                className
            )}
            {...props}
        >
            <div className="relative">{children}</div>
        </div>
    );
}

interface AIBloggerGradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    size?: "sm" | "default" | "lg";
    variant?: "primary" | "outline" | "ghost";
}

export const AIBloggerGradientButton = React.forwardRef<HTMLButtonElement, AIBloggerGradientButtonProps>(
    ({ className, asChild = false, size = "default", variant = "primary", children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";

        const sizeClasses = {
            sm: "h-10 px-4 text-sm",
            default: "h-12 px-5 text-sm",
            lg: "h-14 px-6 text-base",
        };

        const variantClasses = {
            primary: [
                "border border-primary bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-all duration-200",
            ].join(" "),
            outline: [
                "border border-border bg-background text-foreground",
                "hover:border-primary/30 hover:bg-accent hover:text-foreground transition-all duration-200",
            ].join(" "),
            ghost: "border border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200",
        };

        return (
            <Comp
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    "disabled:pointer-events-none disabled:opacity-50",
                    sizeClasses[size],
                    variantClasses[variant],
                    className
                )}
                {...props}
            >
                {children}
            </Comp>
        );
    }
);

AIBloggerGradientButton.displayName = "AIBloggerGradientButton";

export function AIBloggerSectionEyebrow({
    className,
    children,
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary",
                className
            )}
        >
            {children}
        </div>
    );
}

type AIBloggerMetricCardProps = {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
    note: string;
    tone?: "primary" | "emerald" | "blue" | "violet";
};

const metricToneMap: Record<NonNullable<AIBloggerMetricCardProps["tone"]>, string> = {
    primary: "border-primary/15 bg-primary/10 text-primary",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    blue: "border-sky-500/20 bg-sky-500/10 text-sky-500",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-500",
};

export function AIBloggerMetricCard({
    icon: Icon,
    label,
    value,
    note,
    tone = "primary",
}: AIBloggerMetricCardProps) {
    return (
        <AIBloggerGlassCard className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                    <p className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
                    <p className="max-w-xs text-xs leading-5 text-muted-foreground sm:text-sm">{note}</p>
                </div>
                <div
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border transition-transform duration-300",
                        metricToneMap[tone]
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}
