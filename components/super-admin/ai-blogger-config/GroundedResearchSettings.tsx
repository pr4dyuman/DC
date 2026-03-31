"use client";

import { RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ConfigSectionProps } from "./shared";
import { listToTextarea, textareaToList } from "./shared";

interface GroundedResearchSettingsProps extends ConfigSectionProps {
    resetSection: (section: "groundedResearch") => void;
}

export default function GroundedResearchSettings({ config, setConfig, resetSection }: GroundedResearchSettingsProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                            <Search className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Grounded Research Settings</h2>
                            <p className="text-sm text-muted-foreground">
                                Controls how strongly AI Blogger leans on trusted external sources during research and writing.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        Use this section to define how many sources are collected, how strict trust filtering should be, and which source types are allowed.
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => resetSection("groundedResearch")}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset section
                    </button>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {config.groundedResearch.maxSources} sources
                    </span>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {config.groundedResearch.refreshWindowHours}h cache
                    </span>
                    <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            config.groundedResearch.enabled
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-border bg-background text-muted-foreground"
                        }`}
                    >
                        {config.groundedResearch.enabled ? "Grounded research enabled" : "Grounded research disabled"}
                    </span>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Max Sources</Label>
                    <Input
                        type="number"
                        min={1}
                        max={8}
                        value={config.groundedResearch.maxSources}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                groundedResearch: {
                                    ...current.groundedResearch,
                                    maxSources: Number.parseInt(event.target.value || "5", 10) || 5,
                                },
                            }))
                        }
                        className="h-11 rounded-xl border-border bg-background"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Trust Preference</Label>
                    <Select
                        value={config.groundedResearch.trustPreference}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                groundedResearch: {
                                    ...current.groundedResearch,
                                    trustPreference: value as "balanced" | "high-only",
                                },
                            }))
                        }
                    >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="high-only">High Trust Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Freshness Preference</Label>
                    <Select
                        value={config.groundedResearch.freshnessPreference}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                groundedResearch: {
                                    ...current.groundedResearch,
                                    freshnessPreference: value as "balanced" | "recent-first" | "evergreen-ok",
                                },
                            }))
                        }
                    >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="recent-first">Recent First</SelectItem>
                            <SelectItem value="evergreen-ok">Evergreen OK</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Refresh Window (hours)</Label>
                    <Input
                        type="number"
                        min={1}
                        max={720}
                        value={config.groundedResearch.refreshWindowHours}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                groundedResearch: {
                                    ...current.groundedResearch,
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
                        <p className="text-sm font-medium text-foreground">Enable grounded research</p>
                        <p className="text-xs text-muted-foreground">
                            When enabled, AI Blogger keeps using real external source packs for research and drafting.
                        </p>
                    </div>
                    <Switch
                        checked={config.groundedResearch.enabled}
                        onCheckedChange={(checked) =>
                            setConfig((current) => ({
                                ...current,
                                groundedResearch: {
                                    ...current.groundedResearch,
                                    enabled: checked,
                                },
                            }))
                        }
                    />
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Allowed Source Types</Label>
                    <Textarea
                        value={listToTextarea(config.groundedResearch.allowedSourceTypes)}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                groundedResearch: {
                                    ...current.groundedResearch,
                                    allowedSourceTypes: textareaToList(event.target.value) as typeof current.groundedResearch.allowedSourceTypes,
                                },
                            }))
                        }
                        placeholder={"government\neducation\nofficial\nindustry"}
                        className="min-h-[140px] rounded-xl border-border bg-background"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Blocked Domains</Label>
                    <Textarea
                        value={listToTextarea(config.groundedResearch.blockedDomains)}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                groundedResearch: {
                                    ...current.groundedResearch,
                                    blockedDomains: textareaToList(event.target.value),
                                },
                            }))
                        }
                        placeholder={"reddit.com\npinterest.com"}
                        className="min-h-[140px] rounded-xl border-border bg-background"
                    />
                </div>
            </div>
        </div>
    );
}
