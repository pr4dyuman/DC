"use client";

import { useState } from "react";
import { Bot, MessageSquare, FileText, Clock, Wand2, Zap, Info, RotateCcw, Save, ChevronDown, ChevronUp } from "lucide-react";

export type PromptFeatureKey =
    | "agentMode"
    | "agentModeLite"
    | "chatMode"
    | "taskExplain"
    | "hourEstimate"
    | "taskChatbot";

export type PromptFeatureConfig = {
    standard?: string;
    live?: string;
};

export type PromptConfigState = Partial<Record<PromptFeatureKey, PromptFeatureConfig>>;

const FEATURES: {
    key: PromptFeatureKey;
    label: string;
    desc: string;
    icon: React.ReactNode;
    hasLive: boolean;
    defaultPromptLabel: string;
}[] = [
    {
        key: "agentMode",
        label: "Singularity Agent",
        desc: "Main agent mode — handles tool calls, task creation, project management",
        icon: <Bot className="w-4 h-4" />,
        hasLive: true,
        defaultPromptLabel: "Built-in context from buildSingularityContext() — includes agency data, projects, team, finance, and all instructions",
    },
    {
        key: "agentModeLite",
        label: "Agent (Lite Model)",
        desc: "Extra guardrails injected when a lite/flash-lite model is selected",
        icon: <Zap className="w-4 h-4" />,
        hasLive: false,
        defaultPromptLabel: "Built-in lite-model rules — bulk tool usage, backdating, concise responses",
    },
    {
        key: "chatMode",
        label: "Singularity Chat",
        desc: "Conversational mode (no tool calls)",
        icon: <MessageSquare className="w-4 h-4" />,
        hasLive: true,
        defaultPromptLabel: "Built-in chat system instruction",
    },
    {
        key: "taskExplain",
        label: "Task Explain / Enhance",
        desc: "AI task analysis and description enhancement",
        icon: <Wand2 className="w-4 h-4" />,
        hasLive: false,
        defaultPromptLabel: "Built-in task explain/enhance prompt",
    },
    {
        key: "hourEstimate",
        label: "Hour Estimation",
        desc: "AI-powered task hour estimation",
        icon: <Clock className="w-4 h-4" />,
        hasLive: false,
        defaultPromptLabel: "Built-in hour estimation prompt",
    },
    {
        key: "taskChatbot",
        label: "In-Task Chatbot",
        desc: "In-task AI assistant chat",
        icon: <FileText className="w-4 h-4" />,
        hasLive: false,
        defaultPromptLabel: "Built-in in-task chatbot prompt",
    },
];

interface Props {
    promptConfig: PromptConfigState;
    saving: boolean;
    saved: string;
    onSave: (config: PromptConfigState) => void;
}

