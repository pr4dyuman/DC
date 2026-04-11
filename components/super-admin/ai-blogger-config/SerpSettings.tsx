"use client";

import { Eye, EyeOff, Search } from "lucide-react";
import { AI_BLOGGER_SERP_PROVIDER_META } from "@/lib/ai-blogger-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SERPAPI_GEO_COUNTRIES, type ConfigSectionProps } from "./shared";

export default function SerpSettings({ config, setConfig, visibleKeys, toggleKeyVisibility }: ConfigSectionProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                            <Search className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">SERP Analysis Settings</h2>
                            <p className="text-sm text-muted-foreground">
                                Captures ranking pages, People Also Ask questions, search intent, and competitor coverage before SEO planning.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {AI_BLOGGER_SERP_PROVIDER_META[config.serp.provider].description}
                        {` `}
                        If no dedicated SERP key is provided, runtime can reuse the Live Trends SerpAPI key.
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {SERPAPI_GEO_COUNTRIES.find((c) => c.code === config.serp.defaultLocation)?.name || config.serp.defaultLocation.toUpperCase()}
                    </span>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {config.serp.device}
                    </span>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {config.serp.maxCompetitors} competitors
                    </span>
                    <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            config.serp.enabled
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-border bg-background text-muted-foreground"
                        }`}
                    >
                        {config.serp.enabled ? "SERP analysis enabled" : "SERP analysis disabled"}
                    </span>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-5">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <Select
                        value={config.serp.provider}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                serp: {
                                    ...current.serp,
                                    provider: value as "serpapi",
                                },
                            }))
                        }
                    >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(AI_BLOGGER_SERP_PROVIDER_META).map(([provider, meta]) => (
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
                        value={config.serp.defaultLocation}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                serp: {
                                    ...current.serp,
                                    defaultLocation: value,
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
                                    {country.name} ({country.code.toUpperCase()})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Device</Label>
                    <Select
                        value={config.serp.device}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                serp: {
                                    ...current.serp,
                                    device: value as "desktop" | "mobile",
                                },
                            }))
                        }
                    >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desktop">Desktop</SelectItem>
                            <SelectItem value="mobile">Mobile</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Max Competitors</Label>
                    <Input
                        type="number"
                        min={3}
                        max={10}
                        value={config.serp.maxCompetitors}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                serp: {
                                    ...current.serp,
                                    maxCompetitors: Number.parseInt(event.target.value || "5", 10) || 5,
                                },
                            }))
                        }
                        className="h-11 rounded-xl border-border bg-background"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Refresh Window (hours)</Label>
                    <Input
                        type="number"
                        min={1}
                        max={720}
                        value={config.serp.refreshWindowHours}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                serp: {
                                    ...current.serp,
                                    refreshWindowHours: Number.parseInt(event.target.value || "24", 10) || 24,
                                },
                            }))
                        }
                        className="h-11 rounded-xl border-border bg-background"
                    />
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-foreground">Enable SERP analysis</p>
                        <p className="text-xs text-muted-foreground">
                            Runs a Google search snapshot after topic selection so research and draft prompts reflect ranking reality.
                        </p>
                    </div>
                    <Switch
                        checked={config.serp.enabled}
                        onCheckedChange={(checked) =>
                            setConfig((current) => ({
                                ...current,
                                serp: {
                                    ...current.serp,
                                    enabled: checked,
                                },
                            }))
                        }
                    />
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Primary API Key</Label>
                    <div className="relative">
                        <Input
                            type={visibleKeys["serp:primary"] ? "text" : "password"}
                            value={config.serp.apiKey || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    serp: {
                                        ...current.serp,
                                        apiKey: event.target.value,
                                    },
                                }))
                            }
                            placeholder="Optional dedicated SerpAPI key"
                            className="h-11 rounded-xl border-border bg-background pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => toggleKeyVisibility("serp:primary")}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                            {visibleKeys["serp:primary"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Fallback API Key</Label>
                    <div className="relative">
                        <Input
                            type={visibleKeys["serp:fallback"] ? "text" : "password"}
                            value={config.serp.fallbackApiKey || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    serp: {
                                        ...current.serp,
                                        fallbackApiKey: event.target.value,
                                    },
                                }))
                            }
                            placeholder="Optional backup SerpAPI key"
                            className="h-11 rounded-xl border-border bg-background pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => toggleKeyVisibility("serp:fallback")}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                            {visibleKeys["serp:fallback"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-foreground">Fallback key retry</p>
                        <p className="text-xs text-muted-foreground">
                            Retry SERP snapshot requests with the backup key when the provider hits quota or rate limits.
                        </p>
                    </div>
                    <Switch
                        checked={config.serp.fallbackEnabled}
                        onCheckedChange={(checked) =>
                            setConfig((current) => ({
                                ...current,
                                serp: {
                                    ...current.serp,
                                    fallbackEnabled: checked,
                                },
                            }))
                        }
                    />
                </div>
            </div>
        </div>
    );
}
