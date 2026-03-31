import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type AIBloggerSuperAdminScopeAction = {
    href: string;
    label: string;
    variant?: "primary" | "secondary";
};

export type AIBloggerSuperAdminScopeCard = {
    title: string;
    items: string[];
};

type AIBloggerSuperAdminScopePageProps = {
    icon: LucideIcon;
    eyebrow: string;
    title: string;
    description: string;
    statusLabel: string;
    backHref?: string;
    backLabel?: string;
    contextNote?: string;
    actions: AIBloggerSuperAdminScopeAction[];
    cards: AIBloggerSuperAdminScopeCard[];
};

function getActionClasses(variant: "primary" | "secondary" = "secondary") {
    if (variant === "primary") {
        return "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90";
    }

    return "inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted";
}

export function AIBloggerSuperAdminScopePage({
    icon: Icon,
    eyebrow,
    title,
    description,
    statusLabel,
    backHref = "/super-admin/ai-blogger",
    backLabel = "Back to AI Blogger",
    contextNote,
    actions,
    cards,
}: AIBloggerSuperAdminScopePageProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel}
                </Link>

                <Card className="border-border/70">
                    <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        {eyebrow}
                                    </p>
                                    <div>
                                        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
                                        <CardDescription className="mt-2 max-w-3xl text-sm leading-6">
                                            {description}
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>

                            <Badge variant="outline" className="rounded-full px-3 py-1">
                                {statusLabel}
                            </Badge>
                        </div>

                        {contextNote ? (
                            <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
                                {contextNote}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                            {actions.map((action) => (
                                <Link
                                    key={`${action.href}-${action.label}`}
                                    href={action.href}
                                    className={getActionClasses(action.variant)}
                                >
                                    {action.label}
                                </Link>
                            ))}
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                {cards.map((card) => (
                    <Card key={card.title} className="border-border/70">
                        <CardHeader>
                            <CardTitle className="text-lg">{card.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {card.items.map((item) => (
                                <div
                                    key={`${card.title}-${item}`}
                                    className="rounded-xl border border-border/60 bg-background px-3 py-3 text-sm leading-6 text-muted-foreground"
                                >
                                    {item}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
