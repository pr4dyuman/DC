import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, FilePenLine, Lock, Sparkles, Zap } from "lucide-react";

import type { AIBloggerAccessState } from "@/lib/ai-blogger-access";
import { Badge } from "@/components/ui/badge";
import { AIBloggerGlassCard, AIBloggerGradientButton } from "@/components/ai-blogger/AIBloggerPrimitives";

const lockedCopy: Record<Exclude<AIBloggerAccessState["reason"], "ok" | "client">, { title: string; description: string }> = {
    role: {
        title: "AI Blogger is reserved for admins.",
        description: "Only the agency admin can open generation, approvals, scheduling, and publishing controls.",
    },
    trial: {
        title: "AI Blogger stays locked during the trial.",
        description: "AI Blogger unlocks on an active Pro or Enterprise plan after the trial period ends.",
    },
    plan: {
        title: "AI Blogger needs a Pro or Enterprise plan.",
        description: "Upgrade to Pro or Enterprise to unlock AI Blogger.",
    },
    inactive: {
        title: "This account needs an active plan before AI Blogger can run.",
        description: "Reactivate the subscription first, then AI Blogger will unlock for the admin account.",
    },
    feature: {
        title: "AI Blogger is not enabled for this workspace.",
        description: "Ask a super-admin to enable the AI Blogger feature for this agency.",
    },
};

const featureItems = [
    {
        icon: Sparkles,
        label: "AI-assisted draft creation",
        note: "Generate publication-ready blog posts from a URL, trend, or keyword cluster.",
    },
    {
        icon: FilePenLine,
        label: "Editorial review workflow",
        note: "Move posts through Draft -> SEO Review -> Approved -> Scheduled -> Published.",
    },
    {
        icon: BarChart3,
        label: "SEO scoring and audit",
        note: "Built-in live SEO health checks, blockers, internal links, and schema validation.",
    },
    {
        icon: CalendarClock,
        label: "Scheduling and export tools",
        note: "Schedule for publishing or export to any external platform.",
    },
];

export function AIBloggerLockedState({ access }: { access: AIBloggerAccessState }) {
    if (access.reason === "ok" || access.reason === "client") {
        return null;
    }

    const copy = lockedCopy[access.reason];

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            {/* Main locked card */}
            <AIBloggerGlassCard className="overflow-hidden border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-background to-background p-6 sm:p-8">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        {/* Animated halo behind the lock */}
                        <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-60" />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-500">
                            <Lock className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400">
                            Pro Feature
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-amber-500/25 text-amber-600 dark:text-amber-400">
                            Locked
                        </Badge>
                    </div>
                </div>

                <div className="mt-6 space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Unlock AI Blogger</h2>
                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                        {copy.title} {copy.description}
                    </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {["SEO-optimised drafts", "Editorial queue", "Publish & schedule"].map((item) => (
                        <div
                            key={item}
                            className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300"
                        >
                            {item}
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <AIBloggerGradientButton asChild size="lg">
                        <Link href="/contact">
                            Talk To Us About Access
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </AIBloggerGradientButton>
                    <AIBloggerGradientButton asChild variant="outline">
                        <Link href="/dashboard">Back To Dashboard</Link>
                    </AIBloggerGradientButton>
                </div>
            </AIBloggerGlassCard>

            {/* Feature list card */}
            <AIBloggerGlassCard className="p-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Zap className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">What AI Blogger Includes</p>
                        <p className="text-xs text-muted-foreground">Core features on Pro &amp; Enterprise.</p>
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    {featureItems.map((item) => (
                        <div
                            key={item.label}
                            className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3.5"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary">
                                <item.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold">{item.label}</p>
                                <p className="text-xs leading-5 text-muted-foreground">{item.note}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </AIBloggerGlassCard>
        </div>
    );
}
