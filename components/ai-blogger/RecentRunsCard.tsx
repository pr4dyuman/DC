"use client";

import { useState, useMemo } from "react";
import { AIBloggerGlassCard } from "./AIBloggerPrimitives";
import { RunItem } from "./RunItem";
import { Button } from "@/components/ui/button";
import type { BlogStudioRun } from "@/lib/types-ai-blogger";

export interface BlogRun {
    id: string;
    selectedTopic?: string;
    summary?: string;
    status: "completed" | "failed" | "in_progress";
    error?: {
        message: string;
        code?: string;
        type?: string;
        details?: string;
    };
    createdAt?: string;
    durationSeconds?: number;
    wordCount?: number;
}

interface RecentRunsCardProps {
    runs: BlogStudioRun[];
    onRetry?: (runId: string) => Promise<void>;
}

type FilterStatus = "all" | "completed" | "failed" | "in_progress";

function mapRunStatus(status: BlogStudioRun["status"]): BlogRun["status"] {
    if (status === "completed") {
        return "completed";
    }

    if (status === "failed" || status === "cancelled") {
        return "failed";
    }

    return "in_progress";
}

function mapRun(run: BlogStudioRun): BlogRun {
    const failedStep = [...run.steps].reverse().find((step) => step.status === "failed");
    const errorMessage =
        failedStep?.notes?.trim() ||
        (run.status === "failed" ? run.summary?.trim() : "");

    return {
        id: run.id,
        selectedTopic: run.selectedTopic,
        summary: run.summary,
        status: mapRunStatus(run.status),
        error: errorMessage
            ? {
                message: errorMessage,
                code: failedStep?.key,
                type: failedStep?.label,
            }
            : undefined,
        createdAt: run.startedAt || run.createdAt,
        durationSeconds:
            run.startedAt && run.completedAt
                ? Math.max(
                    0,
                    Math.round(
                        (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000,
                    ),
                )
                : undefined,
    };
}

export function RecentRunsCard({ runs, onRetry }: RecentRunsCardProps) {
    const [filter, setFilter] = useState<FilterStatus>("all");
    const [retrying, setRetrying] = useState<string | null>(null);
    const mappedRuns = useMemo(() => runs.map(mapRun), [runs]);

    const stats = useMemo(() => {
        const completed = mappedRuns.filter((r) => r.status === "completed").length;
        const failed = mappedRuns.filter((r) => r.status === "failed").length;
        const inProgress = mappedRuns.filter((r) => r.status === "in_progress").length;
        const successRate = mappedRuns.length > 0 ? Math.round((completed / mappedRuns.length) * 100) : 0;

        return { completed, failed, inProgress, successRate, total: mappedRuns.length };
    }, [mappedRuns]);

    const filteredRuns = useMemo(() => {
        if (filter === "all") return mappedRuns;
        return mappedRuns.filter((r) => r.status === filter);
    }, [mappedRuns, filter]);

    const handleRetry = async (runId: string) => {
        if (!onRetry) return;
        setRetrying(runId);
        try {
            await onRetry(runId);
        } catch (error) {
            console.error("Retry failed:", error);
        } finally {
            setRetrying(null);
        }
    };

    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                {/* Header */}
                <h3 className="text-lg font-semibold">Recent Generation Runs</h3>

                {/* Statistics Card */}
                {mappedRuns.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="rounded-lg bg-background/60 border border-border/60 p-3 text-center">
                            <p className="text-muted-foreground">Total Runs</p>
                            <p className="mt-1.5 text-lg font-semibold text-foreground">
                                {stats.total}
                            </p>
                        </div>
                        <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/50 p-3 text-center">
                            <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                                Success
                            </p>
                            <p className="mt-1.5 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                                {stats.successRate}%
                            </p>
                        </div>
                        <div className="rounded-lg bg-red-50/50 dark:bg-red-950/50 border border-red-200/50 dark:border-red-800/50 p-3 text-center">
                            <p className="text-red-700 dark:text-red-300 font-medium">
                                Failed
                            </p>
                            <p className="mt-1.5 text-lg font-semibold text-red-700 dark:text-red-300">
                                {stats.failed}
                            </p>
                        </div>
                    </div>
                )}

                {/* Filter Tabs */}
                {mappedRuns.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant={filter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("all")}
                            className="text-xs"
                        >
                            All {stats.total}
                        </Button>
                        <Button
                            variant={filter === "completed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("completed")}
                            className="text-xs"
                        >
                            Completed {stats.completed}
                        </Button>
                        <Button
                            variant={filter === "failed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("failed")}
                            className="text-xs"
                        >
                            Failed {stats.failed}
                        </Button>
                        {stats.inProgress > 0 && (
                            <Button
                                variant={filter === "in_progress" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilter("in_progress")}
                                className="text-xs"
                            >
                                Running {stats.inProgress}
                            </Button>
                        )}
                    </div>
                )}

                {/* Runs List */}
                <div className="space-y-3">
                    {filteredRuns.length > 0 ? (
                        filteredRuns.map((run) => (
                            <RunItem
                                key={run.id}
                                run={run}
                                isRetrying={retrying === run.id}
                                onRetry={() => handleRetry(run.id)}
                            />
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground text-center">
                            {filter === "all"
                                ? "No generation runs have been recorded yet."
                                : `No ${filter} runs found.`}
                        </div>
                    )}
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}
