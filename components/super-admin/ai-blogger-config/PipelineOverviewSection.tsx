"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { AI_BLOGGER_STAGE_KEYS } from "@/lib/ai-blogger-config";
import type { AIConfig } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import type { ConfigSectionProps } from "./shared";
import { formatResolvedModel, getStageConfigStatus, STAGE_VISUALS } from "./shared";

interface PipelineOverviewSectionProps extends ConfigSectionProps {
    baseAiConfig: AIConfig | null;
    runtimeInheritanceSummary: string;
    readinessChecks: Array<{ label: string; ready: boolean }>;
    readinessIssues: string[];
}

export default function PipelineOverviewSection({
    config,
    setConfig,
    baseAiConfig,
    runtimeInheritanceSummary,
    readinessChecks,
    readinessIssues,
}: PipelineOverviewSectionProps) {
    const pipelineOverview = AI_BLOGGER_STAGE_KEYS.map((stageKey) => {
        const stageConfig = config[stageKey];
        const stageStatus = getStageConfigStatus(stageConfig, baseAiConfig);

        return {
            key: stageKey,
            label: STAGE_VISUALS[stageKey].shortLabel,
            className: STAGE_VISUALS[stageKey].overviewClassName,
            statusLabel: stageStatus.label,
            modelLabel: formatResolvedModel(stageConfig),
        };
    });

    const configuredStageCount = pipelineOverview.filter((stage) => stage.statusLabel !== "Not set").length;

    const liveTrendsStatusLabel = config.trends.enabled ? "Live" : config.trends.fallbackToAi ? "AI fallback" : "Off";
    const websiteCrawlStatusLabel = config.crawl.enabled ? "Enabled" : "Off";
    const serpAnalysisStatusLabel = config.serp.enabled ? `${config.serp.device} • ${config.serp.maxCompetitors}` : "Off";
    const groundedResearchStatusLabel = config.groundedResearch.enabled ? `${config.groundedResearch.maxSources} sources` : "Off";
    const searchConsoleStatusLabel = config.searchConsole.enabled
        ? config.searchConsole.authStatus === "configured"
            ? "Configured"
            : "Needs auth"
        : "Off";
    const pagePerformanceStatusLabel = config.pagePerformance.enabled
        ? `${config.pagePerformance.provider} • ${config.pagePerformance.strategy}`
        : "Off";
    const readyCheckCount = readinessChecks.filter((item) => item.ready).length;

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                        <RefreshCw className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">API Key Fallback System</h2>
                                <p className="text-sm text-muted-foreground">
                                    Match the original blog studio flow by allowing a backup key per pipeline stage.
                                </p>
                            </div>

                            <label className="inline-flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground">
                                <span>{config.fallbackEnabled ? "Enabled" : "Disabled"}</span>
                                <Switch
                                    checked={config.fallbackEnabled}
                                    onCheckedChange={(checked) => setConfig((current) => ({ ...current, fallbackEnabled: checked }))}
                                />
                            </label>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                            If a stage key hits quota or fails, AI Blogger can retry with that stage&apos;s fallback key.
                            {` `}
                            {runtimeInheritanceSummary}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Pipeline Snapshot</h2>
                            <p className="text-sm text-muted-foreground">
                                Separate AI Blogger admin is now isolated from main system AI settings for this agency.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ready stages</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {configuredStageCount}/{AI_BLOGGER_STAGE_KEYS.length}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fallback</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {config.fallbackEnabled ? "Enabled" : "Disabled"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Live trends</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{liveTrendsStatusLabel}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Website crawl</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{websiteCrawlStatusLabel}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">SERP analysis</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{serpAnalysisStatusLabel}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Grounded research</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{groundedResearchStatusLabel}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Search Console</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{searchConsoleStatusLabel}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Page performance</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{pagePerformanceStatusLabel}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Config readiness</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {readyCheckCount}/{readinessChecks.length}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-background/70 px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {readinessChecks.map((item) => (
                                    <span
                                        key={item.label}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                            item.ready
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                        }`}
                                    >
                                        {item.label}: {item.ready ? "ready" : "needs setup"}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {readinessIssues.length > 0 ? (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                                <p className="text-sm font-medium text-amber-300">Readiness blockers</p>
                                <div className="mt-3 space-y-2 text-sm text-amber-100/90">
                                    {readinessIssues.map((issue) => (
                                        <p key={issue}>{issue}</p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
                                This agency is fully ready across the currently tracked AI Blogger admin checks.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
