"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Brain,
    Check,
    CalendarClock,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    FilePenLine,
    Image as ImageIcon,
    KeyRound,
    Globe,
    Link2,
    Loader2,
    Search,
    ShieldCheck,
    Sparkles,
    Tags,
    WandSparkles,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
    createBlogStudioDraft,
} from "@/lib/actions";
import type {
    BlogStudioGenerateDraftResult,
    BlogStudioGenerationStepInsight,
    BlogStudioInputMode,
    BlogStudioSettings,
    BlogStudioTargetType,
} from "@/lib/types";

// Type guard for validating pipeline result
function isBlogStudioGenerateDraftResult(value: unknown): value is BlogStudioGenerateDraftResult {
    if (!value || typeof value !== "object") return false;
    const obj = value as Record<string, unknown>;
    return (
        typeof obj.post === "object" &&
        obj.post !== null &&
        typeof (obj.post as Record<string, unknown>).slug === "string" &&
        typeof obj.diagnostics === "object" &&
        obj.diagnostics !== null
    );
}
import {
    AIBloggerGlassCard,
    AIBloggerGradientButton,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function splitCommaList(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function splitOutlineList(value: string) {
    return value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
}

function getSourcePlaceholder(mode: BlogStudioInputMode) {
    if (mode === "website") return "https://example.com";
    if (mode === "trending") return "e.g. Google core update impact on local SEO";
    return "e.g. ai blogging for agencies, content workflow automation";
}

function getSourceDetailHelpText(mode: BlogStudioInputMode) {
    if (mode === "website") {
        return "AI Blogger will fetch the homepage plus a few key internal pages to understand services, headings, and FAQ signals before it drafts.";
    }

    if (mode === "trending") {
        return "Use a market shift, launch, seasonal event, or timely angle that should shape topic selection.";
    }

    return "Use a keyword cluster, offer theme, or campaign phrase that should anchor the SEO direction.";
}

function getSourceFieldLabel(mode: BlogStudioInputMode) {
    if (mode === "website") return "Website URL";
    if (mode === "trending") return "Trend angle";
    return "Keyword cluster";
}

function getSourceFieldExample(mode: BlogStudioInputMode) {
    if (mode === "website") {
        return "Use the full URL so AI Blogger can map your pages, services, and site language correctly.";
    }

    if (mode === "trending") {
        return "Best for launches, market shifts, algorithm updates, seasonal demand, or breaking industry topics.";
    }

    return "Use 1 clear cluster or topic phrase instead of a long list of disconnected keywords.";
}

function isValidWebsiteUrl(value: string) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

const sourceModeCards: Array<{
    value: BlogStudioInputMode;
    title: string;
    note: string;
    icon: typeof Globe;
    badge?: string;
}> = [
    {
        value: "website",
        title: "Website URL",
        note: "Start from a live website so AI can infer services, offers, and on-site content themes.",
        icon: Globe,
    },
    {
        value: "trending",
        title: "Trending Topic",
        note: "Start from a timely market angle or launch.",
        icon: Sparkles,
        badge: "Popular",
    },
    {
        value: "keywords",
        title: "Custom Keywords",
        note: "Build around ranking intent and an SEO topic cluster.",
        icon: Tags,
    },
];

const publishingTargetCards: Array<{
    value: BlogStudioTargetType;
    title: string;
    note: string;
}> = [
    {
        value: "manual-export",
        title: "Manual Export",
        note: "Keep the draft in your queue for review, copy, and markdown export.",
    },
    {
        value: "webhook",
        title: "Webhook Publishing",
        note: "Send published drafts to the webhook configured in AI Blogger settings.",
    },
];

type PipelineStepState = "pending" | "active" | "completed" | "failed";

type PipelineStepDefinition = {
    key: string;
    label: string;
    icon: typeof Globe;
};

const AI_PIPELINE_STEPS: PipelineStepDefinition[] = [
    {
        key: "website-intelligence",
        label: "Website Intelligence",
        icon: Globe,
    },
    {
        key: "fetch-trends",
        label: "Fetch Trends",
        icon: Globe,
    },
    {
        key: "serp-analysis",
        label: "SERP Analysis",
        icon: Search,
    },
    {
        key: "grounded-research",
        label: "Grounded Research",
        icon: Search,
    },
    {
        key: "deep-research",
        label: "Deep Research",
        icon: Brain,
    },
    {
        key: "keywords",
        label: "Keywords",
        icon: KeyRound,
    },
    {
        key: "seo-analysis",
        label: "SEO Analysis",
        icon: BarChart3,
    },
    {
        key: "brief-pack",
        label: "Brief Pack",
        icon: Brain,
    },
    {
        key: "outline-pack",
        label: "Outline Pack",
        icon: FilePenLine,
    },
    {
        key: "metadata-pack",
        label: "Metadata Pack",
        icon: Tags,
    },
    {
        key: "faq-pack",
        label: "FAQ Pack",
        icon: Search,
    },
    {
        key: "internal-links",
        label: "Internal Links",
        icon: Link2,
    },
    {
        key: "write-blog",
        label: "Write Blog",
        icon: FilePenLine,
    },
    {
        key: "generate-image",
        label: "Generate Image",
        icon: ImageIcon,
    },
];

type PipelineStatus = "idle" | "running" | "success" | "failed";

type PipelineStepsMap = Record<string, PipelineStepState>;
type PipelineStepNotesMap = Record<string, string>;
type PipelineStepLabelsMap = Record<string, string>;

type PipelineLogLevel = "info" | "success" | "warn" | "error" | "output";

type PipelineLogEntry = {
    id: string;
    level: PipelineLogLevel;
    label: string;
    message: string;
    timestamp: string;
};
type AIBloggerTrendPlan = {
    liveTrendsEnabled: boolean;
    fallbackToAi: boolean;
    defaultLocation: string;
};
type AIBloggerSerpPlan = {
    enabled: boolean;
    device: "desktop" | "mobile";
    defaultLocation: string;
};
type AIBloggerCrawlPlan = {
    enabled: boolean;
    maxPages: number;
    refreshWindowHours: number;
};
type AIBloggerGroundedResearchPlan = {
    enabled: boolean;
    trustPreference: "balanced" | "high-only";
    freshnessPreference: "balanced" | "recent-first" | "evergreen-ok";
};
type AIBloggerPagePerformancePlan = {
    enabled: boolean;
    provider: "pagespeed";
    strategy: "mobile" | "desktop" | "both";
    performanceThreshold: number;
    refreshWindowHours: number;
};
type AIBloggerPublishRulesPlan = {
    minimumSeoScore: number;
    requireInternalLinks: boolean;
    requireMetaDescription: boolean;
    requireFaqForInformational: boolean;
    requireCanonicalUrl: boolean;
    requireImageAltText: boolean;
    requireManualApproval: boolean;
    requireSchemaMarkup: boolean;
};

function getInitialPipelineSteps(): PipelineStepsMap {
    return AI_PIPELINE_STEPS.reduce<PipelineStepsMap>((acc, step) => {
        acc[step.key] = "pending";
        return acc;
    }, {});
}

function getStepClasses(state: PipelineStepState) {
    if (state === "active") {
        return {
            card: "border-primary/35 bg-primary/10",
            icon: "border-primary/40 bg-primary/20 text-primary",
            title: "text-primary",
        };
    }

    if (state === "completed") {
        return {
            card: "border-emerald-500/35 bg-emerald-500/10",
            icon: "border-emerald-500/35 bg-emerald-500/20 text-emerald-500",
            title: "text-emerald-500",
        };
    }

    if (state === "failed") {
        return {
            card: "border-destructive/35 bg-destructive/10",
            icon: "border-destructive/35 bg-destructive/20 text-destructive",
            title: "text-destructive",
        };
    }

    return {
        card: "border-border/60 bg-background/55",
        icon: "border-border/60 bg-background/70 text-muted-foreground",
        title: "text-foreground",
    };
}

function getErrorType(message: string): "validation" | "api-limit" | "timeout" | "network" | "unknown" {
    const lower = message.toLowerCase();
    if (lower.includes("quota") || lower.includes("limit") || lower.includes("exceeded")) return "api-limit";
    if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
    if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection")) return "network";
    if (lower.includes("validation") || lower.includes("invalid") || lower.includes("required")) return "validation";
    return "unknown";
}

function getErrorSuggestion(errorType: "validation" | "api-limit" | "timeout" | "network" | "unknown"): string {
    switch (errorType) {
        case "api-limit":
            return "An external API quota was exceeded. Wait a few minutes and try again. Try with a simpler topic or fewer features enabled.";
        case "timeout":
            return "The request took too long. Try with a simpler topic, shorter word count, or disable some research features in AI Blogger settings.";
        case "network":
            return "A network error occurred. Check your connection and try again. This is usually temporary.";
        case "validation":
            return "Check your brief inputs: ensure the source detail is complete and valid.";
        default:
            return "Check the log above for diagnostic details. Try again or contact support if the issue persists.";
    }
}

function getErrorIcon(errorType: "validation" | "api-limit" | "timeout" | "network" | "unknown") {
    switch (errorType) {
        case "api-limit": return "⏱️";
        case "timeout": return "⏳";
        case "network": return "🌐";
        case "validation": return "⚠️";
        default: return "❌";
    }
}

function formatElapsedTime(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function estimateRemainingTime(
    completedSteps: number,
    totalSteps: number,
    elapsedMs: number,
): string {
    if (completedSteps === 0) return "Estimating...";
    const avgTimePerStep = elapsedMs / completedSteps;
    const remainingSteps = totalSteps - completedSteps;
    const estimatedMs = avgTimePerStep * remainingSteps;
    return formatElapsedTime(estimatedMs);
}

function getPlannedFetchTrendsLabel(plan: AIBloggerTrendPlan) {
    return plan.liveTrendsEnabled ? "Live Google Trends" : "AI-only discovery";
}

function getPlannedFetchTrendsNote(
    plan: AIBloggerTrendPlan,
    sourceMode: BlogStudioInputMode,
    trendFocus: string,
) {
    const location = plan.defaultLocation.toUpperCase();
    const normalizedTrendFocus = trendFocus.trim();

    if (plan.liveTrendsEnabled) {
        const modeText =
            sourceMode === "trending"
                ? `Pulling live trending topics for ${location}.`
                : normalizedTrendFocus && sourceMode === "website"
                    ? `Scoring website topic hints plus the trend angle "${normalizedTrendFocus}" with live Google Trends for ${location}.`
                    : `Scoring candidate topics with live Google Trends for ${location}.`;

        return plan.fallbackToAi
            ? `${modeText} AI fallback is ready if the live provider fails.`
            : modeText;
    }

    return "Live trends is off for this workspace, so AI-only discovery will choose the topic angle.";
}

function getPlannedSerpAnalysisNote(plan: AIBloggerSerpPlan) {
    if (plan.enabled) {
        return `The pipeline will snapshot Google results for ${plan.defaultLocation.toUpperCase()} on ${plan.device} to capture search intent, competitors, and People Also Ask patterns.`;
    }

    return "SERP analysis is skipped unless it is enabled in AI Blogger admin.";
}

function getPlannedGroundedResearchNote(
    serpPlan: AIBloggerSerpPlan,
    groundedResearchPlan: AIBloggerGroundedResearchPlan,
) {
    if (!serpPlan.enabled) {
        return "Grounded research depends on SERP source pages, so it is skipped when SERP analysis is off.";
    }

    if (!groundedResearchPlan.enabled) {
        return "Grounded research is turned off in AI Blogger admin, so AI will rely on prompt context and SERP patterns only.";
    }

    return "The pipeline will fetch a small trusted source pack from the ranking pages so research and writing stay grounded in real external evidence.";
}

function getStrategySourceSummary(sourceMode: BlogStudioInputMode, sourceValue: string, trendFocus: string) {
    if (sourceMode === "website") {
        const sourceSummary = sourceValue.trim()
            ? `Website crawl + content inference from ${sourceValue.trim()}`
            : "Website crawl + content inference from the submitted URL";

        if (trendFocus.trim()) {
            return `${sourceSummary} + trend angle around ${trendFocus.trim()}`;
        }

        return sourceSummary;
    }

    if (sourceMode === "trending") {
        return sourceValue.trim()
            ? `Trend-led topic discovery around ${sourceValue.trim()}`
            : "Trend-led topic discovery from the submitted market angle";
    }

    return sourceValue.trim()
        ? `Keyword-led planning around ${sourceValue.trim()}`
        : "Keyword-led planning from the submitted cluster";
}

function getStrategyResearchStack(
    sourceMode: BlogStudioInputMode,
    trendPlan: AIBloggerTrendPlan,
    serpPlan: AIBloggerSerpPlan,
    groundedResearchPlan: AIBloggerGroundedResearchPlan,
) {
    return [
        sourceMode === "website" ? "Website intelligence" : null,
        trendPlan.liveTrendsEnabled ? "Live trends" : "AI topic discovery",
        serpPlan.enabled ? `SERP analysis (${serpPlan.device})` : null,
        serpPlan.enabled && groundedResearchPlan.enabled
            ? `Grounded research (${groundedResearchPlan.trustPreference === "high-only" ? "high trust" : "balanced"})`
            : null,
        "Brief pack",
        "Outline pack",
        "Metadata pack",
        "FAQ pack",
        "Internal links",
    ].filter(Boolean) as string[];
}

function getStrategySeoSummary(
    settings: BlogStudioSettings,
    publishRulesPlan: AIBloggerPublishRulesPlan,
) {
    const requirements = [
        publishRulesPlan.requireMetaDescription ? "meta description" : null,
        publishRulesPlan.requireInternalLinks ? "internal links" : null,
        publishRulesPlan.requireFaqForInformational ? "FAQ for informational intent" : null,
        publishRulesPlan.requireCanonicalUrl ? "canonical URL" : null,
        publishRulesPlan.requireImageAltText ? "image alt text" : null,
        publishRulesPlan.requireSchemaMarkup ? "schema" : null,
    ].filter(Boolean);

    return `${settings.seo.minWords}-${settings.seo.maxWords} words • minimum SEO ${publishRulesPlan.minimumSeoScore} • ${requirements.join(", ") || "light SEO requirements"}`;
}

function buildPipelineStepNotes(steps: BlogStudioGenerationStepInsight[]): PipelineStepNotesMap {
    return steps.reduce<PipelineStepNotesMap>((acc, step) => {
        if (step.notes?.trim()) {
            acc[step.key] = step.notes.trim();
        }
        return acc;
    }, {});
}

export function AIBloggerDraftBuilder({
    settings,
    trendPlan,
    serpPlan,
    crawlPlan,
    groundedResearchPlan,
    pagePerformancePlan,
    publishRulesPlan,
}: {
    settings: BlogStudioSettings;
    trendPlan: AIBloggerTrendPlan;
    serpPlan: AIBloggerSerpPlan;
    crawlPlan: AIBloggerCrawlPlan;
    groundedResearchPlan: AIBloggerGroundedResearchPlan;
    pagePerformancePlan: AIBloggerPagePerformancePlan;
    publishRulesPlan: AIBloggerPublishRulesPlan;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [formMode, setFormMode] = useState<"ai" | "manual">("ai");
    const [actionMode, setActionMode] = useState<"manual" | "ai">("ai");
    const [showEditorialDefaults, setShowEditorialDefaults] = useState(false);
    const [showPipelinePlan, setShowPipelinePlan] = useState(false);

    const [title, setTitle] = useState("");
    const [sourceMode, setSourceMode] = useState<BlogStudioInputMode>("website");
    const [sourceValue, setSourceValue] = useState("");
    const [trendFocus, setTrendFocus] = useState("");
    const [primaryKeyword, setPrimaryKeyword] = useState("");
    const [audience, setAudience] = useState(settings.brandVoice.audience);
    const [tone, setTone] = useState(settings.brandVoice.tone);
    const [cta, setCta] = useState(settings.brandVoice.ctaStyle);
    const [targetType, setTargetType] = useState<BlogStudioTargetType>(settings.publishing.defaultTarget.type);
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [outlineText, setOutlineText] = useState("");
    const [wordCount, setWordCount] = useState(String(settings.seo.minWords));
    const [pipelineVisible, setPipelineVisible] = useState(false);
    const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
    const [pipelineSteps, setPipelineSteps] = useState<PipelineStepsMap>(() => getInitialPipelineSteps());
    const [pipelineLogs, setPipelineLogs] = useState<PipelineLogEntry[]>([]);
    const [pipelineStepNotes, setPipelineStepNotes] = useState<PipelineStepNotesMap>({});
    const [pipelineStepLabels, setPipelineStepLabels] = useState<PipelineStepLabelsMap>({});
    const [pipelineCompletionMessage, setPipelineCompletionMessage] = useState("");
    const [postSlugToNavigate, setPostSlugToNavigate] = useState<string | null>(null);
    const [pipelineStartTime, setPipelineStartTime] = useState<number | null>(null);
    const [pipelineElapsedTime, setPipelineElapsedTime] = useState(0);
    const [failedStepKey, setFailedStepKey] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<"validation" | "api-limit" | "timeout" | "network" | "unknown" | null>(null);
    const [canRetry, setCanRetry] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const activeJobIdRef = useRef<string | null>(null);
    const connectionNonceRef = useRef<number>(0);
    const streamReconnectNoticeRef = useRef(false);
    const logScrollRef = useRef<HTMLDivElement | null>(null);
    const elapsedTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const STORAGE_KEY = "ai-blogger-active-job";

    const pushPipelineLog = useCallback(
        (label: string, message: string, level: PipelineLogLevel = "info") => {
            const entry: PipelineLogEntry = {
                id: `${Date.now()}-${Math.random()}`,
                level,
                label,
                message,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            };
            setPipelineLogs((current) => [...current, entry]);
        },
        [],
    );

    // Auto-scroll the log container to the bottom whenever new entries arrive.
    useEffect(() => {
        if (logScrollRef.current) {
            logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
        }
    }, [pipelineLogs]);

    /** Close any open EventSource. */
    const closeEventSource = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    const handlePipelineEvent = useCallback(
        (data: {
            type: string;
            step?: string;
            label?: string;
            notes?: string;
            message?: string;
            result?: BlogStudioGenerateDraftResult;
        }) => {
            try {
                if (data.type === "connected") {
                    if (streamReconnectNoticeRef.current) {
                        streamReconnectNoticeRef.current = false;
                        pushPipelineLog("Pipeline", "Live connection restored.", "success");
                    }
                    return;
                }

                if (data.type === "step-start" && data.step) {
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "active",
                    }));
                    pushPipelineLog(data.label || data.step, "Running…", "info");
                    return;
                }

                if (data.type === "step-complete" && data.step) {
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "completed",
                    }));
                    if (data.notes) {
                        setPipelineStepNotes((current) => ({
                            ...current,
                            [data.step!]: data.notes!,
                        }));
                    }
                    if (data.label) {
                        setPipelineStepLabels((current) => ({
                            ...current,
                            [data.step!]: data.label!,
                        }));
                    }
                    pushPipelineLog(
                        data.label || data.step,
                        data.notes || "Completed.",
                        "output",
                    );
                    return;
                }

                if (data.type === "step-fail" && data.step) {
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "failed",
                    }));
                    if (data.notes) {
                        setPipelineStepNotes((current) => ({
                            ...current,
                            [data.step!]: data.notes!,
                        }));
                    }
                    pushPipelineLog(
                        data.label || data.step,
                        data.notes || "Failed.",
                        "error",
                    );
                    // Store failed step for potential retry
                    setFailedStepKey(data.step);
                    return;
                }

                if (data.type === "step-skip" && data.step) {
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "completed",
                    }));
                    if (data.notes) {
                        setPipelineStepNotes((current) => ({
                            ...current,
                            [data.step!]: data.notes!,
                        }));
                    }
                    pushPipelineLog(
                        data.label || data.step,
                        data.notes || "Skipped.",
                        "warn",
                    );
                    return;
                }

                if (data.type === "log" && data.message) {
                    pushPipelineLog("Pipeline", data.message, "info");
                    return;
                }

                if (data.type === "complete") {
                    closeEventSource();
                    activeJobIdRef.current = null;
                    streamReconnectNoticeRef.current = false;
                    try { localStorage.removeItem(STORAGE_KEY); } catch {}

                    // Stop elapsed time tracking
                    if (elapsedTimeIntervalRef.current) {
                        clearInterval(elapsedTimeIntervalRef.current);
                        elapsedTimeIntervalRef.current = null;
                    }

                    // Validate result type before using it
                    const result = isBlogStudioGenerateDraftResult(data.result) ? data.result : null;
                    if (result) {
                        setPipelineStatus("success");
                        setPipelineSteps(() =>
                            AI_PIPELINE_STEPS.reduce<PipelineStepsMap>((acc, step) => {
                                acc[step.key] = "completed";
                                return acc;
                            }, {}),
                        );
                        setPipelineStepLabels((current) => ({
                            ...current,
                            "fetch-trends": result.diagnostics.fetchTrendsLabel,
                        }));
                        setPipelineStepNotes(buildPipelineStepNotes(result.diagnostics.steps));
                        setPipelineCompletionMessage("All steps completed. Opening the draft...");
                        pushPipelineLog("Fetch Trends", `Source: ${result.diagnostics.fetchTrendsLabel} — ${result.diagnostics.fetchTrendsNotes}`, "output");
                        if (typeof result.diagnostics.businessFitScore === "number") {
                            pushPipelineLog("Business Fit", `Score: ${result.diagnostics.businessFitScore}/100${result.diagnostics.businessFitSummary ? ` — ${result.diagnostics.businessFitSummary}` : ""}`, "success");
                        }
                        result.diagnostics.businessFitWarnings.forEach((w) =>
                            pushPipelineLog("Business Fit", `⚠ ${w}`, "warn"),
                        );
                        pushPipelineLog("Pipeline", "Draft generated and sent to the queue.", "success");
                        toast.success("AI Blogger draft generated");

                        // Set slug to navigate to - will be handled in useEffect with cleanup
                        setPostSlugToNavigate(result.post.slug);
                    } else {
                        setPipelineStatus("success");
                        setPipelineCompletionMessage("Pipeline complete.");
                    }
                    return;
                }

                if (data.type === "error") {
                    closeEventSource();
                    activeJobIdRef.current = null;
                    streamReconnectNoticeRef.current = false;
                    try { localStorage.removeItem(STORAGE_KEY); } catch {}

                    // Stop elapsed time tracking
                    if (elapsedTimeIntervalRef.current) {
                        clearInterval(elapsedTimeIntervalRef.current);
                        elapsedTimeIntervalRef.current = null;
                    }

                    const message = data.message || "Unknown error";
                    const errType = getErrorType(message);
                    setErrorType(errType);

                    // Check if error is transient and can be retried
                    const isTransient = errType === "api-limit" || errType === "timeout" || errType === "network";
                    setCanRetry(isTransient);

                    const activeStep = AI_PIPELINE_STEPS.find((s) => pipelineSteps[s.key] === "active");
                    const stepLabel = activeStep?.label || "Unknown Step";

                    const suggestion = getErrorSuggestion(errType);
                    const icon = getErrorIcon(errType);
                    const errorSummary = `${icon} ${errType.charAt(0).toUpperCase() + errType.slice(1).replace(/-/g, " ")}`;

                    setPipelineStatus("failed");
                    setFailedStepKey(activeStep?.key || null);
                    setPipelineSteps((current) => {
                        const next = { ...current };
                        if (activeStep) {
                            next[activeStep.key] = "failed";
                        }
                        return next;
                    });
                    pushPipelineLog("Pipeline Error", `${stepLabel}: ${message}`, "error");
                    pushPipelineLog("Suggestion", suggestion, "warn");
                    setError(`${errorSummary}: ${message}`);
                    toast.error(`Generation failed at ${stepLabel}`);
                    return;
                }
            } catch (eventHandlingError) {
                console.error("[AI-BLOGGER] [DRAFT-BUILDER] Error handling pipeline event:", eventHandlingError);
                setError("An error occurred while processing the pipeline. Please check the browser console.");
                setPipelineStatus("failed");
            }
        },
        [closeEventSource, pushPipelineLog, pipelineSteps],
    );

    /** Connect (or reconnect) an SSE stream for a given jobId. */
    const connectSSE = useCallback(
        (jobId: string) => {
            closeEventSource();

            // Increment the nonce so stale error/close callbacks from old
            // connections can detect they are no longer the active one.
            const nonce = connectionNonceRef.current + 1;
            connectionNonceRef.current = nonce;

            // Safely encode the jobId parameter
            const params = new URLSearchParams();
            params.set("jobId", jobId);
            const es = new EventSource(`/api/ai-blogger/generate/stream?${params.toString()}`);
            eventSourceRef.current = es;
            activeJobIdRef.current = jobId;

            es.onmessage = (event) => {
                // Ignore events from stale connections.
                if (connectionNonceRef.current !== nonce) return;
                try {
                    const data = JSON.parse(event.data);
                    handlePipelineEvent(data);
                } catch (parseError) {
                    // Log parse errors for debugging but continue processing other events
                    if (process.env.NODE_ENV === "development") {
                        console.warn("[AI-BLOGGER] [SSE] JSON parse error:", parseError, "Raw data:", event.data);
                    }
                }
            };

            es.onerror = () => {
                // Only react if this is still the active connection.
                if (connectionNonceRef.current !== nonce) return;
                if (pipelineStatus === "running" && !streamReconnectNoticeRef.current) {
                    streamReconnectNoticeRef.current = true;
                    pushPipelineLog(
                        "Pipeline",
                        "Connection interrupted. Waiting for the live stream to reconnect...",
                        "warn",
                    );
                }
            };
        },
        [closeEventSource, handlePipelineEvent, pipelineStatus, pushPipelineLog],
    );

    /** Reset the pipeline UI to idle state. */
    const resetPipeline = useCallback(() => {
        closeEventSource();
        activeJobIdRef.current = null;
        connectionNonceRef.current += 1;
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        if (elapsedTimeIntervalRef.current) {
            clearInterval(elapsedTimeIntervalRef.current);
            elapsedTimeIntervalRef.current = null;
        }
        setPipelineVisible(false);
        setPipelineStatus("idle");
        setPipelineSteps(getInitialPipelineSteps());
        setPipelineLogs([]);
        setPipelineStepNotes({});
        setPipelineStepLabels({});
        setPipelineCompletionMessage("");
        setPipelineStartTime(null);
        setPipelineElapsedTime(0);
        setFailedStepKey(null);
        setErrorType(null);
        setCanRetry(false);
        setError("");
        streamReconnectNoticeRef.current = false;
    }, [closeEventSource]);

    // Navigate to generated draft with cleanup on unmount
    useEffect(() => {
        if (!postSlugToNavigate) return;

        const navigationTimeout = setTimeout(() => {
            void (async () => {
                try {
                    await router.push(`/dashboard/ai-blogger/posts/${postSlugToNavigate}`);
                    router.refresh();
                } catch (navError) {
                    console.error("[AI-BLOGGER] [DRAFT-BUILDER] Navigation error:", navError);
                }
            })();
        }, 900);

        return () => {
            clearTimeout(navigationTimeout);
        };
    }, [postSlugToNavigate, router]);

    // Cleanup elapsed time interval on unmount
    useEffect(() => {
        return () => {
            if (elapsedTimeIntervalRef.current) {
                clearInterval(elapsedTimeIntervalRef.current);
                elapsedTimeIntervalRef.current = null;
            }
        };
    }, []);

    // On mount: check localStorage for an active job and reconnect
    // ONLY if the job was started within the last 30 minutes (max generation window).
    // This prevents stale job IDs from auto-triggering the pipeline on every page visit.
    useEffect(() => {
        const MAX_JOB_AGE_MS = 30 * 60 * 1000; // 30 minutes
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                let jobId: string | null = null;
                let ts: number = 0;

                try {
                    const parsed = JSON.parse(stored) as { jobId?: string; ts?: number };
                    jobId = parsed.jobId ?? null;
                    ts = parsed.ts ?? 0;
                } catch {
                    // Legacy plain string format — treat it as expired and clear it.
                    localStorage.removeItem(STORAGE_KEY);
                }

                if (jobId && ts && Date.now() - ts < MAX_JOB_AGE_MS) {
                    // Job is recent enough - reconnect to the live stream.
                    reconnectTimeout = setTimeout(() => {
                        setPipelineVisible(true);
                        setPipelineStatus("running");
                        setPipelineSteps(getInitialPipelineSteps());
                        setPipelineStartTime(ts);
                        setPipelineElapsedTime(Math.max(0, Date.now() - ts));
                        if (elapsedTimeIntervalRef.current) {
                            clearInterval(elapsedTimeIntervalRef.current);
                        }
                        elapsedTimeIntervalRef.current = setInterval(() => {
                            setPipelineElapsedTime(Math.max(0, Date.now() - ts));
                        }, 1000);
                        setPipelineLogs([{ id: "reconnect", level: "info", label: "Pipeline", message: "Reconnecting to active pipeline...", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
                        connectSSE(jobId);
                    }, 0);
                } else if (jobId) {
                    // Job is too old — clear the stale entry silently.
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch {
            // localStorage unavailable — ignore.
        }

        return () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            closeEventSource();
        };
    }, [closeEventSource, connectSSE]);

    const sourceDetailHelpText = useMemo(() => getSourceDetailHelpText(sourceMode), [sourceMode]);
    const sourceFieldLabel = useMemo(() => getSourceFieldLabel(sourceMode), [sourceMode]);
    const sourceFieldExample = useMemo(() => getSourceFieldExample(sourceMode), [sourceMode]);
    const targetLabel = useMemo(() => {
        if (targetType === settings.publishing.defaultTarget.type) {
            return settings.publishing.defaultTarget.label;
        }

        return targetType === "webhook" ? "Webhook Publishing" : "Manual Export Queue";
    }, [settings.publishing.defaultTarget.label, settings.publishing.defaultTarget.type, targetType]);
    const workspaceWebhookReady = useMemo(() => {
        const defaultTarget = settings.publishing.defaultTarget;
        const config = defaultTarget.webhookConfig;
        return Boolean(
            defaultTarget.type === "webhook" &&
            config?.active &&
            config?.url?.trim() &&
            (config?.secretMasked || config?.hasSecret),
        );
    }, [settings.publishing.defaultTarget]);
    const strategySourceSummary = useMemo(
        () => getStrategySourceSummary(sourceMode, sourceValue, trendFocus),
        [sourceMode, sourceValue, trendFocus],
    );
    const strategyResearchStack = useMemo(
        () => getStrategyResearchStack(sourceMode, trendPlan, serpPlan, groundedResearchPlan),
        [groundedResearchPlan, serpPlan, sourceMode, trendPlan],
    );
    const strategySeoSummary = useMemo(
        () => getStrategySeoSummary(settings, publishRulesPlan),
        [publishRulesPlan, settings],
    );
    const plannedFetchTrendsLabel = useMemo(() => getPlannedFetchTrendsLabel(trendPlan), [trendPlan]);
    const plannedFetchTrendsNote = useMemo(
        () => getPlannedFetchTrendsNote(trendPlan, sourceMode, trendFocus),
        [sourceMode, trendFocus, trendPlan],
    );
    const plannedSerpAnalysisNote = useMemo(() => getPlannedSerpAnalysisNote(serpPlan), [serpPlan]);
    const plannedGroundedResearchNote = useMemo(
        () => getPlannedGroundedResearchNote(serpPlan, groundedResearchPlan),
        [groundedResearchPlan, serpPlan],
    );
    const targetPublishSummary = useMemo(() => {
        if (publishRulesPlan.requireManualApproval) {
            return targetType === "webhook"
                ? "Approval required before scheduling automated publishing"
                : "Approval required before manual export handoff";
        }

        return targetType === "webhook"
            ? "Can move directly through the publishing workflow"
            : "Can move directly into the manual export queue";
    }, [publishRulesPlan.requireManualApproval, targetType]);
    const activeGenerationFeatures = useMemo(
        () => [
            {
                key: "crawl",
                title: "Website Intelligence",
                note: crawlPlan.enabled
                    ? `Crawls up to ${crawlPlan.maxPages} pages, follows internal links plus sitemap hints, and reuses snapshots for ${crawlPlan.refreshWindowHours}h.`
                    : "Website crawling is disabled, so website mode falls back to the submitted URL only.",
                icon: Globe,
                active: crawlPlan.enabled,
            },
            {
                key: "trends",
                title: plannedFetchTrendsLabel,
                note: plannedFetchTrendsNote,
                icon: Sparkles,
                active: true,
            },
            {
                key: "serp",
                title: "SERP Analysis",
                note: plannedSerpAnalysisNote,
                icon: Search,
                active: serpPlan.enabled,
            },
            {
                key: "grounded-research",
                title: "Grounded Research",
                note: plannedGroundedResearchNote,
                icon: Brain,
                active: serpPlan.enabled && groundedResearchPlan.enabled,
            },
            {
                key: "publish-rules",
                title: publishRulesPlan.requireManualApproval ? "Approval Gate" : "Direct Workflow",
                note: targetPublishSummary,
                icon: ShieldCheck,
                active: true,
            },
            {
                key: "page-performance",
                title: "Page Performance Config",
                note: pagePerformancePlan.enabled
                    ? `Saved as ${pagePerformancePlan.provider} (${pagePerformancePlan.strategy}) with a ${pagePerformancePlan.performanceThreshold} threshold and ${pagePerformancePlan.refreshWindowHours}h refresh window, but it does not change generation or audit scoring yet.`
                    : "No page-speed-aware checks are active in the live workflow yet.",
                icon: BarChart3,
                active: pagePerformancePlan.enabled,
            },
        ],
        [
            crawlPlan.enabled,
            crawlPlan.maxPages,
            crawlPlan.refreshWindowHours,
            pagePerformancePlan.enabled,
            pagePerformancePlan.performanceThreshold,
            pagePerformancePlan.provider,
            pagePerformancePlan.refreshWindowHours,
            pagePerformancePlan.strategy,
            groundedResearchPlan.enabled,
            plannedFetchTrendsLabel,
            plannedFetchTrendsNote,
            plannedGroundedResearchNote,
            plannedSerpAnalysisNote,
            publishRulesPlan.requireManualApproval,
            serpPlan.enabled,
            targetPublishSummary,
        ],
    );
    const strategySettingBadges = useMemo(
        () => [
            `Audience: ${audience}`,
            `Tone: ${tone}`,
            `CTA: ${cta}`,
            `Target: ${targetLabel}`,
        ],
        [audience, cta, targetLabel, tone],
    );
    const targetConfigurationNote = useMemo(() => {
        if (targetType === "manual-export") {
            return "Manual Export keeps the draft in the editorial queue for review, copy, and markdown export.";
        }

        return workspaceWebhookReady
            ? `Webhook publishing is ready through "${settings.publishing.defaultTarget.label}". Published drafts will use that saved endpoint.`
            : "Webhook publishing is selected, but the workspace webhook is not fully configured yet. You can still create the draft now, but publishing will stay blocked until the URL, secret, and active toggle are set in Settings.";
    }, [settings.publishing.defaultTarget.label, targetType, workspaceWebhookReady]);
    const selectedWordTarget = useMemo(() => {
        const parsed = Number.parseInt(wordCount, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }

        return settings.seo.minWords;
    }, [settings.seo.minWords, wordCount]);

    const submitDraft = async (mode: "manual" | "ai") => {
        if (mode === "manual" && !title.trim()) {
            setError("Add a blog title before continuing.");
            return;
        }

        if (!sourceValue.trim()) {
            setError(`Add the ${sourceFieldLabel.toLowerCase()} before creating or generating a draft.`);
            return;
        }

        if (sourceMode === "website" && !isValidWebsiteUrl(sourceValue.trim())) {
            setError("Enter a full website URL starting with http:// or https://.");
            return;
        }

        const normalizedWordCount = Number.parseInt(wordCount, 10);
        if (!Number.isFinite(normalizedWordCount)) {
            setError(`Enter a word target between ${settings.seo.minWords} and ${settings.seo.maxWords}.`);
            return;
        }

        if (normalizedWordCount < settings.seo.minWords || normalizedWordCount > settings.seo.maxWords) {
            setError(`Word target must stay between ${settings.seo.minWords} and ${settings.seo.maxWords} words.`);
            return;
        }

        setError("");
        setActionMode(mode);

        if (mode === "ai") {
            // --- SSE-based AI generation ---
            setPipelineVisible(true);
            setPipelineStatus("running");
            setPipelineSteps(getInitialPipelineSteps());
            setPipelineLogs([{ id: "start", level: "info", label: "Pipeline", message: "Generation started.", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
            setPipelineStepNotes({});
            setPipelineStepLabels({});
            setPipelineCompletionMessage("");
            const startTs = Date.now();
            setPipelineStartTime(startTs);
            setPipelineElapsedTime(0);
            setFailedStepKey(null);
            setErrorType(null);
            setCanRetry(false);
            streamReconnectNoticeRef.current = false;

            // Start elapsed time tracking
            if (elapsedTimeIntervalRef.current) {
                clearInterval(elapsedTimeIntervalRef.current);
            }
            elapsedTimeIntervalRef.current = setInterval(() => {
                setPipelineElapsedTime(Math.max(0, Date.now() - startTs));
            }, 1000);

            const brief = {
                sourceMode,
                sourceValue: sourceValue.trim(),
                trendFocus,
                audience,
                tone,
                cta,
                primaryKeyword,
                language: settings.seo.defaultLanguage,
                location: settings.seo.defaultLocation,
            };
            const target = {
                type: targetType,
                label: targetLabel,
            };
            const wordTarget = Number.isFinite(normalizedWordCount) ? normalizedWordCount : undefined;

            try {
                const res = await fetch("/api/ai-blogger/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, brief, target, wordCount: wordTarget }),
                });
                const json = await res.json();

                if (!res.ok || !json.ok) {
                    const msg = json.error || "Failed to start generation.";
                    setError(msg);
                    setPipelineStatus("failed");
                    pushPipelineLog("Pipeline", `Failed to start: ${msg}`, "error");
                    toast.error(msg);
                    if (elapsedTimeIntervalRef.current) {
                        clearInterval(elapsedTimeIntervalRef.current);
                        elapsedTimeIntervalRef.current = null;
                    }
                    return;
                }

                const jobId = json.jobId as string;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId, ts: startTs })); } catch {}
                connectSSE(jobId);
            } catch (fetchError) {
                const msg = fetchError instanceof Error ? fetchError.message : "Network error";
                setError(msg);
                setPipelineStatus("failed");
                pushPipelineLog("Pipeline", `Failed to start: ${msg}`, "error");
                toast.error(msg);
                if (elapsedTimeIntervalRef.current) {
                    clearInterval(elapsedTimeIntervalRef.current);
                    elapsedTimeIntervalRef.current = null;
                }
            }
            return;
        }

        // --- Manual draft (unchanged) ---
        resetPipeline();

        startTransition(async () => {
            try {
                const brief = {
                    sourceMode,
                    sourceValue: sourceValue.trim(),
                    trendFocus,
                    audience,
                    tone,
                    cta,
                    primaryKeyword,
                    language: settings.seo.defaultLanguage,
                    location: settings.seo.defaultLocation,
                };
                const target = {
                    type: targetType,
                    label: targetLabel,
                };
                const wordTarget = Number.isFinite(normalizedWordCount) ? normalizedWordCount : undefined;

                const created = await createBlogStudioDraft({
                    title,
                    excerpt,
                    content,
                    tags: splitCommaList(tagsText),
                    outline: splitOutlineList(outlineText),
                    wordCount: wordTarget,
                    target,
                    brief,
                });
                toast.success("AI Blogger draft created");
                router.push(`/dashboard/ai-blogger/posts/${created.slug}`);
                router.refresh();
            } catch (submitError: unknown) {
                const message = submitError instanceof Error ? submitError.message : "Draft creation failed.";
                console.error("[AI-BLOGGER] [GENERATE-UI] Raw error:", message);
                setError(message);
                toast.error(message);
            }
        });
    };


    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        submitDraft("manual");
    };

    return (
        <div className="w-full space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <AIBloggerGlassCard className="p-4 sm:p-5 xl:p-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Generate a new blog draft
                            </h2>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Build the brief, set the target, and create the draft from one place.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">Draft mode</Label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormMode("ai")}
                                    disabled={pipelineStatus === "running"}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all",
                                        pipelineStatus === "running" && "opacity-50 cursor-not-allowed",
                                        formMode === "ai" && pipelineStatus !== "running"
                                            ? "border-primary/35 bg-primary/12 text-primary"
                                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                                    ].join(" ")}
                                    title={pipelineStatus === "running" ? "Cannot change mode during generation" : ""}
                                >
                                    <WandSparkles className="h-4 w-4" />
                                    AI Draft
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormMode("manual")}
                                    disabled={pipelineStatus === "running"}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all",
                                        pipelineStatus === "running" && "opacity-50 cursor-not-allowed",
                                        formMode === "manual" && pipelineStatus !== "running"
                                            ? "border-primary/35 bg-primary/12 text-primary"
                                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                                    ].join(" ")}
                                    title={pipelineStatus === "running" ? "Cannot change mode during generation" : ""}
                                >
                                    <FilePenLine className="h-4 w-4" />
                                    Manual Draft
                                </button>
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">
                                {formMode === "ai"
                                    ? "AI will generate the first draft from your brief using the word target you choose below."
                                    : "Manual mode lets you write the first version yourself, while still keeping source context for SEO, internal links, and refresh workflows."}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-title">
                                    {formMode === "ai" ? "Working title" : "Blog title"}
                                    {formMode === "ai" ? (
                                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                            (optional — AI generates from research)
                                        </span>
                                    ) : null}
                                </Label>
                                <Input
                                    id="ai-blogger-title"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder={formMode === "ai"
                                        ? "Leave empty for AI to decide, or add a direction hint"
                                        : "e.g. How agencies can use AI blogging without losing brand voice"}
                                    className="h-11 rounded-2xl border-border/60 bg-background/60 text-base"
                                    required={formMode === "manual"}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Choose input method</Label>
                                <div className="grid gap-3 xl:grid-cols-3">
                                    {sourceModeCards.map((mode) => (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            onClick={() => setSourceMode(mode.value)}
                                            className={[
                                                "relative rounded-[18px] border p-3.5 text-left transition-all duration-300",
                                                sourceMode === mode.value
                                                    ? "border-primary/35 bg-primary/10 shadow-[0_16px_36px_rgba(212,160,10,0.14)] ring-2 ring-primary/20"
                                                    : "border-border/60 bg-background/45 hover:border-primary/20 hover:bg-background/70",
                                            ].join(" ")}
                                        >
                                            {sourceMode === mode.value && (
                                                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-black">
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                            {mode.badge ? (
                                                <Badge
                                                    className="absolute right-4 top-4 rounded-full bg-primary text-black hover:bg-primary"
                                                    title={mode.badge === "Popular" ? "Recommended for quick results and market angles" : ""}
                                                >
                                                    {mode.badge}
                                                </Badge>
                                            ) : null}
                                            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-amber-200/10 text-primary">
                                                <mode.icon className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-semibold">{mode.title}</p>
                                                <p className="text-sm leading-5 text-muted-foreground">{mode.note}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-3">
                            <div className="space-y-2 xl:col-span-2">
                                <Label htmlFor="ai-blogger-source-value">{sourceFieldLabel}</Label>
                                <Input
                                    id="ai-blogger-source-value"
                                    type={sourceMode === "website" ? "url" : "text"}
                                    value={sourceValue}
                                    onChange={(event) => setSourceValue(event.target.value)}
                                    placeholder={getSourcePlaceholder(sourceMode)}
                                    className="h-11 rounded-2xl border-border/60 bg-background/60"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {sourceDetailHelpText}
                                </p>
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {sourceFieldExample}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-primary-keyword">Primary keyword</Label>
                                <Input
                                    id="ai-blogger-primary-keyword"
                                    value={primaryKeyword}
                                    onChange={(event) => setPrimaryKeyword(event.target.value)}
                                    placeholder="Highly recommended for SEO"
                                    className="h-11 rounded-2xl border-border/60 bg-background/60"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Optional, but strongly recommended if you want AI Blogger to anchor the draft around one ranking target.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-word-count">Word target</Label>
                                <Input
                                    id="ai-blogger-word-count"
                                    type="number"
                                    min={settings.seo.minWords}
                                    max={settings.seo.maxWords}
                                    value={wordCount}
                                    onChange={(event) => setWordCount(event.target.value)}
                                    className="h-11 rounded-2xl border-border/60 bg-background/60"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Choose a target between {settings.seo.minWords} and {settings.seo.maxWords} words.
                                </p>
                            </div>
                        </div>

                        {sourceMode === "website" ? (
                            <div className="rounded-[22px] border border-border/60 bg-background/45 p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="ai-blogger-trend-focus">Trend angle for this website</Label>
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            Add a timely angle like AI search, seasonal demand, a product launch, or an industry shift. AI Blogger will keep the website context, then use this angle during topic discovery and live Google Trends scoring.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">Live trend blend</p>
                                            <p className="text-xs text-muted-foreground">
                                                {trendPlan.liveTrendsEnabled
                                                    ? "Website topics and your trend angle both feed the trends stage."
                                                    : "Live trends is off in admin, so this field still guides AI discovery only."}
                                            </p>
                                        </div>
                                        <Switch checked={trendPlan.liveTrendsEnabled} disabled />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <Input
                                        id="ai-blogger-trend-focus"
                                        value={trendFocus}
                                        onChange={(event) => setTrendFocus(event.target.value)}
                                        placeholder="Optional, e.g. AI search, holiday demand, Google core update"
                                        className="h-11 rounded-2xl border-border/60 bg-background/60"
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Publishing target</Label>

                                <div className="grid gap-3 xl:grid-cols-2">
                                    {publishingTargetCards.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setTargetType(option.value)}
                                            className={[
                                                "rounded-[18px] border p-3.5 text-left transition-all duration-300",
                                                targetType === option.value
                                                    ? "border-primary/35 bg-primary/10 shadow-[0_16px_36px_rgba(212,160,10,0.14)]"
                                                    : "border-border/60 bg-background/45 hover:border-primary/20 hover:bg-background/70",
                                            ].join(" ")}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-semibold">{option.title}</p>
                                                    {targetType === option.value ? (
                                                        <Badge className="rounded-full bg-primary text-black hover:bg-primary">
                                                            Selected
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm leading-6 text-muted-foreground">
                                                    {option.note}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div
                                className={[
                                    "rounded-[22px] border px-4 py-3 text-sm leading-6",
                                    targetType === "webhook" && !workspaceWebhookReady
                                        ? "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                                        : "border-border/60 bg-background/45 text-muted-foreground",
                                ].join(" ")}
                            >
                                {targetConfigurationNote}
                            </div>

                            <div className="rounded-[24px] border border-border/60 bg-background/40 px-4 py-3.5 sm:px-5">
                                <button
                                    type="button"
                                    onClick={() => setShowEditorialDefaults((current) => !current)}
                                    className="flex w-full flex-col gap-2.5 text-left sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <p className="text-sm font-semibold text-foreground">Editorial defaults</p>
                                    <div className="flex flex-wrap gap-2">
                                        <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                                            Audience: {audience}
                                        </div>
                                        <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                                            Tone: {tone}
                                        </div>
                                        <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                                            CTA: {cta}
                                        </div>
                                    </div>
                                </button>

                                {showEditorialDefaults ? (
                                    <div className="mt-4 grid gap-4 border-t border-border/60 pt-4 xl:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="ai-blogger-audience">Audience</Label>
                                            <Input
                                                id="ai-blogger-audience"
                                                value={audience}
                                                onChange={(event) => setAudience(event.target.value)}
                                                className="h-11 rounded-2xl border-border/60 bg-background/60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ai-blogger-tone">Tone</Label>
                                            <Input
                                                id="ai-blogger-tone"
                                                value={tone}
                                                onChange={(event) => setTone(event.target.value)}
                                                className="h-11 rounded-2xl border-border/60 bg-background/60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ai-blogger-cta">CTA style</Label>
                                            <Input
                                                id="ai-blogger-cta"
                                                value={cta}
                                                onChange={(event) => setCta(event.target.value)}
                                                className="h-11 rounded-2xl border-border/60 bg-background/60"
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {formMode === "ai" ? (
                            <div className="rounded-[24px] border border-border/60 bg-background/40">
                                <button
                                    type="button"
                                    onClick={() => setShowPipelinePlan((v) => !v)}
                                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-background/60"
                                >
                                    <div>
                                        <p className="text-sm font-semibold">Review pipeline plan</p>
                                        <p className="text-xs text-muted-foreground">
                                            {strategyResearchStack.join(" | ")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Badge className="rounded-full bg-primary/12 text-primary hover:bg-primary/12 text-xs px-2.5 py-1">AI Mode</Badge>
                                        {showPipelinePlan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </button>

                                {showPipelinePlan && (
                                    <div className="border-t border-border/60 px-5 pb-5 pt-4">
                                        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                                            <div className="space-y-3">
                                                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Active generation features</p>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {activeGenerationFeatures.map((feature) => (
                                                        <div
                                                            key={feature.key}
                                                            className={[
                                                                "rounded-[22px] border p-3.5 transition-all",
                                                                feature.active
                                                                    ? "border-primary/20 bg-primary/5"
                                                                    : "border-border/60 bg-background/60",
                                                            ].join(" ")}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={["flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", feature.active ? "border-primary/25 bg-primary/10 text-primary" : "border-border/60 bg-background/70 text-muted-foreground"].join(" ")}>
                                                                    <feature.icon className="h-4 w-4" />
                                                                </div>
                                                                <div className="min-w-0 space-y-0.5">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <p className="text-sm font-semibold">{feature.title}</p>
                                                                        <Badge className={["rounded-full border px-2 py-0 text-[9px] font-semibold uppercase tracking-[0.14em] shadow-none", feature.active ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/10" : "border-border/60 bg-background/70 text-muted-foreground hover:bg-background/70"].join(" ")}>{feature.active ? "On" : "Off"}</Badge>
                                                                    </div>
                                                                    <p className="text-xs leading-5 text-muted-foreground">{feature.note}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Draft strategy</p>
                                                <div className="rounded-[22px] border border-border/60 bg-background/55 p-3.5">
                                                    <p className="text-xs font-medium text-muted-foreground">Topic source</p>
                                                    <p className="mt-1 text-sm font-semibold">{strategySourceSummary}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {strategySettingBadges.map((badge) => (
                                                        <div key={badge} className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">{badge}</div>
                                                    ))}
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-[22px] border border-border/60 bg-background/55 p-3">
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold"><BarChart3 className="h-3.5 w-3.5 text-primary" />SEO rules</div>
                                                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{strategySeoSummary}</p>
                                                    </div>
                                                    <div className="rounded-[22px] border border-border/60 bg-background/55 p-3">
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold"><CalendarClock className="h-3.5 w-3.5 text-primary" />Publish flow</div>
                                                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{targetPublishSummary}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {formMode === "manual" ? (
                            <div className="space-y-4 rounded-[28px] border border-border/60 bg-background/40 p-4 sm:p-5">
                                <h3 className="text-lg font-semibold">Write the first version</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="ai-blogger-excerpt">Excerpt</Label>
                                    <Textarea
                                        id="ai-blogger-excerpt"
                                        value={excerpt}
                                        onChange={(event) => setExcerpt(event.target.value)}
                                        placeholder="Short summary for the editorial queue"
                                        className="min-h-[96px] rounded-[24px] border-border/60 bg-background/60"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ai-blogger-content">Manual draft body</Label>
                                    <Textarea
                                        id="ai-blogger-content"
                                        value={content}
                                        onChange={(event) => setContent(event.target.value)}
                                        placeholder="Write the first pass yourself, then save it into the editorial queue."
                                        className="min-h-[220px] rounded-[24px] border-border/60 bg-background/60"
                                    />
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-tags">Tags</Label>
                                        <Textarea
                                            id="ai-blogger-tags"
                                            value={tagsText}
                                            onChange={(event) => setTagsText(event.target.value)}
                                            placeholder="SEO, Automation, Content Ops"
                                            className="min-h-[120px] rounded-[24px] border-border/60 bg-background/60"
                                        />
                                        <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-outline">Outline</Label>
                                        <Textarea
                                            id="ai-blogger-outline"
                                            value={outlineText}
                                            onChange={(event) => setOutlineText(event.target.value)}
                                            placeholder={"Intro angle\nKey problem\nFramework or solution\nCTA wrap-up"}
                                            className="min-h-[120px] rounded-[24px] border-border/60 bg-background/60"
                                        />
                                        <p className="text-xs text-muted-foreground">Use one line per section.</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(212,160,10,0.08),rgba(255,255,255,0.02))] p-4 sm:p-6">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold">Create the draft</h3>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                                {formMode === "ai"
                                    ? "Generate the first full draft with AI, then refine it in the editorial queue."
                                    : "Save your manual version now, or switch back to AI mode if you want a first pass generated for you."}
                            </p>
                        </div>

                        {error ? (
                            <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                                {error}
                            </div>
                        ) : null}

                        <AIBloggerGradientButton
                            type={formMode === "manual" ? "submit" : "button"}
                            size="lg"
                            className="w-full"
                            onClick={formMode === "ai" ? () => submitDraft("ai") : undefined}
                            disabled={isPending || pipelineStatus === "running"}
                        >
                            {formMode === "manual" ? (
                                isPending && actionMode === "manual" ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Creating Manual Draft…
                                    </>
                                ) : (
                                    <>
                                        <FilePenLine className="h-5 w-5" />
                                        Create Manual Draft
                                    </>
                                )
                            ) : pipelineStatus === "running" ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Generating Blog…
                                </>
                                ) : (
                                    <>
                                        <WandSparkles className="h-5 w-5" />
                                        Generate Draft With AI
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                        </AIBloggerGradientButton>
                    </div>
                </AIBloggerGlassCard>
            </form>

            {/* Pipeline progress — full-width card that slides in when pipeline starts */}
            {pipelineVisible && formMode === "ai" ? (
                <AIBloggerGlassCard className="overflow-hidden p-4 sm:p-6">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-base font-semibold">Generation Progress</p>
                                <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                                    {pipelineStatus === "running"
                                        ? `${Object.values(pipelineSteps).filter((s) => s === "completed").length} of ${AI_PIPELINE_STEPS.length} steps completed`
                                        : pipelineStatus === "success"
                                            ? pipelineCompletionMessage || "All steps completed."
                                            : "Generation stopped before completion."}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {pipelineStatus === "running" ? (
                                    <Badge className="rounded-full bg-primary/12 text-primary hover:bg-primary/12">
                                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                        Running
                                    </Badge>
                                ) : pipelineStatus === "success" ? (
                                    <Badge className="rounded-full bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                        <Check className="mr-1.5 h-3 w-3" />
                                        Complete
                                    </Badge>
                                ) : (
                                    <Badge className="rounded-full bg-destructive/15 text-destructive hover:bg-destructive/15">
                                        <XCircle className="mr-1.5 h-3 w-3" />
                                        Failed
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Show brief summary when running/failed */}
                        {(pipelineStatus === "running" || pipelineStatus === "failed") && (
                            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Your Setup</p>
                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                    <div><span className="font-medium text-foreground">Source:</span> {sourceMode === "website" ? "Website" : sourceMode === "trending" ? "Trending Topic" : "Keywords"} | {sourceValue.substring(0, 40)}{sourceValue.length > 40 ? "..." : ""}</div>
                                    <div><span className="font-medium text-foreground">Word target:</span> {selectedWordTarget} words {primaryKeyword && `| Keyword: ${primaryKeyword.substring(0, 30)}${primaryKeyword.length > 30 ? "..." : ""}`}</div>
                                </div>
                            </div>
                        )}

                        {/* Accessibility announcement region for screen readers */}
                        <div
                            aria-live="polite"
                            aria-atomic="true"
                            className="sr-only"
                        >
                            {pipelineStatus === "running" && "Generation in progress. This may take several minutes. Do not close the page."}
                            {pipelineStatus === "success" && "Generation complete! Your draft is ready to review."}
                            {pipelineStatus === "failed" && `Generation failed. ${pipelineLogs.find((l) => l.level === "error")?.message || "Check the log for details."}`}
                        </div>

                        {/* Progress Bar and Time Display */}
                        {pipelineStatus === "running" && (
                            <div className="space-y-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-foreground">Progress</span>
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {Math.round((Object.values(pipelineSteps).filter((s) => s === "completed").length / AI_PIPELINE_STEPS.length) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-500"
                                                style={{
                                                    width: `${(Object.values(pipelineSteps).filter((s) => s === "completed").length / AI_PIPELINE_STEPS.length) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    <div>
                                        <span className="font-medium text-foreground">Elapsed:</span> {formatElapsedTime(pipelineElapsedTime)}
                                    </div>
                                    <div>
                                        <span className="font-medium text-foreground">Estimate:</span> {estimateRemainingTime(Object.values(pipelineSteps).filter((s) => s === "completed").length, AI_PIPELINE_STEPS.length, pipelineElapsedTime)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Alert with Context and Retry Option */}
                        {pipelineStatus === "failed" && (
                            <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-start gap-2.5">
                                        <div className="mt-0.5">
                                            <span className="text-lg">{errorType ? getErrorIcon(errorType) : "❌"}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-destructive">
                                                {errorType ? `${errorType.charAt(0).toUpperCase() + errorType.slice(1).replace(/-/g, " ")} Error` : "Generation Failed"}
                                            </p>
                                            <p className="mt-1 text-sm leading-6 text-foreground">
                                                {pipelineLogs.find((l) => l.level === "error")?.message || "An unexpected error occurred."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Suggestion Box */}
                                {errorType && (
                                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
                                        <div className="flex gap-2.5">
                                            <span className="shrink-0 text-base">⚡</span>
                                            <div className="text-xs leading-5 text-muted-foreground">
                                                {getErrorSuggestion(errorType)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {canRetry && (
                                        <button
                                            onClick={() => submitDraft("ai")}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/35 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
                                        >
                                            <span>🔄</span>
                                            Retry Generation
                                        </button>
                                    )}
                                    <button
                                        onClick={() => resetPipeline()}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-background/80 transition-colors"
                                    >
                                        <span>↻</span>
                                        Start Over
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {AI_PIPELINE_STEPS.map((step) => {
                                const state = pipelineSteps[step.key];
                                const classes = getStepClasses(state);
                                const isFailed = state === "failed";
                                return (
                                    <div
                                        key={step.key}
                                        className={[
                                            "flex items-start gap-2.5 rounded-2xl border px-3 py-3 transition-all",
                                            isFailed ? "border-destructive/35 bg-destructive/5 ring-2 ring-destructive/20" : classes.card,
                                        ].join(" ")}
                                    >
                                        <div
                                            className={[
                                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                                                isFailed ? "border-destructive/35 bg-destructive/10 text-destructive" : classes.icon,
                                            ].join(" ")}
                                        >
                                            {state === "completed" ? (
                                                <Check className="h-4 w-4" />
                                            ) : state === "failed" ? (
                                                <XCircle className="h-4 w-4" />
                                            ) : state === "active" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <step.icon className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold ${isFailed ? "text-destructive" : classes.title}`}>
                                                {step.label}
                                            </p>
                                            {pipelineStepLabels[step.key] ? (
                                                <p className={`text-xs font-medium ${isFailed ? "text-destructive/70" : "text-muted-foreground"}`}>
                                                    {pipelineStepLabels[step.key]}
                                                </p>
                                            ) : null}
                                            {pipelineStepNotes[step.key] ? (
                                                <p className={`mt-0.5 text-xs leading-5 ${isFailed ? "text-destructive/60 font-medium" : "text-muted-foreground"}`}>
                                                    {pipelineStepNotes[step.key]}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {pipelineLogs.length > 0 ? (
                            <div className="rounded-2xl border border-border/60 bg-background/65 p-4">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        Live Log ({pipelineLogs.length} entries)
                                    </p>
                                    <button
                                        onClick={() => {
                                            const logText = pipelineLogs
                                                .map((l) => `[${l.timestamp}] ${l.label}: ${l.message}`)
                                                .join("\n");
                                            navigator.clipboard.writeText(logText);
                                            toast.success("Log copied to clipboard");
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        title="Copy full log"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                                <div
                                    ref={logScrollRef}
                                    className="max-h-72 space-y-1.5 overflow-y-auto pr-1 font-mono text-[11px]"
                                >
                                    {pipelineLogs.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className={[
                                                "flex items-start gap-2.5 rounded-lg px-3 py-1.5 transition-colors",
                                                entry.level === "output" ? "bg-emerald-500/8" : entry.level === "error" ? "bg-destructive/8" : entry.level === "warn" ? "bg-amber-400/8" : "hover:bg-background/40",
                                            ].join(" ")}
                                        >
                                            <span
                                                className={[
                                                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                                    entry.level === "output" || entry.level === "success"
                                                        ? "bg-emerald-500"
                                                        : entry.level === "error"
                                                            ? "bg-destructive"
                                                            : entry.level === "warn"
                                                                ? "bg-amber-400"
                                                                : "bg-muted-foreground/50",
                                                ].join(" ")}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                                    <span
                                                        className={[
                                                            "font-semibold",
                                                            entry.level === "output" || entry.level === "success"
                                                                ? "text-emerald-500"
                                                                : entry.level === "error"
                                                                    ? "text-destructive"
                                                                    : entry.level === "warn"
                                                                        ? "text-amber-400"
                                                                        : "text-foreground/70",
                                                        ].join(" ")}
                                                    >
                                                        {entry.label}
                                                    </span>
                                                    <span className="shrink-0 text-[9px] text-muted-foreground/40">
                                                        {entry.timestamp}
                                                    </span>
                                                </div>
                                                <p className={[
                                                    "text-[10px] leading-normal text-muted-foreground mt-0.5",
                                                    entry.level === "output" || entry.level === "error" ? "font-medium" : "",
                                                    entry.level === "error" ? "text-destructive/70" : "",
                                                ].join(" ")}>
                                                    {entry.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </AIBloggerGlassCard>
            ) : null}
        </div>
    );
}