export function SystemSettingsPromptSection({ promptConfig, saving, saved, onSave }: Props) {
    const [activeTab, setActiveTab] = useState<PromptFeatureKey>("agentMode");
    const [localConfig, setLocalConfig] = useState<PromptConfigState>(promptConfig);
    const [liveSubTab, setLiveSubTab] = useState<"standard" | "live">("standard");
    const [showInfo, setShowInfo] = useState(false);

    const activeFeature = FEATURES.find((f) => f.key === activeTab)!;
    const featureConfig = localConfig[activeTab] ?? {};

    const handleChange = (field: "standard" | "live", value: string) => {
        setLocalConfig((prev) => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], [field]: value },
        }));
    };

    const handleReset = (field: "standard" | "live") => {
        setLocalConfig((prev) => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], [field]: "" },
        }));
    };

    const hasOverride = (key: PromptFeatureKey, field: "standard" | "live") => {
        const val = localConfig[key]?.[field];
        return val !== undefined && val.trim().length > 0;
    };

    return (
        <div className="space-y-4">
            {/* Info banner */}
            <div className="border border-amber-500/20 rounded-lg bg-amber-500/5 p-3">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowInfo(!showInfo)}
                >
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-medium text-amber-300">How prompt overrides work</span>
                    </div>
                    {showInfo ? (
                        <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                    )}
                </div>
                {showInfo && (
                    <div className="mt-2 text-xs text-amber-200/80 space-y-1">
                        <p>• If you enter a <strong>Standard</strong> prompt, it <strong>fully replaces</strong> the built-in code prompt for that feature.</p>
                        <p>• Leave empty to use the original built-in prompt (safe default).</p>
                        <p>• <strong>Live Model</strong> overrides are used when a native-audio / live model is active. Falls back to Standard if empty.</p>
                        <p>• Changes take effect immediately on the next AI request — no restart needed.</p>
                    </div>
                )}
            </div>

            {/* Feature tabs */}
            <div className="flex flex-wrap gap-1.5">
                {FEATURES.map((f) => {
                    const hasAnyOverride = hasOverride(f.key, "standard") || hasOverride(f.key, "live");
                    return (
                        <button
                            key={f.key}
                            onClick={() => { setActiveTab(f.key); setLiveSubTab("standard"); }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                activeTab === f.key
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-purple-500/40"
                            }`}
                        >
                            {f.icon}
                            {f.label}
                            {hasAnyOverride && (
                                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === f.key ? "bg-yellow-300" : "bg-yellow-500"}`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Active feature editor */}
            <div className="border border-border rounded-lg overflow-hidden">
                {/* Feature header */}
                <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-foreground">{activeFeature.icon}</span>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{activeFeature.label}</p>
                            <p className="text-[11px] text-muted-foreground">{activeFeature.desc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {hasOverride(activeTab, "standard") || hasOverride(activeTab, "live") ? (
                            <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-medium">
                                Override active
                            </span>
                        ) : (
                            <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                                Using default
                            </span>
                        )}
                    </div>
                </div>

                {/* Live sub-tabs */}
                {activeFeature.hasLive && (
                    <div className="border-b border-border flex">
                        <button
                            onClick={() => setLiveSubTab("standard")}
                            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                                liveSubTab === "standard"
                                    ? "bg-background text-foreground border-b-2 border-purple-500"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Standard Model
                            {hasOverride(activeTab, "standard") && (
                                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                            )}
                        </button>
                        <button
                            onClick={() => setLiveSubTab("live")}
                            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                                liveSubTab === "live"
                                    ? "bg-background text-foreground border-b-2 border-purple-500"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Live / Streaming Model
                            {hasOverride(activeTab, "live") && (
                                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                            )}
                        </button>
                    </div>
                )}

                {/* Editor area */}
                <div className="p-4 space-y-3 bg-background">
                    {/* Default info */}
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Info className="w-3 h-3 shrink-0" />
                        Default: <span className="italic">{activeFeature.defaultPromptLabel}</span>
                    </p>

                    {/* Prompt textarea */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-foreground">
                                {activeFeature.hasLive
                                    ? liveSubTab === "standard"
                                        ? "Standard Model Prompt Override"
                                        : "Live Model Prompt Override"
                                    : "Prompt Override"}
                            </label>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground">
                                    {((activeFeature.hasLive ? featureConfig[liveSubTab] : featureConfig.standard) ?? "").length.toLocaleString()} chars
                                </span>
                                <button
                                    onClick={() => handleReset(activeFeature.hasLive ? liveSubTab : "standard")}
                                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                                    title="Clear override (use default)"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Reset to default
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={(activeFeature.hasLive ? featureConfig[liveSubTab] : featureConfig.standard) ?? ""}
                            onChange={(e) => handleChange(activeFeature.hasLive ? liveSubTab : "standard", e.target.value)}
                            placeholder={`Leave empty to use the built-in ${activeFeature.label} prompt...\n\nPaste your full replacement prompt here. It will completely replace the built-in prompt.`}
                            rows={18}
                            className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs font-mono text-foreground focus:ring-2 focus:ring-purple-500 outline-none resize-y leading-relaxed placeholder:text-muted-foreground/50"
                            spellCheck={false}
                        />
                    </div>

                    {/* Warning when override is active */}
                    {hasOverride(activeTab, activeFeature.hasLive ? liveSubTab : "standard") && (
                        <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                            <Info className="w-3 h-3 shrink-0" />
                            This override will <strong>fully replace</strong> the built-in prompt — make sure it includes all necessary instructions and context.
                        </p>
                    )}
                </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onSave(localConfig)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-purple-500/20"
                >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save All Prompt Overrides"}
                </button>
                {saved && (
                    <span className="text-xs text-green-500">{saved}</span>
                )}
            </div>
        </div>
    );
}
