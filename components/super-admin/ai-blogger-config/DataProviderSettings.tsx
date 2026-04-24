"use client";

import { BarChart3, Eye, EyeOff, Image as ImageIcon, RefreshCw, RotateCcw } from "lucide-react";
import {
    AI_BLOGGER_PAGE_PERFORMANCE_PROVIDER_META,
    AI_BLOGGER_IMAGE_GENERATION_PROVIDER_META,
    AI_BLOGGER_IMAGE_MODELS,
} from "@/lib/ai-blogger-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ConfigSectionProps } from "./shared";

interface DataProviderSettingsProps extends ConfigSectionProps {
    resetSection: (section: "searchConsole" | "pagePerformance" | "imageGeneration") => void;
}

export default function DataProviderSettings({ config, setConfig, visibleKeys, toggleKeyVisibility, resetSection }: DataProviderSettingsProps) {
    return (
        <>
            {/* ─── Search Console + Page Performance side-by-side ───────── */}
            <div className="grid gap-4 xl:grid-cols-2">
                {/* Search Console */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                <h2 className="text-lg font-semibold text-foreground">Search Console Settings</h2>
                                <p className="text-sm text-muted-foreground">
                                    Configure the live Search Console connection used for post-publish snapshots, refresh scoring, and query breakdowns.
                                </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => resetSection("searchConsole")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset section
                                </button>
                            </div>

                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Property URL</Label>
                                    <Input
                                        type="text"
                                        value={config.searchConsole.propertyUrl}
                                        onChange={(event) =>
                                            setConfig((current) => ({
                                                ...current,
                                                searchConsole: {
                                                    ...current.searchConsole,
                                                    propertyUrl: event.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="https://your-site.com/"
                                        className="h-11 rounded-xl border-border bg-background"
                                    />
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        Use the exact Search Console property identifier, like <span className="font-mono">https://example.com/</span> or <span className="font-mono">sc-domain:example.com</span>.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Credentials JSON</Label>
                                    <div className="relative">
                                        <Textarea
                                            value={config.searchConsole.credentialsJson || ""}
                                            onChange={(event) =>
                                                setConfig((current) => ({
                                                    ...current,
                                                    searchConsole: {
                                                        ...current.searchConsole,
                                                        credentialsJson: event.target.value,
                                                    },
                                                }))
                                            }
                                            placeholder="Paste the service account JSON or keep the masked value"
                                            className="min-h-[140px] rounded-xl border-border bg-background pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleKeyVisibility("searchConsole:credentials")}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                        >
                                            {visibleKeys["searchConsole:credentials"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        Store a Google service-account JSON here. It is saved encrypted in super-admin settings, so no separate env var is required for Search Console.
                                    </p>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Sync Frequency (hours)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={720}
                                            value={config.searchConsole.syncFrequencyHours}
                                            onChange={(event) =>
                                                setConfig((current) => ({
                                                    ...current,
                                                    searchConsole: {
                                                        ...current.searchConsole,
                                                        syncFrequencyHours: Number.parseInt(event.target.value || "24", 10) || 24,
                                                    },
                                                }))
                                            }
                                            className="h-11 rounded-xl border-border bg-background"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Lookback Days</Label>
                                        <Input
                                            type="number"
                                            min={7}
                                            max={365}
                                            value={config.searchConsole.lookbackDays}
                                            onChange={(event) =>
                                                setConfig((current) => ({
                                                    ...current,
                                                    searchConsole: {
                                                        ...current.searchConsole,
                                                        lookbackDays: Number.parseInt(event.target.value || "28", 10) || 28,
                                                    },
                                                }))
                                            }
                                            className="h-11 rounded-xl border-border bg-background"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Enable Search Console config</p>
                                            <p className="text-xs text-muted-foreground">
                                                Keep this on when the property and credentials should be treated as production-ready.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={config.searchConsole.enabled}
                                            onCheckedChange={(checked) =>
                                                setConfig((current) => ({
                                                    ...current,
                                                    searchConsole: {
                                                        ...current.searchConsole,
                                                        enabled: checked,
                                                        authStatus:
                                                            checked &&
                                                            current.searchConsole.propertyUrl &&
                                                            current.searchConsole.credentialsJson
                                                                ? "configured"
                                                                : current.searchConsole.authStatus,
                                                    },
                                                }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
                                    When enabled, AI Blogger can sync page-level metrics, top queries, country/device breakdowns, and refresh recommendations for published posts.
                                </div>

                                <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
                                    Google Search Console API usage is free, but quota-limited. AI Blogger keeps this lightweight by syncing a small set of page, query, country, and device reports per workspace.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Performance */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
                            <RefreshCw className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                <h2 className="text-lg font-semibold text-foreground">Page Performance Settings</h2>
                                <p className="text-sm text-muted-foreground">
                                    Save provider and thresholds for page-speed-aware audits and reporting.
                                </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => resetSection("pagePerformance")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset section
                                </button>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                                {AI_BLOGGER_PAGE_PERFORMANCE_PROVIDER_META[config.pagePerformance.provider].description}
                            </div>

                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                                This config is stored and editable, but it is not yet wired into the live AI Blogger generator, editor audit scoring, or refresh queue logic.
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Provider</Label>
                                    <Select
                                        value={config.pagePerformance.provider}
                                        onValueChange={(value) =>
                                            setConfig((current) => ({
                                                ...current,
                                                pagePerformance: {
                                                    ...current.pagePerformance,
                                                    provider: value as "pagespeed",
                                                },
                                            }))
                                        }
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(AI_BLOGGER_PAGE_PERFORMANCE_PROVIDER_META).map(([provider, meta]) => (
                                                <SelectItem key={provider} value={provider}>
                                                    {meta.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Strategy</Label>
                                    <Select
                                        value={config.pagePerformance.strategy}
                                        onValueChange={(value) =>
                                            setConfig((current) => ({
                                                ...current,
                                                pagePerformance: {
                                                    ...current.pagePerformance,
                                                    strategy: value as "mobile" | "desktop" | "both",
                                                },
                                            }))
                                        }
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mobile">Mobile</SelectItem>
                                            <SelectItem value="desktop">Desktop</SelectItem>
                                            <SelectItem value="both">Both</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">API Key</Label>
                                    <div className="relative">
                                        <Input
                                            type={visibleKeys["pagePerformance:primary"] ? "text" : "password"}
                                            value={config.pagePerformance.apiKey || ""}
                                            onChange={(event) =>
                                                setConfig((current) => ({
                                                    ...current,
                                                    pagePerformance: {
                                                        ...current.pagePerformance,
                                                        apiKey: event.target.value,
                                                    },
                                                }))
                                            }
                                            placeholder="Optional PageSpeed key"
                                            className="h-11 rounded-xl border-border bg-background pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleKeyVisibility("pagePerformance:primary")}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                        >
                                            {visibleKeys["pagePerformance:primary"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Performance Threshold</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={config.pagePerformance.performanceThreshold}
                                        onChange={(event) =>
                                            setConfig((current) => ({
                                                ...current,
                                                pagePerformance: {
                                                    ...current.pagePerformance,
                                                    performanceThreshold: Number.parseInt(event.target.value || "60", 10) || 60,
                                                },
                                            }))
                                        }
                                        className="h-11 rounded-xl border-border bg-background"
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Enable page performance config</p>
                                        <p className="text-xs text-muted-foreground">
                                            Turn this on only when the agency is ready to use performance-aware SEO monitoring.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={config.pagePerformance.enabled}
                                        onCheckedChange={(checked) =>
                                            setConfig((current) => ({
                                                ...current,
                                                pagePerformance: {
                                                    ...current.pagePerformance,
                                                    enabled: checked,
                                                },
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Image Generation ─────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
                        <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Image Generation Settings</h2>
                                <p className="text-sm text-muted-foreground">
                                    Configure the separate model and API keys used to generate real featured image assets for AI Blogger posts.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => resetSection("imageGeneration")}
                                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset section
                            </button>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                            {AI_BLOGGER_IMAGE_GENERATION_PROVIDER_META[config.imageGeneration.provider].description}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Provider</Label>
                                <Select
                                    value={config.imageGeneration.provider}
                                    onValueChange={(value) => {
                                        const nextProvider = value as "openai" | "gemini";
                                        const nextModels = AI_BLOGGER_IMAGE_MODELS[nextProvider];
                                        setConfig((current) => ({
                                            ...current,
                                            imageGeneration: {
                                                ...current.imageGeneration,
                                                provider: nextProvider,
                                                model: nextModels[0]?.id || "custom",
                                                customModelId: "",
                                            },
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(AI_BLOGGER_IMAGE_GENERATION_PROVIDER_META).map(([provider, meta]) => (
                                            <SelectItem key={provider} value={provider}>
                                                {meta.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Image Model</Label>
                                <Select
                                    value={config.imageGeneration.model}
                                    onValueChange={(value) =>
                                        setConfig((current) => ({
                                            ...current,
                                            imageGeneration: {
                                                ...current.imageGeneration,
                                                model: value,
                                                customModelId: value === "custom" ? current.imageGeneration.customModelId : "",
                                            },
                                        }))
                                    }
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AI_BLOGGER_IMAGE_MODELS[config.imageGeneration.provider].map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                {model.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {config.imageGeneration.model === "custom" ? (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Custom Model ID</Label>
                                    <Input
                                        type="text"
                                        value={config.imageGeneration.customModelId || ""}
                                        onChange={(event) =>
                                            setConfig((current) => ({
                                                ...current,
                                                imageGeneration: {
                                                    ...current.imageGeneration,
                                                    customModelId: event.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="Enter the exact image model ID"
                                        className="h-11 rounded-xl border-border bg-background"
                                    />
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Image Size</Label>
                                <Select
                                    value={config.imageGeneration.size}
                                    onValueChange={(value) =>
                                        setConfig((current) => ({
                                            ...current,
                                            imageGeneration: {
                                                ...current.imageGeneration,
                                                size: value as "1024x1024" | "1792x1024" | "1024x1792",
                                            },
                                        }))
                                    }
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1792x1024">Landscape 1792×1024</SelectItem>
                                        <SelectItem value="1024x1024">Square 1024×1024</SelectItem>
                                        <SelectItem value="1024x1792">Portrait 1024×1792</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Quality</Label>
                                <Select
                                    value={config.imageGeneration.quality}
                                    onValueChange={(value) =>
                                        setConfig((current) => ({
                                            ...current,
                                            imageGeneration: {
                                                ...current.imageGeneration,
                                                quality: value as "standard" | "hd",
                                            },
                                        }))
                                    }
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="hd">HD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Style</Label>
                                <Select
                                    value={config.imageGeneration.style}
                                    onValueChange={(value) =>
                                        setConfig((current) => ({
                                            ...current,
                                            imageGeneration: {
                                                ...current.imageGeneration,
                                                style: value as "natural" | "vivid",
                                            },
                                        }))
                                    }
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vivid">Vivid</SelectItem>
                                        <SelectItem value="natural">Natural</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Primary API Key</Label>
                                <div className="relative">
                                    <Input
                                        type={visibleKeys["imageGeneration:primary"] ? "text" : "password"}
                                        value={config.imageGeneration.apiKey || ""}
                                        onChange={(event) =>
                                            setConfig((current) => ({
                                                ...current,
                                                imageGeneration: {
                                                    ...current.imageGeneration,
                                                    apiKey: event.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="Required to generate image assets"
                                        className="h-11 rounded-xl border-border bg-background pr-11"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleKeyVisibility("imageGeneration:primary")}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        {visibleKeys["imageGeneration:primary"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Fallback API Key</Label>
                                <div className="relative">
                                    <Input
                                        type={visibleKeys["imageGeneration:fallback"] ? "text" : "password"}
                                        value={config.imageGeneration.fallbackApiKey || ""}
                                        onChange={(event) =>
                                            setConfig((current) => ({
                                                ...current,
                                                imageGeneration: {
                                                    ...current.imageGeneration,
                                                    fallbackApiKey: event.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="Optional secondary key"
                                        className="h-11 rounded-xl border-border bg-background pr-11"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleKeyVisibility("imageGeneration:fallback")}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        {visibleKeys["imageGeneration:fallback"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Enable AI image generation</p>
                                    <p className="text-xs text-muted-foreground">
                                        Lets editors generate actual featured images directly from the AI Blogger draft prompt.
                                    </p>
                                </div>
                                <Switch
                                    checked={config.imageGeneration.enabled}
                                    onCheckedChange={(checked) =>
                                        setConfig((current) => ({
                                            ...current,
                                            imageGeneration: {
                                                ...current.imageGeneration,
                                                enabled: checked,
                                            },
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
