"use client";

import { Sparkles } from "lucide-react";
import { AIProvider } from "@/lib/types";

type AiModelOption = {
    id: string;
    name: string;
};

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
    onProviderChange: (provider: AIProvider) => void;
    onApiKeyChange: (apiKey: string) => void;
    onModelChange: (model: string) => void;
    onCustomModelIdChange: (customModelId: string) => void;
    onSave: () => void;
    onRemove: () => void;
}

export function SystemSettingsDefaultAiSection({
    defaultAi,
    availableModels,
    defaultAiConfigured,
    savingDefaultAi,
    savedDefaultAi,
    onProviderChange,
    onApiKeyChange,
    onModelChange,
    onCustomModelIdChange,
    onSave,
    onRemove,
}: SystemSettingsDefaultAiSectionProps) {
    return (
        <div className="border border-purple-500/20 rounded-lg p-4 mb-4 bg-purple-500/5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Default AI for New Signups
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
                This config is automatically applied when a new agency registers via signup.
                All trial agencies will share this API key.
            </p>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Provider</label>
                    <select
                        value={defaultAi.provider}
                        onChange={(event) => onProviderChange(event.target.value as AIProvider)}
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
                        onChange={(event) => onApiKeyChange(event.target.value)}
                        placeholder={defaultAiConfigured ? "Key configured - enter new key to change" : "Enter API key..."}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    {defaultAiConfigured && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Leave empty to keep existing key</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
                    <select
                        value={defaultAi.model}
                        onChange={(event) => onModelChange(event.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="">Select a model...</option>
                        {availableModels.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>

                {defaultAi.model === "custom" && (
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Custom Model ID</label>
                        <input
                            type="text"
                            value={defaultAi.customModelId}
                            onChange={(event) => onCustomModelIdChange(event.target.value)}
                            placeholder="e.g. ft:gpt-4o:custom-model"
                            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={onSave}
                        disabled={savingDefaultAi || !defaultAi.model || (!defaultAi.apiKey && !defaultAiConfigured)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                    >
                        {savingDefaultAi ? "Saving..." : defaultAiConfigured ? "Update Default" : "Set Default"}
                    </button>
                    {defaultAiConfigured && (
                        <button
                            onClick={onRemove}
                            className="px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-medium transition"
                        >
                            Remove Default
                        </button>
                    )}
                    {savedDefaultAi && <span className="text-xs text-green-500">{savedDefaultAi}</span>}
                </div>
            </div>
        </div>
    );
}
