"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowLeft,
    Brain,
    Check,
    Loader2,
    Save,
    Trash2,
} from "lucide-react";

import {
    getAgencyAIBloggerConfigSuperAdmin,
    getAgencyAIBloggerOverviewSuperAdmin,
    getAgencyAIConfigSuperAdmin,
    getAgencyDetails,
    removeAgencyAIBloggerConfigSuperAdmin,
    updateAgencyAIBloggerConfigSuperAdmin,
} from "@/lib/actions/super-admin";
import {
    getDefaultAIBloggerConfig,
    getDefaultAIBloggerGroundedResearchConfig,
    getDefaultAIBloggerImageGenerationConfig,
    getDefaultAIBloggerPagePerformanceConfig,
    getDefaultAIBloggerPublishRulesConfig,
    getDefaultAIBloggerSearchConsoleConfig,
    getDefaultAIBloggerAuthorConfig,
    getDefaultAIBloggerEntityModelingConfig,
    mergeAIBloggerConfig,
} from "@/lib/ai-blogger-config";
import type { AIBloggerConfig, AIConfig } from "@/lib/types";

import {
    RefreshQueueSection,
    PresetProfilesSection,
    PipelineOverviewSection,
    ReviewPipelineOverview,
    TrendSettings,
    CrawlSettings,
    SerpSettings,
    GroundedResearchSettings,
    DataProviderSettings,
    PublishRulesEditor,
    AuthorEntityEditor,
    PipelineStagesEditor,
    ConfigPipelinePreview,
    type AIBloggerPresetKey,
    type KeyVisibilityState,
    AI_BLOGGER_PRESET_META,
} from "./ai-blogger-config";

/* ── Preset builder ──────────────────────────────────────────────── */

function buildPresetConfig(
    preset: AIBloggerPresetKey,
    currentConfig: AIBloggerConfig,
    baseAiConfig: AIConfig | null,
) {
    const defaults = getDefaultAIBloggerConfig(baseAiConfig);

    if (preset === "basic") {
        return mergeAIBloggerConfig(
            {
                ...currentConfig,
                fallbackEnabled: true,
                trends: {
                    ...currentConfig.trends,
                    enabled: false,
                    fallbackToAi: true,
                },
                crawl: {
                    ...currentConfig.crawl,
                    enabled: true,
                    maxPages: 3,
                },
                serp: {
                    ...currentConfig.serp,
                    enabled: false,
                    maxCompetitors: 3,
                },
                groundedResearch: {
                    ...currentConfig.groundedResearch,
                    enabled: false,
                },
                searchConsole: {
                    ...currentConfig.searchConsole,
                    enabled: false,
                },
                pagePerformance: {
                    ...currentConfig.pagePerformance,
                    enabled: false,
                },
                publishRules: {
                    ...currentConfig.publishRules,
                    requireInternalLinks: false,
                    requireMetaDescription: true,
                    requireFaqForInformational: false,
                    requireImageAltText: true,
                    requireManualApproval: true,
                    minimumSeoScore: 70,
                    requireCanonicalUrl: false,
                    requireSchemaMarkup: false,
                },
            },
            baseAiConfig,
        );
    }

    if (preset === "seo-strong") {
        return mergeAIBloggerConfig(
            {
                ...currentConfig,
                fallbackEnabled: true,
                trends: {
                    ...currentConfig.trends,
                    enabled: true,
                    fallbackToAi: true,
                },
                crawl: {
                    ...currentConfig.crawl,
                    enabled: true,
                    maxPages: Math.max(currentConfig.crawl.maxPages, 4),
                },
                serp: {
                    ...currentConfig.serp,
                    enabled: true,
                    maxCompetitors: Math.max(currentConfig.serp.maxCompetitors, 5),
                },
                groundedResearch: {
                    ...currentConfig.groundedResearch,
                    ...getDefaultAIBloggerGroundedResearchConfig(),
                    enabled: true,
                    maxSources: 5,
                },
                publishRules: {
                    ...currentConfig.publishRules,
                    ...getDefaultAIBloggerPublishRulesConfig(),
                    minimumSeoScore: 82,
                },
            },
            baseAiConfig,
        );
    }

    return mergeAIBloggerConfig(
        {
            ...currentConfig,
            ...defaults,
            fallbackEnabled: true,
            trends: {
                ...currentConfig.trends,
                ...defaults.trends,
                enabled: true,
                fallbackToAi: true,
            },
            crawl: {
                ...currentConfig.crawl,
                ...defaults.crawl,
                enabled: true,
                maxPages: 5,
            },
            serp: {
                ...currentConfig.serp,
                ...defaults.serp,
                enabled: true,
                maxCompetitors: 6,
            },
            groundedResearch: {
                ...currentConfig.groundedResearch,
                ...defaults.groundedResearch,
                enabled: true,
                maxSources: 6,
                trustPreference: "high-only",
                freshnessPreference: "recent-first",
            },
            searchConsole: {
                ...currentConfig.searchConsole,
                ...getDefaultAIBloggerSearchConsoleConfig(),
                propertyUrl: currentConfig.searchConsole.propertyUrl,
                credentialsJson: currentConfig.searchConsole.credentialsJson,
                authStatus: currentConfig.searchConsole.authStatus,
                enabled: true,
            },
            pagePerformance: {
                ...currentConfig.pagePerformance,
                ...getDefaultAIBloggerPagePerformanceConfig(),
                apiKey: currentConfig.pagePerformance.apiKey,
                enabled: true,
                strategy: "both",
                performanceThreshold: 75,
            },
            publishRules: {
                ...currentConfig.publishRules,
                ...defaults.publishRules,
                requireInternalLinks: true,
                requireMetaDescription: true,
                requireFaqForInformational: true,
                requireImageAltText: true,
                requireManualApproval: true,
                minimumSeoScore: 90,
                requireCanonicalUrl: true,
                requireSchemaMarkup: true,
            },
        },
        baseAiConfig,
    );
}

