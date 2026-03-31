"use client";

import { useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    RotateCw,
    ChevronDown,
} from "lucide-react";
import type { BlogRun } from "./RecentRunsCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RunErrorDetails } from "./RunErrorDetails";

interface RunItemProps {
    run: BlogRun;
    isRetrying?: boolean;
    onRetry?: () => Promise<void> | void;
}

function formatDate(dateString?: string): string {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getStatusConfig(status: BlogRun["status"]) {
    const configs = {
        completed: {
            icon: CheckCircle2,
            badge: "Completed",
            bgColor: "bg-emerald-50/50 dark:bg-emerald-950/50",
            borderColor: "border-emerald-200/50 dark:border-emerald-800/50",
            textColor: "text-emerald-700 dark:text-emerald-300",
            badgeClass:
                "bg-emerald-100/60 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
        },
        failed: {
            icon: AlertCircle,
            badge: "Failed",
            bgColor: "bg-red-50/50 dark:bg-red-950/50",
            borderColor: "border-red-200/50 dark:border-red-800/50",
            textColor: "text-red-700 dark:text-red-300",
            badgeClass:
                "bg-red-100/60 dark:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
        },
        in_progress: {
            icon: Loader2,
            badge: "Running",
            bgColor: "bg-blue-50/50 dark:bg-blue-950/50",
            borderColor: "border-blue-200/50 dark:border-blue-800/50",
            textColor: "text-blue-700 dark:text-blue-300",
            badgeClass:
                "bg-blue-100/60 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
        },
    };

    return configs[status];
}

export function RunItem({ run, isRetrying = false, onRetry }: RunItemProps) {
    const [showError, setShowError] = useState(false);
    const statusConfig = getStatusConfig(run.status);
    const StatusIcon = statusConfig.icon;

    const isSpinning = run.status === "in_progress" || isRetrying;

    return (
        <div
            className={cn(
                "rounded-2xl border px-4 py-4 transition-colors",
                statusConfig.bgColor,
                statusConfig.borderColor
            )}
        >
            <div className="space-y-3">
                {/* Main Content */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 flex-1 min-w-0">
                        <div className={cn("flex-shrink-0 mt-0.5", statusConfig.textColor)}>
                            <StatusIcon
                                className={cn("w-5 h-5", isSpinning && "animate-spin")}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug truncate">
                                {run.selectedTopic || "Topic not recorded yet"}
                            </p>
                            {run.summary && (
                                <p className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-2">
                                    {run.summary}
                                </p>
                            )}
                        </div>
                    </div>
                    <div
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border",
                            statusConfig.badgeClass
                        )}
                    >
                        {statusConfig.badge}
                    </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {run.createdAt && (
                        <>
                            <span>Ran {formatDate(run.createdAt)}</span>
                            <span>|</span>
                        </>
                    )}
                    {run.durationSeconds && (
                        <>
                            <span>Duration: {run.durationSeconds}s</span>
                            <span>|</span>
                        </>
                    )}
                    {run.wordCount && (
                        <span>{run.wordCount.toLocaleString()} words</span>
                    )}
                </div>

                {/* Error Details (Collapsible) */}
                {run.status === "failed" && run.error && (
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowError(!showError)}
                            className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-300 hover:opacity-80 transition-opacity"
                        >
                            <ChevronDown
                                className={cn(
                                    "w-4 h-4 transition-transform",
                                    showError && "rotate-180"
                                )}
                            />
                            {showError ? "Hide" : "Show"} Error Details
                        </button>

                        {showError && <RunErrorDetails error={run.error} />}
                    </div>
                )}

                {/* Actions */}
                {run.status === "failed" && onRetry ? (
                    <div className="flex gap-2 pt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRetry}
                            disabled={isRetrying}
                            className="gap-2 text-xs h-8"
                        >
                            {isRetrying ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Retrying...
                                </>
                            ) : (
                                <>
                                    <RotateCw className="w-3 h-3" />
                                    Retry Run
                                </>
                            )}
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
