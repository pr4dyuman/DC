"use client";

import { useState } from "react";
import { Bot, MessageSquare, FileText, Clock, Wand2, Zap, Info, RotateCcw, Save, Eye, Edit3, ChevronDown, ChevronUp } from "lucide-react";

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
    builtInSummary: string;
}[] = [
    {
        key: "agentMode",
        label: "Singularity Agent",
        desc: "Main agent mode — tool calls, task & project management",
        icon: <Bot className="w-4 h-4" />,
        hasLive: true,
        builtInSummary: "Built-in context: agency data, team, projects, finance, constraints, historical project rules, tool usage instructions",
    },
    {
        key: "agentModeLite",
        label: "Agent (Lite Model)",
        desc: "Extra guardrails appended when a lite/flash-lite model is selected",
        icon: <Zap className="w-4 h-4" />,
        hasLive: false,
        builtInSummary: "Built-in lite-model rules: use bulk tools, autoBackdate=true for Done, read-only vs write distinction, batch size 30–40, concise replies",
    },
    {
        key: "chatMode",
        label: "Singularity Chat",
        desc: "Conversational mode (no tool calls)",
        icon: <MessageSquare className="w-4 h-4" />,
        hasLive: true,
        builtInSummary: "Built-in chat system instruction for agency conversation",
    },
    {
        key: "taskExplain",
        label: "Task Explain / Enhance",
        desc: "AI task analysis and description enhancement",
        icon: <Wand2 className="w-4 h-4" />,
        hasLive: false,
        builtInSummary: "Built-in task explain/enhance prompt",
    },
    {
        key: "hourEstimate",
        label: "Hour Estimation",
        desc: "AI-powered task hour estimation",
        icon: <Clock className="w-4 h-4" />,
        hasLive: false,
        builtInSummary: "Built-in hour estimation prompt",
    },
    {
        key: "taskChatbot",
        label: "In-Task Chatbot",
        desc: "In-task AI assistant chat",
        icon: <FileText className="w-4 h-4" />,
        hasLive: false,
        builtInSummary: "Built-in in-task chatbot prompt",
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
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [showInfo, setShowInfo] = useState(false);

    const activeFeature = FEATURES.find((f) => f.key === activeTab)!;
    const featureConfig = localConfig[activeTab] ?? {};

    const currentField: "standard" | "live" = activeFeature.hasLive ? liveSubTab : "standard";
    const currentValue = featureConfig[currentField] ?? "";
    const hasActiveOverride = currentValue.trim().length > 0;

    const hasAnyOverride = (key: PromptFeatureKey) => {
        const cfg = localConfig[key];
        return (cfg?.standard?.trim().length ?? 0) > 0 || (cfg?.live?.trim().length ?? 0) > 0;
    };

    const handleChange = (value: string) => {
        setLocalConfig((prev) => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], [currentField]: value },
        }));
    };

    /** Reset = clear the override → AI will fall back to built-in code prompt */
    const handleReset = () => {
        setLocalConfig((prev) => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], [currentField]: "" },
        }));
        setMode("view");
    };

    const handleTabChange = (key: PromptFeatureKey) => {
        setActiveTab(key);
        setLiveSubTab("standard");
        setMode("view");
    };

    return (
        <div className="space-y-4">
            {/* How it works banner */}
            <div className="border border-amber-500/20 rounded-lg bg-amber-500/5 p-3">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-medium text-amber-300">How prompt overrides work</span>
                    </div>
                    {showInfo ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                {showInfo && (
                    <div className="mt-2 text-xs text-amber-200/80 space-y-1">
                        <p>• <strong>Override set</strong> → completely replaces the built-in code prompt for that feature.</p>
                        <p>• <strong>Override empty</strong> → built-in code prompt is used (safe default, nothing changes).</p>
                        <p>• <strong>Reset to default</strong> → clears the override field → AI uses the built-in code prompt again.</p>
                        <p>• <strong>Live Model</strong> field is used for native-audio/streaming models; falls back to Standard if empty.</p>
                        <p>• Changes take effect immediately on the next AI request — no restart needed.</p>
                    </div>
                )}
            </div>

            {/* Feature tabs */}
            <div className="flex flex-wrap gap-1.5">
                {FEATURES.map((f) => {
                    const overrideActive = hasAnyOverride(f.key);
                    return (
                        <button
                            key={f.key}
                            onClick={() => handleTabChange(f.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                activeTab === f.key
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-purple-500/40"
                            }`}
                        >
                            {f.icon}
                            {f.label}
                            {overrideActive && (
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === f.key ? "bg-yellow-300" : "bg-yellow-500"}`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Editor panel */}
            <div className="border border-border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-foreground">{activeFeature.icon}</span>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{activeFeature.label}</p>
                            <p className="text-[11px] text-muted-foreground">{activeFeature.desc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasActiveOverride ? (
                            <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-medium">
                                ⚡ Override active
                            </span>
                        ) : (
                            <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                                ✓ Using built-in default
                            </span>
                        )}
                        {/* View / Edit toggle */}
                        <div className="flex rounded-lg overflow-hidden border border-border text-[10px] font-medium">
                            <button
                                onClick={() => setMode("view")}
                                className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${mode === "view" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Eye className="w-3 h-3" /> View
                            </button>
                            <button
                                onClick={() => setMode("edit")}
                                className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${mode === "edit" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Live sub-tabs (for Agent / Chat) */}
                {activeFeature.hasLive && (
                    <div className="border-b border-border flex">
                        {(["standard", "live"] as const).map((tab) => {
                            const tabVal = localConfig[activeTab]?.[tab] ?? "";
                            const tabHasOverride = tabVal.trim().length > 0;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setLiveSubTab(tab)}
                                    className={`flex-1 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                        liveSubTab === tab
                                            ? "bg-background text-foreground border-b-2 border-purple-500"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {tab === "standard" ? "Standard Model" : "Live / Streaming Model"}
                                    {tabHasOverride && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="bg-background">
                    {mode === "view" ? (
                        /* ── VIEW MODE: show currently active prompt ── */
                        <div className="p-4 space-y-3">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Currently Active Prompt</p>
                            {hasActiveOverride ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-medium">
                                            Custom override ({currentValue.length.toLocaleString()} chars)
                                        </span>
                                        <button
                                            onClick={handleReset}
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                                            title="Clear override — AI will use built-in code prompt"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reset to built-in default
                                        </button>
                                    </div>
                                    <pre className="w-full rounded-lg border border-yellow-500/20 bg-muted/20 px-3 py-2.5 text-xs font-mono text-foreground overflow-auto max-h-80 whitespace-pre-wrap leading-relaxed">
                                        {currentValue}
                                    </pre>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-medium">
                                            Built-in code default
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{activeFeature.builtInSummary}</p>
                                    <p className="text-[10px] text-muted-foreground/60 italic">
                                        The actual prompt is generated at runtime in code and includes live data (agency info, team, projects, etc). Switch to Edit mode to set a custom override.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── EDIT MODE: textarea override ── */
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-medium text-foreground">
                                        {activeFeature.hasLive
                                            ? liveSubTab === "standard" ? "Standard Model Override" : "Live Model Override"
                                            : "Prompt Override"}
                                    </label>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Leave empty = use built-in code default. Filled = fully replaces the built-in prompt.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground">{currentValue.length.toLocaleString()} chars</span>
                                    {hasActiveOverride && (
                                        <button
                                            onClick={handleReset}
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                                            title="Clear override → revert to built-in code default"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reset to default
                                        </button>
                                    )}
                                </div>
                            </div>
                            <textarea
                                value={currentValue}
                                onChange={(e) => handleChange(e.target.value)}
                                placeholder={`Leave empty to use built-in ${activeFeature.label} prompt (safe default).\n\nPaste your full replacement prompt here — it will completely replace the built-in prompt.\nMake sure to include ALL necessary instructions when overriding.`}
                                rows={18}
                                className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs font-mono text-foreground focus:ring-2 focus:ring-purple-500 outline-none resize-y leading-relaxed placeholder:text-muted-foreground/40"
                                spellCheck={false}
                            />
                            {hasActiveOverride && (
                                <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                                    <Info className="w-3 h-3 shrink-0" />
                                    <span>This override <strong>fully replaces</strong> the built-in prompt. Make sure it captures all needed context and instructions.</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onSave(localConfig)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-purple-500/20"
                >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save All Prompt Overrides"}
                </button>
                {saved && <span className="text-xs text-green-500 font-medium">{saved}</span>}
            </div>
        </div>
    );
}
