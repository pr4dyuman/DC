"use client";

import { useState } from "react";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AIBloggerGlassCard } from "@/components/ai-blogger/AIBloggerPrimitives";

export type SearchConsoleConfigFormData = {
    propertyUrl: string;
    credentialsJson: string;
    syncFrequencyHours: number;
    lookbackDays: number;
    enabled: boolean;
};

type SearchConsoleConfigSectionProps = {
    config?: {
        enabled: boolean;
        propertyUrl: string;
        credentialsJson?: string;
        syncFrequencyHours: number;
        lookbackDays: number;
        authStatus: "not-connected" | "configured";
    };
    onSave?: (data: SearchConsoleConfigFormData) => Promise<void>;
    isLoading?: boolean;
};

export function SearchConsoleConfigSection({
    config,
    onSave,
    isLoading = false,
}: SearchConsoleConfigSectionProps) {
    const [showCredentials, setShowCredentials] = useState(false);
    const [formData, setFormData] = useState<SearchConsoleConfigFormData>({
        propertyUrl: config?.propertyUrl || "",
        credentialsJson: "",
        syncFrequencyHours: config?.syncFrequencyHours || 24,
        lookbackDays: config?.lookbackDays || 28,
        enabled: config?.enabled || false,
    });
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setError("");
        setSuccess(false);

        if (!formData.propertyUrl.trim()) {
            setError("Property URL is required");
            return;
        }

        if (formData.enabled && !formData.credentialsJson.trim()) {
            setError("Credentials JSON is required when enabling Search Console");
            return;
        }

        try {
            // Validate JSON if provided
            if (formData.credentialsJson.trim()) {
                try {
                    JSON.parse(formData.credentialsJson);
                } catch {
                    setError("Invalid JSON in credentials field");
                    return;
                }
            }

            await onSave?.(formData);
            setSuccess(true);
            setFormData((prev) => ({ ...prev, credentialsJson: "" }));
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save configuration");
        }
    };

    return (
        <AIBloggerGlassCard className="space-y-4 p-6">
            <div>
                <h3 className="text-lg font-semibold">Google Search Console Integration</h3>
                <p className="text-sm text-muted-foreground">
                    Configure Search Console credentials globally. All agencies will use this configuration to sync performance data.
                    <br />
                    <strong>Note:</strong> Users only see performance data for their own agency&apos;s blogs - data is automatically scoped by agency.
                </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-200">
                        <p className="font-medium">How to get Google Service Account credentials:</p>
                        <ol className="mt-2 space-y-1 ml-4 list-decimal text-xs">
                            <li>Go to Google Cloud Console</li>
                            <li>Create a Service Account</li>
                            <li>Generate JSON key file</li>
                            <li>Add service account email to Search Console property (owner role)</li>
                            <li>Paste the JSON content below</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable Search Console Integration</label>
                <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
                    disabled={isLoading}
                    className="h-4 w-4 rounded"
                />
            </div>

            {/* Property URL */}
            <div>
                <label className="block text-sm font-medium mb-2">Search Console Property URL</label>
                <input
                    type="text"
                    placeholder="https://example.com or sc-domain:example.com"
                    value={formData.propertyUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, propertyUrl: e.target.value }))}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                    The exact property URL as shown in Search Console settings
                </p>
            </div>

            {/* Credentials JSON */}
            <div>
                <label className="block text-sm font-medium mb-2">Service Account Credentials (JSON)</label>
                <div className="relative">
                    <textarea
                        placeholder="Paste the JSON content from Google Cloud Service Account JSON key file"
                        value={formData.credentialsJson}
                        onChange={(e) => setFormData((prev) => ({ ...prev, credentialsJson: e.target.value }))}
                        disabled={isLoading}
                        className={`w-full rounded-lg border border-border/60 bg-background/50 px-4 py-2 text-sm font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                            showCredentials ? "" : "text-transparent blur-sm select-none"
                        }`}
                        rows={8}
                    />
                    <button
                        onClick={() => setShowCredentials(!showCredentials)}
                        className="absolute right-3 top-3 p-1 rounded hover:bg-background/30"
                        type="button"
                    >
                        {showCredentials ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    {config?.authStatus === "configured"
                        ? "✓ Credentials are stored securely and encrypted"
                        : "Credentials will be encrypted before storage"}
                </p>
            </div>

            {/* Sync Settings */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium mb-2">Sync Frequency (hours)</label>
                    <input
                        type="number"
                        min="1"
                        max="720"
                        value={formData.syncFrequencyHours}
                        onChange={(e) =>
                            setFormData((prev) => ({ ...prev, syncFrequencyHours: parseInt(e.target.value) || 24 }))
                        }
                        disabled={isLoading}
                        className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">How often to sync data (1-720 hours, default: 24)</p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Lookback Period (days)</label>
                    <input
                        type="number"
                        min="7"
                        max="365"
                        value={formData.lookbackDays}
                        onChange={(e) => setFormData((prev) => ({ ...prev, lookbackDays: parseInt(e.target.value) || 28 }))}
                        disabled={isLoading}
                        className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Historical data window (7-365 days, default: 28)</p>
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Configuration saved successfully
                </div>
            )}

            {config?.authStatus === "configured" && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Search Console is configured and connected</span>
                    <Badge variant="outline" className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                        Connected
                    </Badge>
                </div>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? "Saving..." : "Save Configuration"}
            </button>
        </AIBloggerGlassCard>
    );
}
