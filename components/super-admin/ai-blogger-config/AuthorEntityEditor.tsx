"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ConfigSectionProps } from "./shared";
import { listToTextarea, textareaToList } from "./shared";

interface AuthorEntityEditorProps extends ConfigSectionProps {
    resetSection: (section: "author" | "entityModeling") => void;
}

export default function AuthorEntityEditor({ config, setConfig, resetSection }: AuthorEntityEditorProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Author & Entity Modeling</h2>
                        <p className="text-sm text-muted-foreground">
                            Configure author identity and structured data schema for improved E-E-A-T and rich results.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => { resetSection("author"); resetSection("entityModeling"); }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset section
                </button>
            </div>

            <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-foreground">Enable author attribution</p>
                            <p className="text-xs text-muted-foreground">
                                Attach author identity to BlogPosting schema on published posts.
                            </p>
                        </div>
                        <Switch
                            checked={config.author.enabled}
                            onCheckedChange={(checked) =>
                                setConfig((current) => ({
                                    ...current,
                                    author: { ...current.author, enabled: checked },
                                }))
                            }
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Author Name</Label>
                        <Input
                            type="text"
                            value={config.author.name}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    author: { ...current.author, name: event.target.value },
                                }))
                            }
                            placeholder="e.g. John Doe"
                            className="h-11 rounded-xl border-border bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Author URL</Label>
                        <Input
                            type="text"
                            value={config.author.url || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    author: { ...current.author, url: event.target.value },
                                }))
                            }
                            placeholder="Enter author profile URL"
                            className="h-11 rounded-xl border-border bg-background"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Author Bio</Label>
                    <Textarea
                        value={config.author.bio || ""}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                author: { ...current.author, bio: event.target.value },
                            }))
                        }
                        rows={3}
                        placeholder="Short professional bio displayed in structured data and author boxes."
                        className="rounded-xl border-border bg-background"
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Author Image URL</Label>
                        <Input
                            type="text"
                            value={config.author.imageUrl || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    author: { ...current.author, imageUrl: event.target.value },
                                }))
                            }
                            placeholder="Enter author image URL"
                            className="h-11 rounded-xl border-border bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Social Profiles (one per line)</Label>
                        <Textarea
                            value={listToTextarea(config.author.socialProfiles || [])}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    author: { ...current.author, socialProfiles: textareaToList(event.target.value) },
                                }))
                            }
                            rows={3}
                            placeholder={"https://twitter.com/johndoe\nhttps://linkedin.com/in/johndoe"}
                            className="rounded-xl border-border bg-background"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">Entity & Schema Modeling</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    Organization identity and structured data toggles that control JSON-LD output on published posts.
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Organization Name</Label>
                        <Input
                            type="text"
                            value={config.entityModeling.organizationName || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    entityModeling: { ...current.entityModeling, organizationName: event.target.value },
                                }))
                            }
                            placeholder="e.g. Acme Digital"
                            className="h-11 rounded-xl border-border bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Organization URL</Label>
                        <Input
                            type="text"
                            value={config.entityModeling.organizationUrl || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    entityModeling: { ...current.entityModeling, organizationUrl: event.target.value },
                                }))
                            }
                            placeholder="https://acme.digital"
                            className="h-11 rounded-xl border-border bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Organization Logo URL</Label>
                        <Input
                            type="text"
                            value={config.entityModeling.organizationLogoUrl || ""}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    entityModeling: { ...current.entityModeling, organizationLogoUrl: event.target.value },
                                }))
                            }
                            placeholder="https://acme.digital/logo.png"
                            className="h-11 rounded-xl border-border bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Service Names (one per line)</Label>
                        <Textarea
                            value={listToTextarea(config.entityModeling.serviceNames || [])}
                            onChange={(event) =>
                                setConfig((current) => ({
                                    ...current,
                                    entityModeling: { ...current.entityModeling, serviceNames: textareaToList(event.target.value) },
                                }))
                            }
                            rows={3}
                            placeholder={"SEO Consulting\nContent Marketing\nWeb Development"}
                            className="rounded-xl border-border bg-background"
                        />
                    </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    {[
                        ["enableArticleSchema", "BlogPosting schema", "Generates BlogPosting JSON-LD with author, datePublished, and publisher."],
                        ["enableOrganizationSchema", "Organization schema", "Adds Organization JSON-LD with name, logo, and URL to post pages."],
                        ["enableFaqSchema", "FAQ schema", "Outputs FAQPage JSON-LD from FAQ pack data for rich results."],
                        ["enableBreadcrumbSchema", "Breadcrumb schema", "Adds BreadcrumbList JSON-LD for navigation trails in SERPs."],
                    ].map(([key, title, description]) => (
                        <div key={key} className="rounded-xl border border-border bg-background/60 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{title}</p>
                                    <p className="text-xs text-muted-foreground">{description}</p>
                                </div>
                                <Switch
                                    checked={!!config.entityModeling[key as keyof typeof config.entityModeling]}
                                    onCheckedChange={(checked) =>
                                        setConfig((current) => ({
                                            ...current,
                                            entityModeling: {
                                                ...current.entityModeling,
                                                [key]: checked,
                                            },
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-foreground">Enable entity modeling</p>
                            <p className="text-xs text-muted-foreground">
                                Master toggle for all structured data output on published posts.
                            </p>
                        </div>
                        <Switch
                            checked={config.entityModeling.enabled}
                            onCheckedChange={(checked) =>
                                setConfig((current) => ({
                                    ...current,
                                    entityModeling: {
                                        ...current.entityModeling,
                                        enabled: checked,
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
