"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AIProvider } from "@/lib/types";
import { AI_MODELS } from "@/lib/ai-models";

export const PROVIDER_INFO: Record<AIProvider, { name: string; label: string; keyLabel: string; keyPlaceholder: string; description: string }> = {
    gemini: { name: "Google Gemini", label: "Gemini", keyLabel: "API Key", keyPlaceholder: "AIzaSy...", description: "Google's multimodal AI. Best for vision tasks and code generation." },
    openai: { name: "OpenAI", label: "OpenAI", keyLabel: "API Key", keyPlaceholder: "sk-...", description: "GPT models. Excellent for complex reasoning and chat." },
    nvidia: { name: "NVIDIA NIM", label: "NVIDIA", keyLabel: "API Key", keyPlaceholder: "nvapi-...", description: "Open-source models on NVIDIA infrastructure. Great for speed." },
    github: { name: "GitHub Models", label: "GitHub", keyLabel: "Personal Access Token", keyPlaceholder: "ghp_... or github_pat_...", description: "AI models via GitHub. Uses your PAT with models:read scope." },
    groq: { name: "Groq", label: "Groq", keyLabel: "API Key", keyPlaceholder: "Groq API key", description: "Ultra-fast LPU inference. Best for speed-critical workloads." },
};

export type AIFeatureConfigState = {
    provider?: AIProvider;
    apiKey?: string;
    model?: string;
    customModelId?: string;
};

export function FeatureConfigEditor({
    label,
    desc,
    value,
    onChange,
}: {
    label: string;
    desc: string;
    value: AIFeatureConfigState | undefined;
    onChange: (v: AIFeatureConfigState | undefined) => void;
}) {
    const isOverride = !!value;
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    const provider = value?.provider || "gemini";
    const providerModels = AI_MODELS[provider] || [];
    const currentProviderInfo = PROVIDER_INFO[provider];

    const handleToggle = () => {
        if (isOverride) {
            onChange(undefined);
        } else {
            onChange({ provider: "gemini", model: AI_MODELS["gemini"][0]?.id || "" });
        }
    };

    const updateField = (field: keyof AIFeatureConfigState, val: string) => {
        if (!value) return;
        onChange({ ...value, [field]: val });
    };

    const handleProviderChange = (newProvider: AIProvider) => {
        if (!value) return;
        const models = AI_MODELS[newProvider];
        onChange({
            ...value,
            provider: newProvider,
            model: models[0]?.id || "",
            customModelId: "",
        });
    };

    return (
        <div className="py-4 border-b border-border last:border-0 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <label className="flex items-center cursor-pointer relative">
                    <input
                        type="checkbox"
                        checked={isOverride}
                        onChange={handleToggle}
                        className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            {isOverride && value && (
                <div className="pl-4 border-l-2 border-purple-500/20 space-y-4 pt-2">
                    {/* Provider Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-foreground mb-2">Provider</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((p) => (
                                <button key={p} onClick={() => handleProviderChange(p)} type="button"
                                    className={`relative p-2 rounded-lg border text-center transition-all duration-200 ${provider === p ? "border-purple-500 bg-purple-500/10 text-purple-600 font-medium" : "border-border hover:border-muted-foreground/30 hover:bg-muted text-muted-foreground"}`}
                                >
                                    <p className="text-xs">{PROVIDER_INFO[p].label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">{currentProviderInfo.keyLabel}</label>
                        <div className="relative">
                            <input
                                type={isKeyVisible ? "text" : "password"}
                                value={value.apiKey || ""}
                                onChange={(e) => updateField("apiKey", e.target.value)}
                                placeholder={value.apiKey?.startsWith('****') ? `Key configured — enter new key to change` : "(leaves empty to inherit from main config)"}
                                className="w-full h-9 rounded-md border border-border bg-background px-3 pr-10 text-xs text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder:text-muted-foreground"
                            />
                            <button type="button" onClick={() => setIsKeyVisible(!isKeyVisible)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                                {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Model */}
                    <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Model</label>
                        <select
                            value={value.model || ""}
                            onChange={(e) => {
                                const newModel = e.target.value;
                                // Clear customModelId atomically in the same state update
                                onChange({ ...value, model: newModel, customModelId: newModel !== "custom" ? "" : (value.customModelId || "") });
                            }}
                            className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                        >
                            {providerModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>

                    {/* Custom Model ID */}
                    {value.model === "custom" && (
                        <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">Custom Model ID</label>
                            <input
                                type="text"
                                value={value.customModelId || ""}
                                onChange={(e) => updateField("customModelId", e.target.value)}
                                placeholder="e.g. ft:gpt-4o:my-org:custom-id"
                                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder:text-muted-foreground"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
