"use client";

import { Globe } from "lucide-react";
import { AI_BLOGGER_CRAWL_PROVIDER_META } from "@/lib/ai-blogger-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ConfigSectionProps } from "./shared";
import { listToTextarea, textareaToList } from "./shared";

export default function CrawlSettings({ config, setConfig }: ConfigSectionProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                            <Globe className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Website Crawl Settings</h2>
                            <p className="text-sm text-muted-foreground">
                                Controls how Website URL mode fetches site pages, refreshes cached snapshots, and filters which paths can be crawled.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {AI_BLOGGER_CRAWL_PROVIDER_META[config.crawl.provider].description}
                        {` `}
                        These settings apply before topic discovery when Website URL mode is selected.
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {config.crawl.maxPages} pages
                    </span>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                        {config.crawl.refreshWindowHours}h cache
                    </span>
                    <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            config.crawl.enabled
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-border bg-background text-muted-foreground"
                        }`}
                    >
                        {config.crawl.enabled ? "Website crawl enabled" : "Website crawl disabled"}
                    </span>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <Select
                        value={config.crawl.provider}
                        onValueChange={(value) =>
                            setConfig((current) => ({
                                ...current,
                                crawl: {
                                    ...current.crawl,
                                    provider: value as "basic-fetch",
                                },
                            }))
                        }
                    >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(AI_BLOGGER_CRAWL_PROVIDER_META).map(([provider, meta]) => (
                                <SelectItem key={provider} value={provider}>
                                    {meta.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Max Pages</Label>
                    <Input
                        type="number"
                        min={1}
                        max={6}
                        value={config.crawl.maxPages}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                crawl: {
                                    ...current.crawl,
                                    maxPages: Number.parseInt(event.target.value || "4", 10) || 4,
                                },
                            }))
                        }
                        className="h-11 rounded-xl border-border bg-background"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Timeout (ms)</Label>
                    <Input
                        type="number"
                        min={2000}
                        max={15000}
                        step={500}
                        value={config.crawl.timeoutMs}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                crawl: {
                                    ...current.crawl,
                                    timeoutMs: Number.parseInt(event.target.value || "8000", 10) || 8000,
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
                        value={config.crawl.refreshWindowHours}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                crawl: {
                                    ...current.crawl,
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
                        <p className="text-sm font-medium text-foreground">Enable website crawl</p>
                        <p className="text-xs text-muted-foreground">
                            When disabled, Website URL mode falls back to URL-only prompting without fetching site pages.
                        </p>
                    </div>
                    <Switch
                        checked={config.crawl.enabled}
                        onCheckedChange={(checked) =>
                            setConfig((current) => ({
                                ...current,
                                crawl: {
                                    ...current.crawl,
                                    enabled: checked,
                                },
                            }))
                        }
                    />
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Allowed Paths</Label>
                    <Textarea
                        value={listToTextarea(config.crawl.allowedPaths)}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                crawl: {
                                    ...current.crawl,
                                    allowedPaths: textareaToList(event.target.value),
                                },
                            }))
                        }
                        placeholder={"/services\n/about"}
                        className="min-h-[140px] rounded-xl border-border bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                        Optional. One path per line. When filled, only matching paths are crawled after the homepage.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Blocked Paths</Label>
                    <Textarea
                        value={listToTextarea(config.crawl.blockedPaths)}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                crawl: {
                                    ...current.crawl,
                                    blockedPaths: textareaToList(event.target.value),
                                },
                            }))
                        }
                        placeholder={"/login\n/cart"}
                        className="min-h-[140px] rounded-xl border-border bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                        Optional. Matching paths are skipped even if they are linked from the homepage.
                    </p>
                </div>
            </div>
        </div>
    );
}
