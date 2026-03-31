"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { AI_BLOGGER_PRESET_META, type AIBloggerPresetKey } from "./shared";

interface PresetProfilesSectionProps {
    activePreset: AIBloggerPresetKey | null;
    applyPreset: (preset: AIBloggerPresetKey) => void;
    resetSection: (section: "all") => void;
}

export default function PresetProfilesSection({ activePreset, applyPreset, resetSection }: PresetProfilesSectionProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Preset Profiles</h2>
                            <p className="text-sm text-muted-foreground">
                                Apply a starting configuration for the agency, then fine-tune individual sections if needed.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => resetSection("all")}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <RotateCcw className="h-4 w-4" />
                    Reset all non-stage settings
                </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {(Object.entries(AI_BLOGGER_PRESET_META) as Array<[AIBloggerPresetKey, typeof AI_BLOGGER_PRESET_META[AIBloggerPresetKey]]>).map(
                    ([presetKey, preset]) => (
                        <button
                            key={presetKey}
                            type="button"
                            onClick={() => applyPreset(presetKey)}
                            className={`rounded-2xl border p-4 text-left transition ${
                                activePreset === presetKey
                                    ? "border-purple-500/40 bg-purple-500/10 shadow-sm"
                                    : "border-border bg-background/60 hover:border-purple-500/25 hover:bg-purple-500/5"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-base font-semibold text-foreground">{preset.label}</p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{preset.description}</p>
                                </div>
                                {activePreset === presetKey ? (
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                                        Active
                                    </span>
                                ) : null}
                            </div>
                        </button>
                    ),
                )}
            </div>
        </div>
    );
}
