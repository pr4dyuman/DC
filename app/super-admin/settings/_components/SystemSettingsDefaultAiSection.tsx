"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { AIProvider } from "@/lib/types";

type AiModelOption = { id: string; name: string; };

type FeatureModelKey = "modelChat" | "modelAgent" | "modelTaskExplain" | "modelHourEstimate" | "modelTaskChatbot";
export type FeatureModels = Partial<Record<FeatureModelKey, string>>;

const FEATURE_LABELS: { key: FeatureModelKey; label: string; desc: string }[] = [
    { key: "modelChat",         label: "Singularity Chat",     desc: "Conversational AI chat mode" },
    { key: "modelAgent",        label: "Singularity Agent",    desc: "Tool-calling agent mode" },
    { key: "modelTaskExplain",  label: "Task Explain/Enhance", desc: "AI task analysis & description enhancement" },
    { key: "modelHourEstimate", label: "Hour Estimation",      desc: "AI-powered task hour estimation" },
    { key: "modelTaskChatbot",  label: "Task Chatbot",         desc: "In-task AI assistant chat" },
];

interface DefaultAiState {
    provider: AIProvider;
    apiKey: string;
    model: string;
    customModelId: string;
}

interface SystemSettingsDefaultAiSectionProps {
    defaultAi: DefaultAiState;
    availableModels: AiModelOption[];
    defaultAiConfigured: boolean;
    savingDefaultAi: boolean;
    savedDefaultAi: string;
    featureModels: FeatureModels;
    onProviderChange: (provider: AIProvider) => void;
    onApiKeyChange: (apiKey: string) => void;
    onModelChange: (model: string) => void;
    onCustomModelIdChange: (customModelId: string) => void;
    onFeatureModelChange: (key: FeatureModelKey, value: string) => void;
    onSave: () => void;
    onRemove: () => void;
}

export function SystemSettingsDefaultAiSection({
    defaultAi, availableModels, defaultAiConfigured, savingDefaultAi, savedDefaultAi,
    featureModels, onProviderChange, onApiKeyChange, onModelChange, onCustomModelIdChange,
    onFeatureModelChange, onSave, onRemove,
}: SystemSettingsDefaultAiSectionProps) {
    const [showFeatureModels, setShowFeatureModels] = useState(
        Object.values(featureModels).some(Boolean)
    );

    return (
        <div className="border border-purple-500/20 rounded-lg p-4 mb-4 bg-purple-500/5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Default AI for New Signups
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
                Applied automatically when a new agency registers. All trial agencies share this API key.
            </p>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Provider</label>
                    <select
                        value={defaultAi.provider}
                        onChange={(e) => onProviderChange(e.target.value as AIProvider)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="nvidia">NVIDIA NIM</option>
                        <option value="github">GitHub Models</option>
                        <option value="groq">Groq</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">API Key</label>
                    <input
                        type="password"
                        value={defaultAi.apiKey}
                        onChange={(e) => onApiKeyChange(e.target.value)}
                        placeholder={defaultAiConfigured ? "Key configured - enter new key to change" : "Enter API key..."}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    {defaultAiConfigured && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Leave empty to keep existing key</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Default Model</label>
                    <select
                        value={defaultAi.model}
                        onChange={(e) => onModelChange(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="">Select a model...</option>
                        {availableModels.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {defaultAi.model === "custom" && (
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Custom Model ID</label>
                        <input
                            type="text" value={defaultAi.customModelId}
                            onChange={(e) => onCustomModelIdChange(e.target.value)}
                            placeholder="e.g. ft:gpt-4o:custom-model"
                            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                )}

                {/* Per-feature model overrides — collapsible */}
                <div className="border border-border rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowFeatureModels(!showFeatureModels)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                    >
                        <span className="text-xs font-medium text-muted-foreground">Per-Feature Model Overrides</span>
                        {showFeatureModels ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    {showFeatureModels && (
                        <div className="border-t border-border px-3 py-2 space-y-2 bg-background/50">
                            <p className="text-[10px] text-muted-foreground">Leave blank to use the default model above.</p>
                            {FEATURE_LABELS.map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                    <span className="text-xs text-foreground w-36 shrink-0">{label}</span>
                                    <select
                                        value={featureModels[key] || ""}
                                        onChange={(e) => onFeatureModelChange(key, e.target.value)}
                                        className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="">Use default</option>
                                        {availableModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={onSave}
                        disabled={savingDefaultAi || !defaultAi.model || (!defaultAi.apiKey && !defaultAiConfigured)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                    >
                        {savingDefaultAi ? "Saving..." : defaultAiConfigured ? "Update Default" : "Set Default"}
                    </button>
                    {defaultAiConfigured && (
                        <button onClick={onRemove} className="px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-medium transition">
                            Remove Default
                        </button>
                    )}
                    {savedDefaultAi && <span className="text-xs text-green-500">{savedDefaultAi}</span>}
                </div>
            </div>
        </div>
    );
}
