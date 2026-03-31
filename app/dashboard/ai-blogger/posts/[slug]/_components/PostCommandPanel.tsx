"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { AIBloggerGlassCard } from "@/components/ai-blogger/AIBloggerPrimitives";
import { AIBloggerPostStatusControls } from "@/components/ai-blogger/AIBloggerPostStatusControls";
import {
    getBlogStudioBlockerSummary,
    getBlogStudioSeoScoreTone,
} from "@/lib/ai-blogger-presentation";
import {
    isBlogStudioDraftOnlyMode,
    shouldBlogStudioAutoSchedule,
} from "@/lib/ai-blogger-workflow";
import type {
    BlogStudioPostStatus,
    BlogStudioPublishValidation,
    BlogStudioPublishingSettings,
    BlogStudioSeoAudit,
    BlogStudioTargetType,
    BlogStudioWebhookStatus,
} from "@/lib/types";

function getNextActionHint(
    status: BlogStudioPostStatus,
    blockersCount: number,
    isReady: boolean,
    publishingSettings?: BlogStudioPublishingSettings,
): { tone: "amber" | "emerald" | "info"; message: string } {
    const workflowSettings = publishingSettings ? { publishing: publishingSettings } : undefined;

    if (status === "Published") {
        return { tone: "emerald", message: "This post is live. Monitor performance in the Refresh Queue." };
    }

    if (status === "Scheduled") {
        if (isBlogStudioDraftOnlyMode(workflowSettings)) {
            return { tone: "info", message: "Draft Only mode is enabled, so this post cannot move past the schedule queue." };
        }

        return { tone: "info", message: "Scheduled and waiting for the publish window." };
    }

    if (status === "Approved") {
        if (isBlogStudioDraftOnlyMode(workflowSettings)) {
            return { tone: "info", message: "Draft Only mode keeps approved content in the editorial queue." };
        }

        if (shouldBlogStudioAutoSchedule(workflowSettings)) {
            return { tone: "info", message: "Approved. The next step uses the default publish window and moves it into the schedule queue." };
        }

        return { tone: "info", message: "Approved. Move to Scheduled to set the publish date." };
    }

    if (status === "SEO Review" && blockersCount > 0) {
        return { tone: "amber", message: `Fix ${blockersCount} SEO blocker${blockersCount === 1 ? "" : "s"} in the SEO & Meta tab before advancing.` };
    }

    if (status === "SEO Review" && isReady) {
        return { tone: "emerald", message: "All SEO checks passed. Ready to move to Approved." };
    }

    if (status === "Research" || status === "Draft") {
        return { tone: "info", message: "Write or refine the content, then run an SEO review." };
    }

    return { tone: "info", message: "Review the content and advance the status when ready." };
}

export function PostCommandPanel({
    slug,
    status,
    targetType,
    targetLabel,
    scheduledFor,
    publishedUrl,
    publishedTargetUrl,
    deliveryStatus,
    deliveryError,
    deliveryAttemptedAt,
    audit,
    publishValidation,
    publishingSettings,
    auditScore,
    blockersCount,
    isReady,
    topSuggestions,
}: {
    slug: string;
    status: BlogStudioPostStatus;
    targetType: BlogStudioTargetType;
    targetLabel: string;
    scheduledFor?: string;
    publishedUrl?: string;
    publishedTargetUrl?: string;
    deliveryStatus?: BlogStudioWebhookStatus;
    deliveryError?: string;
    deliveryAttemptedAt?: string;
    audit?: BlogStudioSeoAudit;
    publishValidation?: BlogStudioPublishValidation;
    publishingSettings?: BlogStudioPublishingSettings;
    auditScore: number;
    blockersCount: number;
    isReady: boolean;
    topSuggestions: string[];
}) {
    const scoreTone = getBlogStudioSeoScoreTone(auditScore);
    const nextAction = getNextActionHint(status, blockersCount, isReady, publishingSettings);

    return (
        <div className="space-y-4">
            <AIBloggerGlassCard className={`p-4 ${
                nextAction.tone === "amber"
                    ? "border-amber-500/30 bg-amber-500/[0.04]"
                    : nextAction.tone === "emerald"
                        ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                        : "border-primary/25 bg-primary/[0.04]"
            }`}>
                <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                        nextAction.tone === "amber"
                            ? "border-amber-500/25 bg-amber-500/10 text-amber-500"
                            : nextAction.tone === "emerald"
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                                : "border-primary/25 bg-primary/10 text-primary"
                    }`}>
                        {nextAction.tone === "amber" ? (
                            <AlertCircle className="h-4 w-4" />
                        ) : nextAction.tone === "emerald" ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <ArrowRight className="h-4 w-4" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            nextAction.tone === "amber" ? "text-amber-500"
                            : nextAction.tone === "emerald" ? "text-emerald-500"
                            : "text-primary"
                        }`}>Next Action</p>
                        <p className="mt-0.5 text-xs leading-5 text-foreground/80">{nextAction.message}</p>
                    </div>
                </div>
            </AIBloggerGlassCard>

            <AIBloggerPostStatusControls
                slug={slug}
                status={status}
                targetType={targetType}
                targetLabel={targetLabel}
                scheduledFor={scheduledFor}
                publishedUrl={publishedUrl}
                publishedTargetUrl={publishedTargetUrl}
                deliveryStatus={deliveryStatus}
                deliveryError={deliveryError}
                deliveryAttemptedAt={deliveryAttemptedAt}
                audit={audit}
                publishValidation={publishValidation}
                publishingSettings={publishingSettings}
            />

            <AIBloggerGlassCard className="p-5">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">SEO Health</h3>
                        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                            scoreTone === "emerald"
                                ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-500"
                                : scoreTone === "amber"
                                    ? "border-amber-500/25 bg-amber-500/8 text-amber-500"
                                    : "border-primary/25 bg-primary/8 text-primary"
                        }`}>
                            {isReady ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {auditScore}/100
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative h-20 w-20 shrink-0">
                            <svg className="h-full w-full -rotate-90 transform">
                                <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="8" className="text-foreground" />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="32"
                                    fill="none"
                                    stroke="url(#cmd-score-grad)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(auditScore / 100) * 201} 201`}
                                />
                                <defs>
                                    <linearGradient id="cmd-score-grad" x1="0%" x2="100%" y1="0%" y2="0%">
                                        <stop offset="0%" stopColor="rgb(212 160 10)" />
                                        <stop offset="100%" stopColor="rgb(251 191 36)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl font-bold">{auditScore}</span>
                            </div>
                        </div>

                        <div className="space-y-2 min-w-0">
                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                                blockersCount > 0
                                    ? "border-amber-500/25 bg-amber-500/8 text-amber-600"
                                    : "border-emerald-500/25 bg-emerald-500/8 text-emerald-600"
                            }`}>
                                <Sparkles className="h-3 w-3" />
                                {getBlogStudioBlockerSummary(blockersCount)}
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">
                                {isReady
                                    ? "All required checks passed. Ready to advance."
                                    : "Fix blockers in the SEO & Meta tab."}
                            </p>
                        </div>
                    </div>

                    {topSuggestions.length > 0 && (
                        <div className="space-y-2 border-t border-border/50 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Top Priorities</p>
                            {topSuggestions.slice(0, 2).map((suggestion) => (
                                <div key={suggestion} className="rounded-[16px] border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs leading-5 text-foreground">
                                    {suggestion}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </AIBloggerGlassCard>
        </div>
    );
}
