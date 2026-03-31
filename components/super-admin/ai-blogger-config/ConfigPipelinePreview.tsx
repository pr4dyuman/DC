"use client";

import { AI_BLOGGER_STAGE_KEYS } from "@/lib/ai-blogger-config";
import type { AIBloggerConfig, AIConfig } from "@/lib/types";
import { STAGE_VISUALS, formatResolvedModel, getStageConfigStatus } from "./shared";

interface ConfigPipelinePreviewProps {
    config: AIBloggerConfig;
    baseAiConfig: AIConfig | null;
}

export default function ConfigPipelinePreview({ config, baseAiConfig }: ConfigPipelinePreviewProps) {
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

    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-medium text-foreground">Current Pipeline Configuration</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {pipelineOverview.map((stage, index) => (
                    <div key={stage.key} className="contents">
                        <div className={`rounded-full border px-3 py-1.5 ${stage.className}`}>
                            {stage.label}: {stage.modelLabel}
                        </div>
                        {index < pipelineOverview.length - 1 && (
                            <span className="text-muted-foreground">{"->"}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
