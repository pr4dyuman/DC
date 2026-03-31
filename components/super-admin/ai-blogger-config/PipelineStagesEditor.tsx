"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Eye, EyeOff, KeyRound, RotateCcw } from "lucide-react";
import { AI_BLOGGER_STAGE_KEYS, AI_BLOGGER_STAGE_META } from "@/lib/ai-blogger-config";
import { AI_MODELS } from "@/lib/ai-models";
import type { AIBloggerConfig, AIBloggerStageConfig, AIBloggerStageKey, AIConfig, AIProvider } from "@/lib/types";
import { PROVIDER_INFO } from "@/app/super-admin/settings/_components/FeatureConfigEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    INITIAL_OPEN_STATE,
    STAGE_VISUALS,
    RESET_PROMPT_LABEL,
    formatResolvedModel,
    getStageConfigStatus,
    type StageOpenState,
    type KeyVisibilityState,
} from "./shared";
import type { Dispatch, SetStateAction } from "react";

interface PipelineStagesEditorProps {
    config: AIBloggerConfig;
    setConfig: Dispatch<SetStateAction<AIBloggerConfig>>;
    baseAiConfig: AIConfig | null;
    visibleKeys: KeyVisibilityState;
    toggleKeyVisibility: (key: string) => void;
}

export default function PipelineStagesEditor({
    config,
    setConfig,
    baseAiConfig,
    visibleKeys,
    toggleKeyVisibility,
}: PipelineStagesEditorProps) {
    const [openStages, setOpenStages] = useState<StageOpenState>(INITIAL_OPEN_STATE);

    const toggleStage = (stage: AIBloggerStageKey) => {
        setOpenStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
    };

    const updateStage = (stage: AIBloggerStageKey, updater: (current: AIBloggerStageConfig) => AIBloggerStageConfig) => {
        setConfig((current) => ({
            ...current,
            [stage]: updater(current[stage]),
        }));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-emerald-500/15 text-primary">
                    <Brain className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-foreground">AI Pipeline Configuration</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure API keys, models, and prompts for each AI Blogger generation step.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {AI_BLOGGER_STAGE_KEYS.map((stageKey) => {
                    const stageConfig = config[stageKey];
                    const meta = AI_BLOGGER_STAGE_META[stageKey];
                    const models = AI_MODELS[stageConfig.provider] || [];
                    const stagePrimaryKey = `${stageKey}:primary`;
                    const stageFallbackKey = `${stageKey}:fallback`;
                    const visual = STAGE_VISUALS[stageKey];
                    const Icon = visual.icon;
                    const stageStatus = getStageConfigStatus(stageConfig, baseAiConfig);

                    return (
                        <div key={stageKey} className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${visual.borderColor}`}>
                            <button
                                type="button"
                                onClick={() => toggleStage(stageKey)}
                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${visual.iconBg}`}>
                                        <Icon className={`h-5 w-5 ${visual.iconColor}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-foreground">{meta.title}</h3>
                                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${stageStatus.badgeClassName}`}>
                                                {stageStatus.label}
                                            </span>
                                        </div>
                                        <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground">
                                            {stageConfig.provider} / {formatResolvedModel(stageConfig)}
                                        </span>
                                        <p className="text-sm text-muted-foreground">{meta.description}</p>
                                    </div>
                                </div>
                                {openStages[stageKey] ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>

                            {openStages[stageKey] && (
                                <div className="space-y-6 border-t border-border/50 px-5 py-5">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <KeyRound className="h-4 w-4 text-primary" />
                                            <p className="text-sm font-medium text-foreground">API Keys</p>
                                        </div>

                                        {stageStatus.label === "Inherited" && (
                                            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-300">
                                                This stage currently inherits the main agency blog runtime key because the provider matches.
                                            </div>
                                        )}

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Primary API Key</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={visibleKeys[stagePrimaryKey] ? "text" : "password"}
                                                        value={stageConfig.apiKey || ""}
                                                        onChange={(event) =>
                                                            updateStage(stageKey, (current) => ({
                                                                ...current,
                                                                apiKey: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="Leave empty to inherit if provider matches"
                                                        className="h-11 rounded-xl border-border bg-background pr-11"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleKeyVisibility(stagePrimaryKey)}
                                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {visibleKeys[stagePrimaryKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Fallback API Key</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={visibleKeys[stageFallbackKey] ? "text" : "password"}
                                                        value={stageConfig.fallbackApiKey || ""}
                                                        onChange={(event) =>
                                                            updateStage(stageKey, (current) => ({
                                                                ...current,
                                                                fallbackApiKey: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="Optional retry key for failures or quota limits"
                                                        className="h-11 rounded-xl border-border bg-background pr-11"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleKeyVisibility(stageFallbackKey)}
                                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {visibleKeys[stageFallbackKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Brain className="h-4 w-4 text-primary" />
                                            <p className="text-sm font-medium text-foreground">AI Model</p>
                                        </div>

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Provider</Label>
                                                <Select
                                                    value={stageConfig.provider}
                                                    onValueChange={(value) => {
                                                        const provider = value as AIProvider;
                                                        const nextModel = AI_MODELS[provider]?.[0]?.id || "custom";
                                                        updateStage(stageKey, (current) => ({
                                                            ...current,
                                                            provider,
                                                            model: nextModel,
                                                            customModelId: "",
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((provider) => (
                                                            <SelectItem key={provider} value={provider}>
                                                                {PROVIDER_INFO[provider].label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Model</Label>
                                                <Select
                                                    value={stageConfig.model}
                                                    onValueChange={(value) =>
                                                        updateStage(stageKey, (current) => ({
                                                            ...current,
                                                            model: value,
                                                            customModelId: value === "custom" ? current.customModelId || "" : "",
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {models.map((model) => (
                                                            <SelectItem key={model.id} value={model.id}>
                                                                {model.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {stageConfig.model === "custom" && (
                                                <div className="space-y-2 lg:col-span-2">
                                                    <Label className="text-xs text-muted-foreground">Custom Model ID</Label>
                                                    <Input
                                                        type="text"
                                                        value={stageConfig.customModelId || ""}
                                                        onChange={(event) =>
                                                            updateStage(stageKey, (current) => ({
                                                                ...current,
                                                                customModelId: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="e.g. ft:gpt-4o:your-org:blog-stage"
                                                        className="h-11 rounded-xl border-border bg-background"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                System prompt
                                            </Label>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateStage(stageKey, (current) => ({
                                                        ...current,
                                                        systemPrompt: AI_BLOGGER_STAGE_META[stageKey].defaultSystemPrompt,
                                                    }))
                                                }
                                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                {RESET_PROMPT_LABEL}
                                            </button>
                                        </div>
                                        <Textarea
                                            value={stageConfig.systemPrompt}
                                            onChange={(event) =>
                                                updateStage(stageKey, (current) => ({
                                                    ...current,
                                                    systemPrompt: event.target.value,
                                                }))
                                            }
                                            rows={7}
                                            className="min-h-[180px] rounded-2xl border-border bg-background font-mono"
                                            spellCheck={false}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This override is stored inside AI Blogger admin only and does not touch your global AI prompt settings.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
