"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ExternalLink, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
    publishBlogStudioPost,
    deleteBlogStudioPost,
    refreshBlogStudioPostGroundedResearch,
    resolveBlogStudioPostBlockersWithAI,
    updateBlogStudioPostStatus,
} from "@/lib/actions";
import {
    getBlogStudioStatusTransitionLabel,
    getNextBlogStudioPostStatus,
    isBlogStudioDraftOnlyMode,
    shouldBlogStudioAutoSchedule,
} from "@/lib/ai-blogger-workflow";
import type {
    BlogStudioBlockerResolutionPreview,
    BlogStudioBlockerResolutionResult,
    BlogStudioPostStatus,
    BlogStudioPublishValidation,
    BlogStudioPublishingSettings,
    BlogStudioResolvedBlocker,
    BlogStudioSeoAudit,
    BlogStudioTargetType,
    BlogStudioWebhookStatus,
} from "@/lib/types";
import { formatBlogStudioDate, getBlogStudioTargetTypeLabel } from "@/lib/ai-blogger-presentation";
import {
    AIBloggerGlassCard,
    AIBloggerGradientButton,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function toDateTimeLocalValue(iso?: string) {
    if (!iso) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(10, 0, 0, 0);
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
    }

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

type AIBloggerPostStatusControlsProps = {
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
    blockerResolutionPreview?: BlogStudioBlockerResolutionPreview;
    compact?: boolean;
};

type BlockerResolutionClientResult = Pick<
    BlogStudioBlockerResolutionResult,
    "changedFields" | "blockersAfter" | "aiFixed" | "remainingHuman" | "remainingSystem" | "summary"
>;

const BLOCKER_RESOLUTION_STORAGE_PREFIX = "ai-blogger:blocker-resolution:";

function getBlockerResolutionStorageKey(slug: string) {
    return `${BLOCKER_RESOLUTION_STORAGE_PREFIX}${slug}`;
}

function getBlockerPreviewSignature(preview?: BlogStudioBlockerResolutionPreview | null) {
    if (!preview) {
        return "none";
    }

    const serialize = (items: BlogStudioResolvedBlocker[]) =>
        items
            .map((item) => `${item.key}:${item.resolutionKind}:${item.category}:${item.source}`)
            .sort()
            .join("|");

    return [
        `blocking:${preview.hasBlockingIssues ? "1" : "0"}`,
        `ai:${serialize(preview.aiFixable || [])}`,
        `human:${serialize(preview.humanRequired || [])}`,
        `system:${serialize(preview.systemRequired || [])}`,
    ].join("::");
}

function BlockerResolutionList({
    title,
    blockers,
    tone,
}: {
    title: string;
    blockers: BlogStudioResolvedBlocker[];
    tone: "emerald" | "amber" | "destructive" | "primary";
}) {
    if (blockers.length === 0) {
        return null;
    }

    const toneClasses =
        tone === "emerald"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : tone === "amber"
                ? "border-amber-500/20 bg-amber-500/5"
                : tone === "destructive"
                    ? "border-destructive/20 bg-destructive/5"
                    : "border-primary/20 bg-primary/5";

    return (
        <div className={`rounded-[22px] border px-4 py-3 ${toneClasses}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <div className="mt-3 space-y-2">
                {blockers.map((blocker) => (
                    <div key={`${title}-${blocker.key}`} className="rounded-[18px] border border-border/50 bg-background/70 px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em]">
                                {blocker.category}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">{blocker.message}</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{blocker.fixHint}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AIBloggerPostStatusControls({
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
    blockerResolutionPreview,
    compact = false,
}: AIBloggerPostStatusControlsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [scheduledValue, setScheduledValue] = useState(toDateTimeLocalValue(scheduledFor));
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteWithPublished, setDeleteWithPublished] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeAction, setActiveAction] = useState<"advance" | "fix-blockers" | "refresh-research" | null>(null);
    const [blockerResolutionResult, setBlockerResolutionResult] = useState<BlockerResolutionClientResult | null>(null);
    const blockerResolutionStorageKey = getBlockerResolutionStorageKey(slug);
    const liveBlockerPreviewSignature = useMemo(
        () => getBlockerPreviewSignature(blockerResolutionPreview),
        [blockerResolutionPreview],
    );

    const workflowSettings = publishingSettings ? { publishing: publishingSettings } : undefined;
    const draftOnlyMode = isBlogStudioDraftOnlyMode(workflowSettings);
    const draftOnlyStopsWorkflow = draftOnlyMode && (status === "Approved" || status === "Scheduled");
    const nextStatus = draftOnlyStopsWorkflow ? null : getNextBlogStudioPostStatus(status);
    const actionLabel = draftOnlyStopsWorkflow ? null : getBlogStudioStatusTransitionLabel(status);
    const autoScheduleEnabled = nextStatus === "Scheduled" && shouldBlogStudioAutoSchedule(workflowSettings);
    const needsScheduleInput = nextStatus === "Scheduled" && !autoScheduleEnabled;
    const publishesToWebhook = nextStatus === "Published" && targetType === "webhook";
    const readyForManualExport = status === "Scheduled" && targetType === "manual-export";
    const workflowComplete = status === "Published" || readyForManualExport || draftOnlyStopsWorkflow;
    const blockingStatuses = nextStatus === "Approved" || nextStatus === "Scheduled";
    const readinessBlockers = blockingStatuses ? (audit?.blockers || []) : [];
    const publishBlocked = publishesToWebhook && publishValidation && !publishValidation.canPublish;
    const aiFixableBlockers = blockerResolutionPreview?.aiFixable || [];
    const hasAiFixableBlockers = status !== "Published" && Boolean(blockerResolutionPreview?.hasAiFixable);
    const claimsGroundingCheck = audit?.checks.find((check) => check.key === "claims-grounding" && !check.passed) ?? null;
    const canRefreshGroundedResearch = status !== "Published" && Boolean(claimsGroundingCheck);
    const needsHumanOrSystemFixesOnly =
        status !== "Published" &&
        Boolean(blockerResolutionPreview?.hasBlockingIssues) &&
        !Boolean(blockerResolutionPreview?.hasAiFixable) &&
        !canRefreshGroundedResearch;
    const hasActiveAction = activeAction !== null;
    const isAdvancing = activeAction === "advance";
    const isResolvingBlockers = activeAction === "fix-blockers";
    const isRefreshingGroundedResearch = activeAction === "refresh-research";
    const wordRangeWarning = audit?.checks.find((check) => check.key === "word-range" && !check.passed) ?? null;
    const publishWarnings = publishesToWebhook ? (publishValidation?.warnings || []) : [];
    const publishedHref = useMemo(() => {
        const candidate = publishedUrl?.trim() || "";
        if (!candidate) {
            return "";
        }

        return candidate;
    }, [publishedUrl]);
    const canDeleteLocalPublishedCopy = useMemo(() => {
        if (status !== "Published" || !publishedTargetUrl || typeof window === "undefined") {
            return false;
        }

        try {
            const parsedTarget = new URL(publishedTargetUrl);
            return parsedTarget.pathname.replace(/\/+$/, "") === "/api/blogs/webhook"
                && parsedTarget.origin === window.location.origin;
        } catch {
            return false;
        }
    }, [publishedTargetUrl, status]);
    const summaryText = useMemo(() => {
        if (status === "Published") {
            return "This post has reached the end of the current editorial workflow.";
        }

        if (draftOnlyStopsWorkflow) {
            return "Draft Only mode keeps this post in the editorial queue. Switch the workspace publish mode to continue scheduling or publishing.";
        }

        if (readyForManualExport) {
            return "This draft is scheduled in the queue. Use Copy Draft or Export Markdown to publish it on your own platform.";
        }

        if (publishesToWebhook) {
            return "This will publish to the configured webhook target and mark the AI Blogger post as published.";
        }

        if (needsScheduleInput) {
            return "Choose the publish window now, then move the draft into the scheduled queue.";
        }

        if (autoScheduleEnabled) {
            return "This will move the draft into the schedule queue using the default publish window.";
        }

        if (blockingStatuses && readinessBlockers.length > 0) {
            return "The workflow step is ready, but the draft still has required SEO blockers that must be fixed first.";
        }

        return "Move the post forward one step without affecting anything outside AI Blogger.";
    }, [
        autoScheduleEnabled,
        blockingStatuses,
        draftOnlyStopsWorkflow,
        needsScheduleInput,
        publishesToWebhook,
        readinessBlockers.length,
        readyForManualExport,
        status,
    ]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const stored = window.sessionStorage.getItem(blockerResolutionStorageKey);
        if (!stored) {
            return;
        }

        try {
            setBlockerResolutionResult(JSON.parse(stored) as BlockerResolutionClientResult);
        } catch {
            window.sessionStorage.removeItem(blockerResolutionStorageKey);
            return;
        }

        window.sessionStorage.removeItem(blockerResolutionStorageKey);
    }, [blockerResolutionStorageKey]);

    useEffect(() => {
        if (!blockerResolutionResult || typeof window === "undefined") {
            return;
        }

        const resultSignature = getBlockerPreviewSignature(blockerResolutionResult.blockersAfter);
        if (resultSignature === liveBlockerPreviewSignature) {
            return;
        }

        setBlockerResolutionResult(null);
        window.sessionStorage.removeItem(blockerResolutionStorageKey);
    }, [blockerResolutionResult, blockerResolutionStorageKey, liveBlockerPreviewSignature]);

    const clearBlockerResolutionResult = () => {
        setBlockerResolutionResult(null);

        if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(blockerResolutionStorageKey);
        }
    };

    const handleAdvance = () => {
        if (!nextStatus || !actionLabel) {
            return;
        }

        if (blockingStatuses && readinessBlockers.length > 0) {
            toast.error(`Fix the SEO blockers before moving to ${nextStatus}.`);
            return;
        }

        if (publishBlocked) {
            toast.error(`Fix the publish blockers before publishing. ${publishValidation.summary}`);
            return;
        }

        if (needsScheduleInput && !scheduledValue) {
            setError("Choose a schedule date and time before moving this post to Scheduled.");
            return;
        }

        setError("");

        setActiveAction("advance");
        startTransition(async () => {
            try {
                if (publishesToWebhook) {
                    await publishBlogStudioPost(slug);
                    toast.success("Published to webhook target");
                    if (wordRangeWarning) {
                        toast("Published with warning: word count is outside the target range.");
                    }
                } else {
                    await updateBlogStudioPostStatus(slug, {
                        status: nextStatus,
                        scheduledFor: nextStatus === "Scheduled" && scheduledValue ? new Date(scheduledValue).toISOString() : undefined,
                        expectedCurrentStatus: status,
                    });
                    toast.success(`${nextStatus} status saved`);
                    if (nextStatus === "Approved" && wordRangeWarning) {
                        toast("Approved with warning: word count is outside the target range.");
                    }
                }
                router.refresh();
            } catch (submitError: unknown) {
                const message = submitError instanceof Error ? submitError.message : "Failed to update post status";
                const shouldRefreshAfterError =
                    message.includes("Server Components render") ||
                    message.includes("Cannot move a");
                const surfacedMessage = message.includes("Server Components render")
                    ? "The editor hit a temporary refresh issue. Reloading the latest draft state."
                    : message;
                setError(surfacedMessage);
                toast.error(surfacedMessage);
                if (shouldRefreshAfterError) {
                    router.refresh();
                }
            } finally {
                setActiveAction(null);
            }
        });
    };

    const handleFixBlockers = () => {
        if (!hasAiFixableBlockers) {
            toast.error("No AI-fixable blockers are available on this draft.");
            return;
        }

        setError("");
        clearBlockerResolutionResult();

        setActiveAction("fix-blockers");
        startTransition(async () => {
            try {
                const result = await resolveBlogStudioPostBlockersWithAI(slug);
                const nextResult: BlockerResolutionClientResult = {
                    changedFields: result.changedFields,
                    blockersAfter: result.blockersAfter,
                    aiFixed: result.aiFixed,
                    remainingHuman: result.remainingHuman,
                    remainingSystem: result.remainingSystem,
                    summary: result.summary,
                };

                setBlockerResolutionResult(nextResult);

                if (typeof window !== "undefined") {
                    window.sessionStorage.setItem(blockerResolutionStorageKey, JSON.stringify(nextResult));
                }

                if (result.aiFixed.length > 0) {
                    toast.success(result.summary);
                } else {
                    toast(result.summary);
                }

                router.refresh();
            } catch (resolveError: unknown) {
                const message = resolveError instanceof Error ? resolveError.message : "Failed to resolve blockers with AI";
                setError(message);
                toast.error(message);
            } finally {
                setActiveAction(null);
            }
        });
    };

    const handleRefreshGroundedResearch = () => {
        if (!canRefreshGroundedResearch) {
            toast.error("This draft does not need a grounded-research refresh right now.");
            return;
        }

        setError("");
        clearBlockerResolutionResult();

        setActiveAction("refresh-research");
        startTransition(async () => {
            try {
                const result = await refreshBlogStudioPostGroundedResearch(slug);
                if (result.claimsGroundingCleared) {
                    toast.success(result.summary);
                } else if (result.draftUpdated) {
                    toast(result.summary);
                } else {
                    toast.error(result.summary);
                }
                router.refresh();
            } catch (refreshError: unknown) {
                const message = refreshError instanceof Error ? refreshError.message : "Failed to rerun grounded research";
                setError(message);
                toast.error(message);
            } finally {
                setActiveAction(null);
            }
        });
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteBlogStudioPost(slug, deleteWithPublished);
            const message = deleteWithPublished
                ? result.deletedPublished
                    ? "Post and published content deleted"
                    : "Post deleted. No local published copy needed removal."
                : "Post deleted";
            toast.success(message);
            router.push("/dashboard/ai-blogger/posts");
        } catch (deleteError: unknown) {
            const message = deleteError instanceof Error ? deleteError.message : "Failed to delete post";
            toast.error(message);
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    if (compact) {
        if (workflowComplete) {
            return (
                <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {draftOnlyStopsWorkflow ? "Draft Only Mode" : readyForManualExport ? "Ready For Manual Export" : "Workflow Complete"}
                </div>
            );
        }

        if (!nextStatus || !actionLabel) {
            return null;
        }

        if (needsScheduleInput) {
            return (
                <div className="rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm text-muted-foreground">
                    Set the schedule in the workflow panel below
                </div>
            );
        }

        const isDisabled = hasActiveAction || (blockingStatuses && readinessBlockers.length > 0) || publishBlocked;

        return (
            <div className="flex flex-col gap-2">
                <AIBloggerGradientButton
                    type="button"
                    onClick={handleAdvance}
                    disabled={isDisabled}
                    className="h-11 px-6 text-base"
                >
                    {isAdvancing ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {publishesToWebhook ? "Publishing" : "Saving"}
                        </>
                    ) : (
                        <>
                            {publishesToWebhook ? "Publish To Webhook Target" : actionLabel}
                        </>
                    )}
                </AIBloggerGradientButton>
                {blockingStatuses && readinessBlockers.length > 0 && (
                    <div
                        className="px-1 text-center text-xs font-medium uppercase tracking-[0.1em] text-amber-600"
                        title={`Blockers: ${readinessBlockers.slice(0, 3).join(", ")}${readinessBlockers.length > 3 ? "..." : ""}`}
                    >
                        ⚠️ {readinessBlockers.length} blocker{readinessBlockers.length === 1 ? "" : "s"} • Complete SEO review below
                    </div>
                )}
            </div>
        );
    }

    return (
        <AIBloggerGlassCard className="p-6 overflow-visible">
            <div className="space-y-5">
                <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        Status Actions
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">{summaryText}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Stage</p>
                        <div className="mt-3">
                            <Badge variant="outline" className="rounded-full">
                                {status}
                            </Badge>
                        </div>
                    </div>
                    <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next Stage</p>
                        <div className="mt-3">
                            <Badge variant="outline" className="rounded-full">
                                {draftOnlyStopsWorkflow
                                    ? "Draft Only Mode"
                                    : readyForManualExport
                                    ? "Ready For Manual Export"
                                    : publishesToWebhook
                                        ? "Publish To Webhook Target"
                                        : nextStatus || "Published"}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4 text-sm leading-6 text-muted-foreground">
                    Publish target: <span className="font-medium text-foreground">{targetLabel}</span> via{" "}
                    {getBlogStudioTargetTypeLabel(targetType)}
                </div>

                {status === "Scheduled" && scheduledFor ? (
                    <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                        Scheduled for {formatBlogStudioDate(scheduledFor, true)}
                    </div>
                ) : null}

                {status === "Published" && (publishedHref || deliveryStatus === "success") ? (
                    <div className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/8 px-4 py-4 text-sm text-emerald-600">
                        Last webhook delivery succeeded.
                        {publishedHref ? (
                            <>
                                {" "}
                                <a
                                    href={publishedHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
                                >
                                    Open published page
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </>
                        ) : null}
                    </div>
                ) : null}

                {deliveryStatus === "failed" && deliveryError ? (
                    <div className="rounded-[24px] border border-destructive/25 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-medium text-foreground">Last webhook delivery failed</p>
                                <p className="mt-1.5 leading-6">{deliveryError}</p>
                                {deliveryAttemptedAt ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Attempted {formatBlogStudioDate(deliveryAttemptedAt, true)}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                {needsScheduleInput ? (
                    <div className="space-y-2">
                        <Label htmlFor="ai-blogger-scheduled-for" className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-primary" />
                            Schedule Date And Time
                        </Label>
                        <Input
                            id="ai-blogger-scheduled-for"
                            type="datetime-local"
                            value={scheduledValue}
                            onChange={(event) => setScheduledValue(event.target.value)}
                            className="h-12 rounded-2xl border-border/60 bg-background/60"
                        />
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                {readinessBlockers.length > 0 ? (
                    <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/8 px-4 py-4 text-sm text-amber-700 dark:text-amber-300">
                        <p className="font-medium text-foreground">Approval blockers</p>
                        <p className="mt-2 leading-6">
                            {readinessBlockers.length === 1
                                ? `Fix this before continuing: ${readinessBlockers[0]}.`
                                : `Fix these before continuing: ${readinessBlockers.slice(0, 3).join(", ")}.`}
                        </p>
                    </div>
                ) : null}

                {!publishBlocked && wordRangeWarning ? (
                    <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-700 dark:text-amber-300">
                        <p className="font-medium text-foreground">Non-blocking warning</p>
                        <p className="mt-2 leading-6">{wordRangeWarning.detail}</p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            You can continue anyway, but this post is outside the recommended SEO word range.
                        </p>
                    </div>
                ) : null}

                {(publishBlocked || publishWarnings.length > 0) && publishValidation ? (
                    <div className="space-y-3">
                        {publishBlocked ? (
                            <>
                                <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                                    <p className="font-medium text-foreground">Publish Blockers</p>
                                    <p className="mt-2 leading-6">{publishValidation.summary}</p>
                                </div>
                                {publishValidation.blockers.slice(0, 5).map((blocker, index) => (
                                    <div
                                        key={`publish-blocker-${index}`}
                                        className="rounded-[22px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="rounded-full border-destructive/30 text-[10px] uppercase tracking-[0.16em] text-destructive">
                                                {blocker.category}
                                            </Badge>
                                            <span className="font-medium text-foreground">{blocker.message}</span>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{blocker.fixHint}</p>
                                    </div>
                                ))}
                            </>
                        ) : null}
                        {publishWarnings.length > 0 ? (
                            <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-700 dark:text-amber-300">
                                <p className="font-medium text-foreground">{publishWarnings.length} warning(s) to review</p>
                                <p className="mt-2 leading-6">
                                    {publishWarnings.slice(0, 3).map((w) => w.message).join(". ")}
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {hasAiFixableBlockers ? (
                    <div className="rounded-[24px] border border-primary/20 bg-primary/5 px-4 py-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">Fix blockers with AI</p>
                                <p className="mt-1.5 leading-6 text-muted-foreground">
                                    AI can work on {aiFixableBlockers.length} blocker{aiFixableBlockers.length === 1 ? "" : "s"} right now, including {aiFixableBlockers.slice(0, 3).map((blocker) => blocker.category).join(", ")}.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {canRefreshGroundedResearch ? (
                    <div className="rounded-[24px] border border-primary/20 bg-primary/5 px-4 py-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">Rerun grounded research</p>
                                <p className="mt-1.5 leading-6 text-muted-foreground">
                                    This draft is missing usable claim support. Refreshing research will fetch a fresh source set from the current SERP results, reapply it to the saved draft, and rerun the claim-support check.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {isResolvingBlockers ? (
                    <div className="rounded-[24px] border border-primary/25 bg-primary/[0.06] px-4 py-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">AI is fixing blockers now</p>
                                <p className="mt-1.5 leading-6 text-muted-foreground">
                                    Reviewing the draft, rewriting safe sections, rebuilding metadata and links, then re-running validation.
                                </p>
                                <p className="mt-2 text-xs leading-5 text-primary">
                                    The post editor will refresh automatically with the updated draft when this finishes.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {isRefreshingGroundedResearch ? (
                    <div className="rounded-[24px] border border-primary/25 bg-primary/[0.06] px-4 py-4 text-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">Refreshing grounded research now</p>
                                <p className="mt-1.5 leading-6 text-muted-foreground">
                                    Pulling fresh SERP source URLs, rebuilding the grounded source pack, applying it to the current draft, and rerunning the claim-support audit.
                                </p>
                                <p className="mt-2 text-xs leading-5 text-primary">
                                    The editor will refresh automatically when the updated draft and sources are stored.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {needsHumanOrSystemFixesOnly ? (
                    <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Remaining blockers need review outside AI</p>
                        <p className="mt-2 leading-6">
                            {blockerResolutionPreview?.humanRequiredCount || 0} need human review and {blockerResolutionPreview?.systemRequiredCount || 0} need settings or workflow changes.
                        </p>
                    </div>
                ) : null}

                <div className="flex flex-col items-start gap-4 pt-2">
                    <p className="max-w-md text-sm leading-6 text-muted-foreground">
                        {workflowComplete
                            ? draftOnlyStopsWorkflow
                                ? "Draft Only mode stops this post before scheduling or external publishing."
                                : targetType === "webhook"
                                ? "This post has completed the publishing workflow."
                                : "Use Copy Draft or Export Markdown above to publish on your own site or CMS."
                            : nextStatus
                            ? publishesToWebhook
                                ? "This publishes to the configured webhook target and syncs the AI Blogger record."
                                : autoScheduleEnabled
                                    ? "This will place the post in the schedule queue using the default publish window."
                                : "This only updates the AI Blogger record."
                            : "No further workflow steps remain."}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        {!workflowComplete && nextStatus && actionLabel ? (
                            <AIBloggerGradientButton type="button" onClick={handleAdvance} disabled={hasActiveAction || (blockingStatuses && readinessBlockers.length > 0) || publishBlocked}>
                                {isAdvancing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {publishesToWebhook ? "Publishing" : "Saving"}
                                    </>
                                ) : (
                                    <>
                                        {publishesToWebhook ? "Publish To Webhook Target" : actionLabel}
                                    </>
                                )}
                            </AIBloggerGradientButton>
                        ) : (
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm font-medium text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                                {draftOnlyStopsWorkflow ? "Draft Only Mode" : readyForManualExport ? "Ready For Manual Export" : "Workflow Complete"}
                            </div>
                        )}

                        {canRefreshGroundedResearch ? (
                            <AIBloggerGradientButton type="button" variant="outline" onClick={handleRefreshGroundedResearch} disabled={hasActiveAction}>
                                {isRefreshingGroundedResearch ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Refreshing Research
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Rerun Grounded Research
                                    </>
                                )}
                            </AIBloggerGradientButton>
                        ) : null}

                        {hasAiFixableBlockers ? (
                            <AIBloggerGradientButton type="button" variant="outline" onClick={handleFixBlockers} disabled={hasActiveAction}>
                                {isResolvingBlockers ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Fixing Blockers
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Fix Blockers With AI
                                    </>
                                )}
                            </AIBloggerGradientButton>
                        ) : null}
                    </div>

                    {blockerResolutionResult ? (
                        <div className="w-full rounded-[24px] border border-primary/20 bg-primary/[0.04] px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">AI Blocker Resolver</p>
                                    <p className="mt-1.5 text-sm leading-6 text-foreground">{blockerResolutionResult.summary}</p>
                                </div>
                                <Badge variant="outline" className="rounded-full border-primary/25 text-primary">
                                    {blockerResolutionResult.aiFixed.length} fixed
                                </Badge>
                            </div>

                            {blockerResolutionResult.changedFields.length > 0 ? (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Updated fields</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {blockerResolutionResult.changedFields.map((field) => (
                                            <Badge key={field} variant="outline" className="rounded-full">
                                                {field}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="mt-4 space-y-3">
                                <BlockerResolutionList title="Fixed This Pass" blockers={blockerResolutionResult.aiFixed} tone="emerald" />
                                <BlockerResolutionList title="Still AI-Fixable" blockers={blockerResolutionResult.blockersAfter.aiFixable} tone="primary" />
                                <BlockerResolutionList title="Needs Human Review" blockers={blockerResolutionResult.remainingHuman} tone="amber" />
                                <BlockerResolutionList title="Needs Settings Fix" blockers={blockerResolutionResult.remainingSystem} tone="destructive" />
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Delete Button & Dialog */}
            <div className="border-t border-border/50 pt-6">
                <button
                    type="button"
                    onClick={() => setShowDeleteDialog(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete Post
                </button>
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Post</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Choose whether to also delete the local published copy when one exists.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-3 py-4">
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background/60 cursor-pointer hover:bg-background/80 transition-colors">
                                <input
                                    type="radio"
                                    checked={!deleteWithPublished}
                                    onChange={() => setDeleteWithPublished(false)}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <p className="text-sm font-medium">Delete draft only</p>
                                    <p className="text-xs text-muted-foreground">Remove the AI Blogger post, keep published blog</p>
                                </div>
                            </label>
                            {canDeleteLocalPublishedCopy && (
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors">
                                    <input
                                        type="radio"
                                        checked={deleteWithPublished}
                                        onChange={() => setDeleteWithPublished(true)}
                                        className="w-4 h-4"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-destructive">Delete both</p>
                                        <p className="text-xs text-muted-foreground">Remove the AI Blogger post and the local published copy on this site</p>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Deleting
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AIBloggerGlassCard>
    );
}
