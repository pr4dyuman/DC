"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Eye, EyeOff, Check, AlertCircle, Trash2, Brain } from "lucide-react";
import { getAgencyDetails, getAgencyAIConfigSuperAdmin, updateAgencyAIConfigSuperAdmin, removeAgencyAIConfig } from "@/lib/actions/super-admin";
import { AI_MODELS } from "@/lib/ai-models";
import { AIProvider, AIConfig } from "@/lib/types";

const PROVIDER_INFO: Record<AIProvider, { name: string; label: string; keyLabel: string; keyPlaceholder: string; description: string }> = {
    gemini: {
        name: "Google Gemini",
        label: "Gemini",
        keyLabel: "API Key",
        keyPlaceholder: "AIzaSy...",
        description: "Google's multimodal AI. Best for vision tasks and code generation."
    },
    openai: {
        name: "OpenAI",
        label: "OpenAI",
        keyLabel: "API Key",
        keyPlaceholder: "sk-...",
        description: "GPT models. Excellent for complex reasoning and chat."
    },
    nvidia: {
        name: "NVIDIA NIM",
        label: "NVIDIA",
        keyLabel: "API Key",
        keyPlaceholder: "nvapi-...",
        description: "Open-source models on NVIDIA infrastructure. Great for speed."
    },
    github: {
        name: "GitHub Models",
        label: "GitHub",
        keyLabel: "Personal Access Token",
        keyPlaceholder: "ghp_... or github_pat_...",
        description: "AI models via GitHub. Uses your PAT with models:read scope."
    },
};

export default function AgencyAIConfigPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [agencyId, setAgencyId] = useState<string>("");
    const [agencyName, setAgencyName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Form state
    const [provider, setProvider] = useState<AIProvider>("gemini");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("");
    const [customModelId, setCustomModelId] = useState("");
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        (async () => {
            const { id } = await params;
            setAgencyId(id);
            try {
                const [details, config] = await Promise.all([
                    getAgencyDetails(id),
                    getAgencyAIConfigSuperAdmin(id)
                ]);
                setAgencyName(details.agency.name);
                if (config) {
                    setProvider(config.provider);
                    setApiKey(config.apiKey);
                    setModel(config.model);
                    setCustomModelId(config.customModelId || "");
                    setIsConfigured(true);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [params]);

    const handleProviderChange = (newProvider: AIProvider) => {
        setProvider(newProvider);
        const models = AI_MODELS[newProvider];
        setModel(models[0]?.id || "");
        setCustomModelId("");
    };

    const handleSave = async () => {
        setError("");
        setSuccess("");
        if (!apiKey.trim()) {
            setError("API Key / Token is required");
            return;
        }
        if (!model) {
            setError("Please select a model");
            return;
        }
        if (model === "custom" && !customModelId.trim()) {
            setError("Custom model ID is required");
            return;
        }

        setSaving(true);
        try {
            const config: AIConfig = {
                provider,
                apiKey: apiKey.trim(),
                model,
                ...(model === "custom" ? { customModelId: customModelId.trim() } : {})
            };
            await updateAgencyAIConfigSuperAdmin(agencyId, config);
            setIsConfigured(true);
            setSuccess("Singularity AI configured successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm("Remove AI configuration? Users in this agency will lose AI features.")) return;
        setRemoving(true);
        try {
            await removeAgencyAIConfig(agencyId);
            setProvider("gemini");
            setApiKey("");
            setModel("");
            setCustomModelId("");
            setIsConfigured(false);
            setSuccess("AI configuration removed.");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
        );
    }

    const providerModels = AI_MODELS[provider] || [];
    const currentProviderInfo = PROVIDER_INFO[provider];

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <Link
                    href="/super-admin/settings"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Settings</span>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Singularity AI</h1>
                        <p className="text-muted-foreground text-sm">Configure AI for <strong>{agencyName}</strong></p>
                    </div>
                    {isConfigured && (
                        <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">
                            <Check className="w-3.5 h-3.5" /> Active
                        </span>
                    )}
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* Provider Selection */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Provider</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => handleProviderChange(p)}
                            className={`
                                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                ${provider === p
                                    ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30 shadow-sm"
                                    : "border-border hover:border-muted-foreground/30 hover:bg-muted"
                                }
                            `}
                        >
                            <p className={`font-semibold text-sm ${provider === p ? "text-purple-500" : "text-foreground"}`}>
                                {PROVIDER_INFO[p].label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {PROVIDER_INFO[p].description}
                            </p>
                            {provider === p && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* API Key */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-3">
                <label className="block text-sm font-semibold text-foreground">
                    {currentProviderInfo.keyLabel}
                </label>
                <p className="text-xs text-muted-foreground">
                    {provider === "github"
                        ? "Create a fine-grained PAT with models:read scope at github.com/settings/tokens"
                        : `Enter your ${currentProviderInfo.name} API key. This is stored securely and never sent to the client.`}
                </p>
                <div className="relative">
                    <input
                        type={isKeyVisible ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={currentProviderInfo.keyPlaceholder}
                        className="w-full h-11 rounded-lg border border-border bg-background px-4 pr-10 text-sm text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder:text-muted-foreground"
                    />
                    <button
                        type="button"
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                        {isKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Model Selection */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-3">
                <label className="block text-sm font-semibold text-foreground">Model</label>
                <select
                    value={model}
                    onChange={(e) => {
                        setModel(e.target.value);
                        if (e.target.value !== "custom") setCustomModelId("");
                    }}
                    className="w-full h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                    <option value="">Select a model...</option>
                    {providerModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>

                {model === "custom" && (
                    <div className="space-y-1.5 mt-2">
                        <label className="block text-xs font-medium text-muted-foreground">Custom Model ID</label>
                        <input
                            type="text"
                            value={customModelId}
                            onChange={(e) => setCustomModelId(e.target.value)}
                            placeholder="e.g. ft:gpt-4o:my-org:custom-model:id"
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder:text-muted-foreground"
                        />
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
                <button
                    onClick={handleSave}
                    disabled={saving || !apiKey || !model}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                    <Sparkles className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Configuration"}
                </button>

                {isConfigured && (
                    <button
                        onClick={handleRemove}
                        disabled={removing}
                        className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-lg font-medium text-sm transition"
                    >
                        <Trash2 className="w-4 h-4" />
                        {removing ? "Removing..." : "Remove AI"}
                    </button>
                )}
            </div>
        </div>
    );
}