/* ── Main component ──────────────────────────────────────────────── */

export default function AIBloggerAgencyConfigClient({ agencyId }: { agencyId: string }) {
    const [agencyName, setAgencyName] = useState("");
    const [agencyPlan, setAgencyPlan] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [configured, setConfigured] = useState(false);
    const [baseAiConfig, setBaseAiConfig] = useState<AIConfig | null>(null);
    const [config, setConfig] = useState<AIBloggerConfig>(() => mergeAIBloggerConfig(null, null));
    const [overview, setOverview] = useState<Awaited<ReturnType<typeof getAgencyAIBloggerOverviewSuperAdmin>> | null>(null);
    const [visibleKeys, setVisibleKeys] = useState<KeyVisibilityState>({});
    const defaultConfig = useMemo(() => getDefaultAIBloggerConfig(baseAiConfig), [baseAiConfig]);
    const savedConfigJson = useRef<string>("");

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const [details, agencyAiConfig, aiBloggerConfig, agencyOverview] = await Promise.all([
                    getAgencyDetails(agencyId),
                    getAgencyAIConfigSuperAdmin(agencyId),
                    getAgencyAIBloggerConfigSuperAdmin(agencyId),
                    getAgencyAIBloggerOverviewSuperAdmin(agencyId),
                ]);

                if (!active) {
                    return;
                }

                setAgencyName(details.agency.name);
                setAgencyPlan(details.agency.plan);
                setBaseAiConfig(agencyAiConfig);
                setConfig(mergeAIBloggerConfig(aiBloggerConfig, agencyAiConfig));
                setConfigured(Boolean(aiBloggerConfig));
                setOverview(agencyOverview);
                // Save clean version (API keys excluded) for dirty checking
                const mergedConfig = mergeAIBloggerConfig(aiBloggerConfig, agencyAiConfig);
                const cleanConfig = getCleanConfigForDirtyCheck(mergedConfig);
                savedConfigJson.current = JSON.stringify(cleanConfig);
            } catch (loadError) {
                if (!active) {
                    return;
                }

                setError(loadError instanceof Error ? loadError.message : "Failed to load AI Blogger configuration.");
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [agencyId]);

    // Auto-clear success messages after 3 seconds with proper cleanup
    useEffect(() => {
        if (!success) return;

        const timer = setTimeout(() => {
            setSuccess("");
        }, 3000);

        return () => clearTimeout(timer);
    }, [success]);

    // Helper to create a "clean" version of config for dirty checking
    // by excluding API key fields that may be masked after server round-trip
    const getCleanConfigForDirtyCheck = (cfg: AIBloggerConfig) => {
        const cleanSecret = (value?: string) => {
            const trimmed = value?.trim() || "";
            if (!trimmed || trimmed.startsWith("****")) {
                return "";
            }

            return "__new-secret__";
        };

        return {
            ...cfg,
            trends: {
                ...cfg.trends,
                apiKey: cleanSecret(cfg.trends.apiKey),
                fallbackApiKey: cleanSecret(cfg.trends.fallbackApiKey),
            },
            serp: {
                ...cfg.serp,
                apiKey: cleanSecret(cfg.serp.apiKey),
                fallbackApiKey: cleanSecret(cfg.serp.fallbackApiKey),
            },
            pagePerformance: { ...cfg.pagePerformance, apiKey: cleanSecret(cfg.pagePerformance.apiKey) },
            imageGeneration: {
                ...cfg.imageGeneration,
                apiKey: cleanSecret(cfg.imageGeneration.apiKey),
                fallbackApiKey: cleanSecret(cfg.imageGeneration.fallbackApiKey),
            },
            publishRules: {
                ...cfg.publishRules,
                aiReviewPolicy: {
                    ...cfg.publishRules.aiReviewPolicy,
                    apiKey: cleanSecret(cfg.publishRules.aiReviewPolicy.apiKey),
                },
            },
            searchConsole: { ...cfg.searchConsole, credentialsJson: cleanSecret(cfg.searchConsole.credentialsJson) },
            extractKeywords: {
                ...cfg.extractKeywords,
                apiKey: cleanSecret(cfg.extractKeywords.apiKey),
                fallbackApiKey: cleanSecret(cfg.extractKeywords.fallbackApiKey),
            },
            research: {
                ...cfg.research,
                apiKey: cleanSecret(cfg.research.apiKey),
                fallbackApiKey: cleanSecret(cfg.research.fallbackApiKey),
            },
            seoAnalysis: {
                ...cfg.seoAnalysis,
                apiKey: cleanSecret(cfg.seoAnalysis.apiKey),
                fallbackApiKey: cleanSecret(cfg.seoAnalysis.fallbackApiKey),
            },
            writeBlog: {
                ...cfg.writeBlog,
                apiKey: cleanSecret(cfg.writeBlog.apiKey),
                fallbackApiKey: cleanSecret(cfg.writeBlog.fallbackApiKey),
            },
            generateImage: {
                ...cfg.generateImage,
                apiKey: cleanSecret(cfg.generateImage.apiKey),
                fallbackApiKey: cleanSecret(cfg.generateImage.fallbackApiKey),
            },
        };
    };

    const isDirty = useMemo(() => {
        if (!savedConfigJson.current) return false;
        // Compare without API keys to avoid false positives from masking
        const cleanConfig = getCleanConfigForDirtyCheck(config);
        const savedCleanJson = JSON.stringify(getCleanConfigForDirtyCheck(JSON.parse(savedConfigJson.current)));
        return JSON.stringify(cleanConfig) !== savedCleanJson;
    }, [config]);

    const runtimeInheritanceSummary = useMemo(() => {
        if (!baseAiConfig) {
            return "No general agency AI config found. Each AI Blogger stage should have its own API key.";
        }

        const inheritedModel = baseAiConfig.heavyTasksConfig?.model || baseAiConfig.model;
        const inheritedProvider = baseAiConfig.heavyTasksConfig?.provider || baseAiConfig.provider;

        return `Blank stage keys can inherit the agency blog runtime key when the provider matches ${inheritedProvider} / ${inheritedModel}.`;
    }, [baseAiConfig]);

    const readinessChecks = useMemo(
        () => [
            {
                label: "Live trends",
                ready: !config.trends.enabled || Boolean(config.trends.apiKey),
            },
            {
                label: "SERP analysis",
                ready: !config.serp.enabled || Boolean(config.serp.apiKey || config.trends.apiKey),
            },
            {
                label: "Grounded research",
                ready: !config.groundedResearch.enabled || config.serp.enabled,
            },
            {
                label: "Search Console",
                ready:
                    !config.searchConsole.enabled ||
                    (Boolean(config.searchConsole.propertyUrl) &&
                        config.searchConsole.authStatus === "configured"),
            },
            {
                label: "Page performance",
                ready: !config.pagePerformance.enabled || Boolean(config.pagePerformance.apiKey),
            },
            {
                label: "Publish rules",
                ready: config.publishRules.minimumSeoScore >= 60,
            },
            {
                label: "Author config",
                ready: !config.author.enabled || Boolean(config.author.name.trim()),
            },
            {
                label: "Entity modeling",
                ready: !config.entityModeling.enabled || Boolean(config.entityModeling.organizationName?.trim()),
            },
        ],
        [config],
    );
    const readinessIssues = useMemo(
        () =>
            [
                !config.trends.enabled || config.trends.apiKey
                    ? null
                    : "Live trends is enabled but no provider key is configured yet.",
                !config.serp.enabled || config.serp.apiKey || config.trends.apiKey
                    ? null
                    : "SERP analysis is enabled without a direct or inherited search API key.",
                !config.groundedResearch.enabled || config.serp.enabled
                    ? null
                    : "Grounded research depends on SERP analysis, so SERP should stay enabled.",
                !config.searchConsole.enabled ||
                (config.searchConsole.propertyUrl && config.searchConsole.authStatus === "configured")
                    ? null
                    : "Search Console is enabled but still needs a property URL and configured credentials.",
                !config.pagePerformance.enabled || config.pagePerformance.apiKey
                    ? null
                    : "Page performance is enabled but the PageSpeed API key is still missing.",
                config.publishRules.minimumSeoScore >= 60
                    ? null
                    : "Publish rules should use a minimum SEO score of at least 60 for meaningful gating.",
                config.author.enabled && !config.author.name.trim()
                    ? "Author attribution is enabled but the author name is empty."
                    : null,
                config.entityModeling.enabled && !config.entityModeling.organizationName?.trim()
                    ? "Entity modeling is enabled but the organization name is empty."
                    : null,
            ].filter((item): item is string => Boolean(item)),
        [config],
    );
    const activePreset = useMemo<AIBloggerPresetKey | null>(() => {
        const basicPreset = buildPresetConfig("basic", config, baseAiConfig);
        const seoStrongPreset = buildPresetConfig("seo-strong", config, baseAiConfig);
        const bestPossiblePreset = buildPresetConfig("best-possible", config, baseAiConfig);

        if (JSON.stringify(basicPreset.publishRules) === JSON.stringify(config.publishRules) &&
            basicPreset.trends.enabled === config.trends.enabled &&
            basicPreset.serp.enabled === config.serp.enabled &&
            basicPreset.groundedResearch.enabled === config.groundedResearch.enabled &&
            basicPreset.searchConsole.enabled === config.searchConsole.enabled &&
            basicPreset.pagePerformance.enabled === config.pagePerformance.enabled &&
            basicPreset.imageGeneration.enabled === config.imageGeneration.enabled) {
            return "basic";
        }

        if (JSON.stringify(seoStrongPreset.publishRules) === JSON.stringify(config.publishRules) &&
            seoStrongPreset.trends.enabled === config.trends.enabled &&
            seoStrongPreset.serp.enabled === config.serp.enabled &&
            seoStrongPreset.groundedResearch.enabled === config.groundedResearch.enabled &&
            seoStrongPreset.groundedResearch.maxSources === config.groundedResearch.maxSources) {
            return "seo-strong";
        }

        if (JSON.stringify(bestPossiblePreset.publishRules) === JSON.stringify(config.publishRules) &&
            bestPossiblePreset.searchConsole.enabled === config.searchConsole.enabled &&
            bestPossiblePreset.pagePerformance.enabled === config.pagePerformance.enabled &&
            bestPossiblePreset.groundedResearch.trustPreference === config.groundedResearch.trustPreference &&
            bestPossiblePreset.publishRules.minimumSeoScore === config.publishRules.minimumSeoScore) {
            return "best-possible";
        }

        return null;
    }, [baseAiConfig, config]);

    const toggleKeyVisibility = (key: string) => {
        setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const applyPreset = (preset: AIBloggerPresetKey) => {
        setConfig((current) => buildPresetConfig(preset, current, baseAiConfig));
        setSuccess(`${AI_BLOGGER_PRESET_META[preset].label} preset applied.`);
        setError("");
        // Success message will auto-clear after 3 seconds via useEffect
    };

    const resetSection = (
        section:
            | "groundedResearch"
            | "searchConsole"
            | "pagePerformance"
            | "imageGeneration"
            | "publishRules"
            | "author"
            | "entityModeling"
            | "all",
    ) => {
        setConfig((current) => {
            if (section === "all") {
                return mergeAIBloggerConfig(
                    {
                        ...defaultConfig,
                        trends: {
                            ...defaultConfig.trends,
                            apiKey: current.trends.apiKey,
                            fallbackApiKey: current.trends.fallbackApiKey,
                        },
                        serp: {
                            ...defaultConfig.serp,
                            apiKey: current.serp.apiKey,
                            fallbackApiKey: current.serp.fallbackApiKey,
                        },
                        searchConsole: {
                            ...defaultConfig.searchConsole,
                            credentialsJson: current.searchConsole.credentialsJson,
                            propertyUrl: current.searchConsole.propertyUrl,
                            authStatus: current.searchConsole.authStatus,
                        },
                        pagePerformance: {
                            ...defaultConfig.pagePerformance,
                            apiKey: current.pagePerformance.apiKey,
                        },
                        imageGeneration: {
                            ...defaultConfig.imageGeneration,
                            apiKey: current.imageGeneration.apiKey,
                            fallbackApiKey: current.imageGeneration.fallbackApiKey,
                        },
                        publishRules: {
                            ...defaultConfig.publishRules,
                            aiReviewPolicy: {
                                ...defaultConfig.publishRules.aiReviewPolicy,
                                apiKey: current.publishRules.aiReviewPolicy.apiKey,
                            },
                        },
                        extractKeywords: current.extractKeywords,
                        research: current.research,
                        seoAnalysis: current.seoAnalysis,
                        writeBlog: current.writeBlog,
                        generateImage: current.generateImage,
                    },
                    baseAiConfig,
                );
            }

            return {
                ...current,
                groundedResearch:
                    section === "groundedResearch"
                        ? getDefaultAIBloggerGroundedResearchConfig()
                        : current.groundedResearch,
                searchConsole:
                    section === "searchConsole"
                        ? {
                            ...getDefaultAIBloggerSearchConsoleConfig(),
                            credentialsJson: current.searchConsole.credentialsJson,
                            propertyUrl: current.searchConsole.propertyUrl,
                            authStatus: current.searchConsole.authStatus,
                        }
                        : current.searchConsole,
                pagePerformance:
                    section === "pagePerformance"
                        ? {
                            ...getDefaultAIBloggerPagePerformanceConfig(),
                            apiKey: current.pagePerformance.apiKey,
                        }
                        : current.pagePerformance,
                imageGeneration:
                    section === "imageGeneration"
                        ? {
                            ...getDefaultAIBloggerImageGenerationConfig(),
                            apiKey: current.imageGeneration.apiKey,
                            fallbackApiKey: current.imageGeneration.fallbackApiKey,
                        }
                        : current.imageGeneration,
                publishRules:
                    section === "publishRules"
                        ? {
                            ...getDefaultAIBloggerPublishRulesConfig(),
                            aiReviewPolicy: {
                                ...getDefaultAIBloggerPublishRulesConfig().aiReviewPolicy,
                                apiKey: current.publishRules.aiReviewPolicy.apiKey,
                            },
                        }
                        : current.publishRules,
                author:
                    section === "author"
                        ? getDefaultAIBloggerAuthorConfig()
                        : current.author,
                entityModeling:
                    section === "entityModeling"
                        ? getDefaultAIBloggerEntityModelingConfig()
                        : current.entityModeling,
            };
        });

        setSuccess(section === "all" ? "AI Blogger settings reset to defaults." : "Section reset to defaults.");
        setError("");
        // Success message will auto-clear after 3 seconds via useEffect
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            await updateAgencyAIBloggerConfigSuperAdmin(agencyId, config);
            const [savedConfig, agencyOverview] = await Promise.all([
                getAgencyAIBloggerConfigSuperAdmin(agencyId),
                getAgencyAIBloggerOverviewSuperAdmin(agencyId),
            ]);
            const mergedSavedConfig = mergeAIBloggerConfig(savedConfig, baseAiConfig);
            setConfigured(true);
            setConfig(mergedSavedConfig);
            setOverview(agencyOverview);
            // Save a clean version for dirty checking without retaining secret values.
            const cleanConfig = getCleanConfigForDirtyCheck(mergedSavedConfig);
            savedConfigJson.current = JSON.stringify(cleanConfig);
            setSuccess("AI Blogger configuration saved.");
            // Success message will auto-clear after 3 seconds via useEffect
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Failed to save AI Blogger configuration.");
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm("Remove the dedicated AI Blogger config for this agency? The generator will fall back to the general agency AI setup.")) {
            return;
        }

        setRemoving(true);
        setError("");
        setSuccess("");

        try {
            await removeAgencyAIBloggerConfigSuperAdmin(agencyId);
            setConfigured(false);
            const freshConfig = mergeAIBloggerConfig(null, baseAiConfig);
            setConfig(freshConfig);
            const cleanConfig = getCleanConfigForDirtyCheck(freshConfig);
            savedConfigJson.current = JSON.stringify(cleanConfig);
            setSuccess("Dedicated AI Blogger config removed.");
            // Success message will auto-clear after 3 seconds via useEffect
        } catch (removeError) {
            setError(removeError instanceof Error ? removeError.message : "Failed to remove AI Blogger configuration.");
        } finally {
            setRemoving(false);
        }
    };

    /* ── Shared props for section components ──────────────────────── */

    const sectionProps = {
        config,
        setConfig,
        visibleKeys,
        toggleKeyVisibility,
    };

    /* ── Loading state ───────────────────────────────────────────── */

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label="Loading agency AI Blogger configuration">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                        <div className="h-5 w-44 rounded-lg bg-muted" />
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-xl bg-muted" />
                            <div className="space-y-2">
                                <div className="h-7 w-56 rounded-lg bg-muted" />
                                <div className="h-4 w-80 max-w-full rounded-lg bg-muted" />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="h-10 w-32 rounded-lg bg-muted" />
                        <div className="h-10 w-36 rounded-lg bg-muted" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="h-28 rounded-xl border border-border/60 bg-card" />
                    <div className="h-28 rounded-xl border border-border/60 bg-card" />
                    <div className="h-28 rounded-xl border border-border/60 bg-card" />
                </div>
                <div className="h-80 rounded-xl border border-border/60 bg-card" />
            </div>
        );
    }

    /* ── Main layout ─────────────────────────────────────────────── */

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                    <Link href="/super-admin/ai-blogger" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to AI Blogger agencies
                    </Link>
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg">
                            <Brain className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-foreground">AI Blogger Admin</h1>
                            <p className="text-sm text-muted-foreground">
                                Configure dedicated blog pipeline keys, models, and prompts for <strong>{agencyName}</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-start gap-3 xl:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                            {agencyPlan.toUpperCase()}
                        </span>
                        {configured ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                <Check className="h-3.5 w-3.5" />
                                Separate config active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Using defaults until saved
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isDirty && !saving ? (
                                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
                                </span>
                            ) : null}
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? "Saving..." : isDirty ? "Save Changes" : "Save All Changes"}
                        </button>

                        {configured && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={removing}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Trash2 className="h-4 w-4" />
                                {removing ? "Removing..." : "Remove Config"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* Section: Refresh Queue */}
            <RefreshQueueSection config={config} overview={overview} />

            {/* Section: Preset Profiles */}
            <PresetProfilesSection activePreset={activePreset} applyPreset={applyPreset} resetSection={resetSection} />

            {/* Section: Review Pipeline Overview */}
            <ReviewPipelineOverview config={config} baseAiConfig={baseAiConfig} />

            {/* Section: Fallback System + Pipeline Snapshot */}
            <PipelineOverviewSection
                {...sectionProps}
                baseAiConfig={baseAiConfig}
                runtimeInheritanceSummary={runtimeInheritanceSummary}
                readinessChecks={readinessChecks}
                readinessIssues={readinessIssues}
            />

            {/* Section: Live Trends */}
            <TrendSettings {...sectionProps} />

            {/* Section: Website Crawl */}
            <CrawlSettings {...sectionProps} />

            {/* Section: SERP Analysis */}
            <SerpSettings {...sectionProps} />

            {/* Section: Grounded Research */}
            <GroundedResearchSettings {...sectionProps} resetSection={resetSection} />

            {/* Section: Search Console + Page Performance + Image Generation */}
            <DataProviderSettings {...sectionProps} resetSection={resetSection} />

            {/* Section: Publish Rules */}
            <PublishRulesEditor {...sectionProps} resetSection={resetSection} />

            {/* Section: Author & Entity Modeling */}
            <AuthorEntityEditor {...sectionProps} resetSection={resetSection} />

            {/* Section: AI Pipeline Stages */}
            <PipelineStagesEditor
                config={config}
                setConfig={setConfig}
                baseAiConfig={baseAiConfig}
                visibleKeys={visibleKeys}
                toggleKeyVisibility={toggleKeyVisibility}
            />

            {/* Footer: Pipeline Config Preview */}
            <ConfigPipelinePreview config={config} baseAiConfig={baseAiConfig} />
        </div>
    );
}
