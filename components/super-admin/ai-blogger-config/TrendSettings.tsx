"use client";

import { Eye, EyeOff, Globe } from "lucide-react";
import { AI_BLOGGER_TREND_PROVIDER_META } from "@/lib/ai-blogger-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SERPAPI_GEO_COUNTRIES, locationToSelectValue, locationFromSelectValue, type ConfigSectionProps } from "./shared";

export default function TrendSettings({ config, setConfig, visibleKeys, toggleKeyVisibility }: ConfigSectionProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                            <Globe className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Live Trends Provider</h2>
                            <p className="text-sm text-muted-foreground">
                                Powers the real Google Trends fetch for Trending Topic mode and the first trend-scoring step.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {AI_BLOGGER_TREND_PROVIDER_META[config.trends.provider].description}
                        {` `}
                        If live fetch is unavailable, AI Blogger can fall back to the AI-only discovery stage.
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {SERPAPI_GEO_COUNTRIES.find((c) => c.code === locationToSelectValue(config.trends.defaultLocation))?.name || config.trends.defaultLocation.toUpperCase()}
                    </span>
                    <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            config.trends.enabled
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-border bg-background text-muted-foreground"
                        }`}
                    >
                        {config.trends.enabled ? "Live provider enabled" : "Live provider disabled"}
                    </span>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <Select
                        value={config.trends.provider}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                trends: {
                                    ...current.trends,
                                    provider: value as "serpapi",
                                },
                            }))
                        }
                    >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(AI_BLOGGER_TREND_PROVIDER_META).map(([provider, meta]) => (
                                <SelectItem key={provider} value={provider}>
                                    {meta.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Default Location</Label>
                    <Select
                        value={locationToSelectValue(config.trends.defaultLocation)}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                trends: {
                                    ...current.trends,
                                    defaultLocation: locationFromSelectValue(value),
                                },
                            }))
                        }
                    >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                            {SERPAPI_GEO_COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                    {country.code === "__global__"
                                        ? country.name
                                        : `${country.name} (${country.code.toUpperCase()})`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-foreground">Use live trends</p>
                            <p className="text-xs text-muted-foreground">Turn on SerpAPI-backed Google Trends for AI Blogger.</p>
                        </div>
                        <Switch
                            checked={config.trends.enabled}
                            onCheckedChange={(checked) =>
                                setConfig((current) => ({
                                    ...current,
                                    trends: {
                                        ...current.trends,
                                        enabled: checked,
                                    },
                                }))
                            }
                        />
                    </div>
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Primary API Key</Label>
                    <div className="relative">
                        <Input
                            type={visibleKeys["trends:primary"] ? "text" : "password"}
                            value={config.trends.apiKey || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    trends: {
                                        ...current.trends,
                                        apiKey: event.target.value,
                                    },
                                }))
                            }
                            placeholder="Required when live trends is enabled"
                            className="h-11 rounded-xl border-border bg-background pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => toggleKeyVisibility("trends:primary")}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                            {visibleKeys["trends:primary"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Fallback API Key</Label>
                    <div className="relative">
                        <Input
                            type={visibleKeys["trends:fallback"] ? "text" : "password"}
                            value={config.trends.fallbackApiKey || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    trends: {
                                        ...current.trends,
                                        fallbackApiKey: event.target.value,
                                    },
                                }))
                            }
                            placeholder="Optional backup SerpAPI key"
                            className="h-11 rounded-xl border-border bg-background pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => toggleKeyVisibility("trends:fallback")}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                            {visibleKeys["trends:fallback"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-foreground">Fallback key retry</p>
                            <p className="text-xs text-muted-foreground">Retry the trends request with the backup key on quota or provider failure.</p>
                        </div>
                        <Switch
                            checked={config.trends.fallbackEnabled}
                            onCheckedChange={(checked) =>
                                setConfig((current) => ({
                                    ...current,
                                    trends: {
                                        ...current.trends,
                                        fallbackEnabled: checked,
                                    },
                                }))
                            }
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-foreground">Fallback to AI</p>
                            <p className="text-xs text-muted-foreground">If the live provider is disabled or fails, continue with the AI-only topic discovery stage.</p>
                        </div>
                        <Switch
                            checked={config.trends.fallbackToAi}
                            onCheckedChange={(checked) =>
                                setConfig((current) => ({
                                    ...current,
                                    trends: {
                                        ...current.trends,
                                        fallbackToAi: checked,
                                    },
                                }))
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
