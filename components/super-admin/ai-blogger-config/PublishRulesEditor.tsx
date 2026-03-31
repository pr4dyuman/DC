"use client";

import { Brain, Check, Eye, EyeOff, KeyRound, RotateCcw } from "lucide-react";
import { AI_MODELS } from "@/lib/ai-models";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatResolvedModel } from "./shared";
import type { ConfigSectionProps } from "./shared";

interface PublishRulesEditorProps extends ConfigSectionProps {
    resetSection: (section: "publishRules") => void;
}

export default function PublishRulesEditor({
    config,
    setConfig,
    visibleKeys,
    toggleKeyVisibility,
    resetSection,
}: PublishRulesEditorProps) {
    const publishRuleToggles = [
        ["requireInternalLinks", "Require internal links", "Block weak posts that do not support the site with internal links."],
        ["requireMetaDescription", "Require meta description", "Ensure posts have a proper search snippet before publish."],
        ["requireFaqForInformational", "Require FAQ for informational intent", "Use FAQ coverage when the topic is informational and user questions matter."],
        ["requireImageAltText", "Require image alt text", "Do not treat featured images as publish-ready without alt text."],
        ["requireManualApproval", "Require manual approval", "Keep a human approval checkpoint before public publish."],
        ["requireCanonicalUrl", "Require canonical URL", "Require canonical handling for technical SEO clarity."],
        ["requireSchemaMarkup", "Require schema markup", "Treat structured data as part of publish readiness."],
    ] as const;

    const aiPolicyToggles = [
        ["enableFinalChecker", "Enable final AI checker", "Run the final AI checker policy before the last approval step."],
        ["autoFixStructuralIssues", "Auto-fix structural blockers", "Allow AI repair for meta description, alt text, FAQ, heading structure, internal links, content expansion, canonical, and title polish."],
        ["autoFixToneMismatch", "Auto-fix tone mismatch", "Let AI rewrite tone or brand mismatch issues and keep them in the review report."],
        ["flagWeakBusinessFit", "Flag weak business fit", "Keep low-fit topics visible for editorial review instead of silently passing them."],
        ["flagWeakCtaAlignment", "Flag weak CTA alignment", "Mark drafts where the CTA path is weak even after AI repair."],
        ["softenQuestionableClaims", "Soften questionable claims", "Rewrite or remove unsupported factual claims instead of letting the draft overstate evidence."],
        ["flagSoftCannibalization", "Flag soft cannibalization", "Show review warnings when overlap looks moderate instead of blocking immediately."],
        ["requireHumanReviewForHighRiskClaims", "Human review for risky claims", "Escalate unsupported or sensitive claims to a human after repair attempts."],
        ["requireHumanReviewForHighRiskCannibalization", "Human review for high cannibalization", "Keep strong same-topic conflicts in human hands instead of auto-resolving them."],
        ["requireGroundedSourcesForClaims", "Require grounded support for claims", "Make the AI checker rely on grounded sources before keeping factual claims."],
    ] as const;
    const finalCheckerKey = "publishRules:finalChecker";

    // Validate that writeBlog provider is properly configured before using it as final checker
    const isWriteBlogConfigured = Boolean(config.writeBlog?.provider && config.writeBlog?.apiKey);
    const finalCheckerProvider = isWriteBlogConfigured ? config.writeBlog.provider : "openai";
    const finalCheckerModels = AI_MODELS[finalCheckerProvider] || [];
    const storedFinalCheckerModel = config.publishRules.aiReviewPolicy.model || "";
    const finalCheckerModelSelection = storedFinalCheckerModel
        ? finalCheckerModels.some((model) => model.id === storedFinalCheckerModel)
            ? storedFinalCheckerModel
            : "custom"
        : "__inherit__";
    const finalCheckerCustomModelId = storedFinalCheckerModel === "custom"
        ? config.publishRules.aiReviewPolicy.customModelId || ""
        : storedFinalCheckerModel && !finalCheckerModels.some((model) => model.id === storedFinalCheckerModel)
            ? storedFinalCheckerModel
            : config.publishRules.aiReviewPolicy.customModelId || "";
    const resolvedFinalCheckerModelLabel = config.publishRules.aiReviewPolicy.model
        ? formatResolvedModel({
            model: config.publishRules.aiReviewPolicy.model,
            customModelId:
                config.publishRules.aiReviewPolicy.model === "custom"
                    ? config.publishRules.aiReviewPolicy.customModelId
                    : "",
        })
        : formatResolvedModel(isWriteBlogConfigured ? config.writeBlog : { model: "gpt-4o", customModelId: "" });

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
                        <Check className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Publish Rules</h2>
                        <p className="text-sm text-muted-foreground">
                            Define the quality, AI repair, and approval rules that agencies should enforce before publish.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => resetSection("publishRules")}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset section
                </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Minimum SEO Score</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={config.publishRules.minimumSeoScore}
                        onChange={(event) =>
                            setConfig((current) => ({
                                ...current,
                                publishRules: {
                                    ...current.publishRules,
                                    minimumSeoScore: Number.parseInt(event.target.value || "80", 10) || 80,
                                },
                            }))
                        }
                        className="h-11 rounded-xl border-border bg-background"
                    />
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {publishRuleToggles.map(([key, title, description]) => (
                    <div key={key} className="rounded-xl border border-border bg-background/60 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-foreground">{title}</p>
                                <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                            <Switch
                                checked={!!config.publishRules[key as keyof typeof config.publishRules]}
                                onCheckedChange={(checked) =>
                                    setConfig((current) => ({
                                        ...current,
                                        publishRules: {
                                            ...current.publishRules,
                                            [key]: checked,
                                        },
                                    }))
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Final AI Checker Policy</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        This is the settings layer for the blocker policy you described: structural issues can be auto-repaired,
                        judgment calls can be fixed and flagged, and high-risk items stay human-gated.
                    </p>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-background/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Layer 1 · Auto-Fix</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Mechanical SEO and structure fixes the AI can repair safely.
                        </p>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-background/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Layer 2 · Fix + Flag</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Editorial and risk signals the AI can improve, while still leaving a visible review trail.
                        </p>
                    </div>
                    <div className="rounded-xl border border-rose-500/20 bg-background/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">Layer 3 · Human Gate</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            High-risk claims, serious cannibalization, and live publishing remain under human control.
                        </p>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-primary/15 bg-background/70 p-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold text-foreground">Final Checker Runtime</h4>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                            The final checker uses the <span className="font-medium text-foreground">Write Blog</span> provider
                            ({finalCheckerProvider}) so it stays aligned with the main AI Blogger drafting runtime.
                        </p>
                        <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                            Current runtime: <span className="font-medium text-foreground">{resolvedFinalCheckerModelLabel}</span>
                            {config.publishRules.aiReviewPolicy.apiKey?.trim()
                                ? " • dedicated key"
                                : " • inherits the write-stage / agency runtime key when available"}
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Model</Label>
                            <Select
                                value={finalCheckerModelSelection}
                                onValueChange={(value) =>
                                    setConfig((current) => ({
                                        ...current,
                                        publishRules: {
                                            ...current.publishRules,
                                            aiReviewPolicy: {
                                                ...current.publishRules.aiReviewPolicy,
                                                model: value === "__inherit__" ? "" : value,
                                                customModelId:
                                                    value === "__inherit__"
                                                        ? ""
                                                        : value === "custom"
                                                            ? current.publishRules.aiReviewPolicy.customModelId || ""
                                                            : "",
                                            },
                                        },
                                    }))
                                }
                            >
                                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__inherit__">
                                        Use Write Blog model ({formatResolvedModel(config.writeBlog)})
                                    </SelectItem>
                                    {finalCheckerModels.map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Dedicated API Key</Label>
                            <div className="relative">
                                <Input
                                    type={visibleKeys[finalCheckerKey] ? "text" : "password"}
                                    value={config.publishRules.aiReviewPolicy.apiKey || ""}
                                    onChange={(event) =>
                                        setConfig((current) => ({
                                            ...current,
                                            publishRules: {
                                                ...current.publishRules,
                                                aiReviewPolicy: {
                                                    ...current.publishRules.aiReviewPolicy,
                                                    apiKey: event.target.value,
                                                },
                                            },
                                        }))
                                    }
                                    placeholder="Leave empty to inherit the write-stage runtime key"
                                    className="h-11 rounded-xl border-border bg-background pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility(finalCheckerKey)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    {visibleKeys[finalCheckerKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {finalCheckerModelSelection === "custom" && (
                            <div className="space-y-2 lg:col-span-2">
                                <Label className="text-xs text-muted-foreground">Custom Model ID</Label>
                                <Input
                                    type="text"
                                    value={finalCheckerCustomModelId}
                                    onChange={(event) =>
                                        setConfig((current) => ({
                                            ...current,
                                            publishRules: {
                                                ...current.publishRules,
                                                aiReviewPolicy: {
                                                    ...current.publishRules.aiReviewPolicy,
                                                    model: "custom",
                                                    customModelId: event.target.value,
                                                },
                                            },
                                        }))
                                    }
                                    placeholder="e.g. ft:gpt-4o:your-org:final-checker"
                                    className="h-11 rounded-xl border-border bg-background"
                                />
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs leading-5 text-sky-200">
                        <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        Leave the key blank to reuse the Write Blog runtime path. This keeps the final checker wired to the same AI Blogger
                        provider while still letting you override the model or attach a dedicated key when needed.
                    </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {aiPolicyToggles.map(([key, title, description]) => (
                        <div key={key} className="rounded-xl border border-border bg-background/70 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{title}</p>
                                    <p className="text-xs text-muted-foreground">{description}</p>
                                </div>
                                <Switch
                                    checked={config.publishRules.aiReviewPolicy[key]}
                                    onCheckedChange={(checked) =>
                                        setConfig((current) => ({
                                            ...current,
                                            publishRules: {
                                                ...current.publishRules,
                                                aiReviewPolicy: {
                                                    ...current.publishRules.aiReviewPolicy,
                                                    [key]: checked,
                                                },
                                            },
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs leading-5 text-muted-foreground">
                    Require manual approval still controls the final live publish checkpoint. The AI checker policy defines how drafts
                    should be repaired and flagged before that approval happens.
                </div>
            </div>
        </div>
    );
}
