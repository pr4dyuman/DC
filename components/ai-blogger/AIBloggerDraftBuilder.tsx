"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
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
    BlogStudioGenerationStepInsight,
    BlogStudioInputMode,
    BlogStudioPipelineCompletionResult,
    BlogStudioSettings,
    BlogStudioTargetType,
} from "@/lib/types";

// Type guard for validating pipeline result
function isBlogStudioPipelineCompletionResult(value: unknown): value is BlogStudioPipelineCompletionResult {
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
    if (mode === "website") return "Enter the website URL";
    if (mode === "trending") return "Add a trend angle or leave blank";
    return "Add one keyword cluster";
}

function getSourceDetailHelpText(mode: BlogStudioInputMode) {
    if (mode === "website") {
        return "AI Blogger will fetch the homepage plus a few key internal pages to understand services, headings, and FAQ signals before it drafts.";
    }

    if (mode === "trending") {
        return "Leave blank to use the top live trend, or add a market shift, launch, seasonal event, or timely angle to steer selection.";
    }

    return "Use a keyword cluster, offer theme, or campaign phrase that should anchor the SEO direction.";
}

function getSourceFieldLabel(mode: BlogStudioInputMode) {
    if (mode === "website") return "Website URL";
    if (mode === "trending") return "Trend angle (optional)";
    return "Keyword cluster";
}

function getSourceFieldExample(mode: BlogStudioInputMode) {
    if (mode === "website") {
        return "Use the full URL so AI Blogger can map your pages, services, and site language correctly.";
    }

    if (mode === "trending") {
        return "Blank means pure trending mode; AI Blogger will choose the strongest live trend instead of filtering by website fit.";
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
        note: "Start from a live website, then use Google Trends only when a topic fits the site's authority.",
        icon: Globe,
        badge: "Recommended",
    },
    {
        value: "trending",
        title: "Trend Assisted",
        note: "Use live trend discovery with an optional target website to protect topical fit.",
        icon: Sparkles,
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
        label: "Website Scan",
        icon: Globe,
    },
    {
        key: "fetch-trends",
        label: "Topic Opportunity Gate",
        icon: Globe,
    },
    {
        key: "serp-analysis",
        label: "Search Landscape",
        icon: Search,
    },
    {
        key: "grounded-research",
        label: "Source Verification",
        icon: Search,
    },
    {
        key: "performance-feedback",
        label: "Performance Context",
        icon: CalendarClock,
    },
    {
        key: "deep-research",
        label: "Research Strategy",
        icon: Brain,
    },
    {
        key: "keywords",
        label: "Winnable Keywords",
        icon: KeyRound,
    },
    {
        key: "seo-analysis",
        label: "SEO Plan",
        icon: BarChart3,
    },
    {
        key: "brief-pack",
        label: "Content Brief",
        icon: Brain,
    },
    {
        key: "outline-pack",
        label: "Article Outline",
        icon: FilePenLine,
    },
    {
        key: "metadata-pack",
        label: "Metadata Draft",
        icon: Tags,
    },
    {
        key: "faq-pack",
        label: "FAQ Plan",
        icon: Search,
    },
    {
        key: "internal-links",
        label: "Internal Link Plan",
        icon: Link2,
    },
    {
        key: "write-blog",
        label: "Draft Writing",
        icon: FilePenLine,
    },
    {
        key: "final-ai-checker",
        label: "AI Draft Check",
        icon: ShieldCheck,
    },
    {
        key: "quality-review",
        label: "SEO Quality Gate",
        icon: Check,
    },
    {
        key: "generate-image",
        label: "Image Direction",
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

type PipelineStageCopy = {
    title: string;
    pending: string;
    active: string;
    completed: string;
    skipped: string;
    failed: string;
    legacyLabels?: string[];
};

const PIPELINE_STAGE_COPY: Record<string, PipelineStageCopy> = {
    "website-intelligence": {
        title: "Website Scan",
        pending: "Waiting to collect site context for services, offers, pages, and proof points.",
        active: "Scanning site pages for services, offers, proof points, FAQs, and link targets.",
        completed: "Website context is ready for topic selection, internal links, and brand fit.",
        skipped: "No website scan was needed for this input.",
        failed: "The website scan needs attention before it can provide site context.",
        legacyLabels: ["Website Intelligence", "Website Intelligence (target site)"],
    },
    "fetch-trends": {
        title: "Topic Opportunity Gate",
        pending: "Waiting to compare trend demand against the website service lane.",
        active: "Checking Google Trends first, then internet signals if no live trend fits the site.",
        completed: "A website-fit topic opportunity passed trend, freshness, and business relevance checks.",
        skipped: "Topic opportunity checks were skipped for this run.",
        failed: "Topic opportunity checks blocked the run before drafting.",
        legacyLabels: ["Fetch Trends"],
    },
    "serp-analysis": {
        title: "Search Landscape",
        pending: "Waiting to review ranking intent and competitor patterns.",
        active: "Reviewing search results, competitor angles, and People Also Ask patterns.",
        completed: "Search intent and competitor patterns are ready for the plan.",
        skipped: "Search landscape review was skipped because it is disabled or not needed.",
        failed: "Search landscape review needs attention.",
        legacyLabels: ["SERP Analysis"],
    },
    "grounded-research": {
        title: "Source Verification",
        pending: "Waiting to collect and fit-check trusted external support.",
        active: "Collecting trusted sources and checking that they match the selected topic.",
        completed: "Grounded source support passed relevance checks for the writer.",
        skipped: "Source verification was skipped because trusted source collection is disabled or unavailable.",
        failed: "Source verification blocked the run or needs attention before drafting.",
        legacyLabels: ["Grounded Research"],
    },
    "performance-feedback": {
        title: "Performance Context",
        pending: "Waiting to check existing content signals.",
        active: "Checking previous performance data for useful search opportunities.",
        completed: "Performance context is ready for topic and keyword decisions.",
        skipped: "Performance context was skipped because no usable data is connected.",
        failed: "Performance context needs attention.",
        legacyLabels: ["Performance Feedback"],
    },
    "deep-research": {
        title: "Research Strategy",
        pending: "Waiting to combine website, trend, search, and source signals.",
        active: "Combining research signals into a practical content strategy.",
        completed: "The research strategy is ready.",
        skipped: "Research strategy was skipped for this run.",
        failed: "Research strategy needs attention.",
        legacyLabels: ["Deep Research"],
    },
    keywords: {
        title: "Winnable Keywords",
        pending: "Waiting to score primary and supporting keyword opportunities.",
        active: "Scoring keyword fit, long-tail intent, SERP winnability, and internal-link support.",
        completed: "Winnable keyword targets are ready.",
        skipped: "Winnable keyword scoring was skipped.",
        failed: "Winnable keyword scoring needs attention.",
        legacyLabels: ["Keywords"],
    },
    "seo-analysis": {
        title: "SEO Plan",
        pending: "Waiting to convert research into an SEO plan.",
        active: "Building the SEO plan from search intent, entities, and ranking gaps.",
        completed: "The SEO plan is ready.",
        skipped: "SEO planning was skipped.",
        failed: "SEO planning needs attention.",
        legacyLabels: ["SEO Analysis"],
    },
    "brief-pack": {
        title: "Content Brief",
        pending: "Waiting to create the content brief.",
        active: "Creating the content brief, audience angle, and business-fit guidance.",
        completed: "The content brief is ready.",
        skipped: "The content brief was skipped.",
        failed: "The content brief needs attention.",
        legacyLabels: ["Brief Pack"],
    },
    "outline-pack": {
        title: "Article Outline",
        pending: "Waiting to structure the article.",
        active: "Structuring headings, flow, and section intent before writing.",
        completed: "The article outline is ready.",
        skipped: "The article outline was skipped.",
        failed: "The article outline needs attention.",
        legacyLabels: ["Outline Pack"],
    },
    "metadata-pack": {
        title: "Metadata Draft",
        pending: "Waiting to draft search snippets.",
        active: "Drafting meta title, description, excerpt, slug, and social preview copy.",
        completed: "Metadata is ready for review.",
        skipped: "Metadata drafting was skipped.",
        failed: "Metadata drafting needs attention.",
        legacyLabels: ["Metadata Pack"],
    },
    "faq-pack": {
        title: "FAQ Plan",
        pending: "Waiting to identify useful questions.",
        active: "Building useful FAQ questions and answers from search intent.",
        completed: "FAQ ideas are ready.",
        skipped: "FAQ planning was skipped.",
        failed: "FAQ planning needs attention.",
        legacyLabels: ["FAQ Pack"],
    },
    "internal-links": {
        title: "Internal Link Plan",
        pending: "Waiting to select relevant site links.",
        active: "Selecting relevant service, offer, and blog links for natural placements.",
        completed: "Internal link targets are ready.",
        skipped: "Internal link planning was skipped because no useful targets were available.",
        failed: "Internal link planning needs attention.",
        legacyLabels: ["Internal Links"],
    },
    "write-blog": {
        title: "Draft Writing",
        pending: "Waiting for the research and plan to finish.",
        active: "Writing the article with the approved research, links, FAQs, and SEO plan.",
        completed: "The article draft is saved in the review queue.",
        skipped: "Draft writing was skipped.",
        failed: "Draft writing needs attention.",
        legacyLabels: ["Write Blog"],
    },
    "final-ai-checker": {
        title: "AI Draft Check",
        pending: "Waiting to check the finished draft.",
        active: "Reviewing the draft for fixable SEO, claim, link, and tone issues.",
        completed: "AI draft checks are complete.",
        skipped: "Quality review was skipped.",
        failed: "AI draft check needs attention.",
        legacyLabels: ["Final AI Checker"],
    },
    "quality-review": {
        title: "SEO Quality Gate",
        pending: "Waiting to score the final article against the SEO strategy.",
        active: "Scoring search intent, original asset execution, proof, cluster fit, structure, and conversion path.",
        completed: "The final SEO quality gate passed.",
        skipped: "The SEO quality gate was skipped.",
        failed: "The final article did not pass the SEO quality gate.",
        legacyLabels: ["Quality Review"],
    },
    "generate-image": {
        title: "Image Direction",
        pending: "Waiting to prepare image direction.",
        active: "Creating or preparing featured image direction and alt text.",
        completed: "Image direction is ready.",
        skipped: "Image generation was skipped.",
        failed: "Image direction needs attention.",
        legacyLabels: ["Generate Image"],
    },
    pipeline: {
        title: "Workflow",
        pending: "Waiting for the workflow to begin.",
        active: "Running the AI Blogger workflow.",
        completed: "The workflow completed successfully.",
        skipped: "The workflow step was skipped.",
        failed: "The workflow needs attention.",
        legacyLabels: ["Pipeline"],
    },
};

function getFallbackStageTitle(value?: string) {
    const normalized = value?.trim();
    if (!normalized) return "Workflow";

    return normalized
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPipelineStageCopy(step?: string, fallbackLabel?: string): PipelineStageCopy {
    if (step && PIPELINE_STAGE_COPY[step]) {
        return PIPELINE_STAGE_COPY[step];
    }

    const title = getFallbackStageTitle(fallbackLabel || step);
    return {
        title,
        pending: "Waiting for this workflow step.",
        active: `Running ${title.toLowerCase()}.`,
        completed: `${title} completed.`,
        skipped: `${title} was skipped.`,
        failed: `${title} needs attention.`,
    };
}

function formatPipelineNoteForDisplay(step: string | undefined, note: string | undefined) {
    const raw = note?.trim();
    if (!raw) return "";

    let display = raw
        .replace(/\s*\|\s*/g, " - ")
        .replace(/\s*\u2022\s*/g, " - ")
        .replace(/\s*\u2014\s*/g, " - ")
        .replace(/\bSERP\b/g, "search results")
        .replace(/\bAI-only discovery\b/g, "AI topic discovery")
        .replace(/\bFallback key\b/g, "backup AI key");

    if (step === "website-intelligence") {
        display = display
            .replace(/^Cache hit - Pages:/i, "Using cached website scan. Pages analyzed:")
            .replace(/^Fresh crawl - Pages:/i, "Fresh website scan complete. Pages analyzed:");
    }

    return display;
}

function getPipelineStepStatusText(step: string, state: PipelineStepState, note?: string) {
    const formattedNote = formatPipelineNoteForDisplay(step, note);
    if (formattedNote) return formattedNote;

    const copy = getPipelineStageCopy(step);
    if (state === "active") return copy.active;
    if (state === "completed") return copy.completed;
    if (state === "failed") return copy.failed;
    return copy.pending;
}

function getPipelineLogMessage(
    event: { step?: string; label?: string; notes?: string; message?: string },
    status: "active" | "completed" | "skipped" | "failed",
) {
    const copy = getPipelineStageCopy(event.step, event.label);
    const note = formatPipelineNoteForDisplay(event.step, event.notes || event.message);
    if (note) return note;
    return copy[status];
}

function getPipelineSecondaryLabel(step: string, label?: string) {
    const normalizedLabel = label?.trim();
    if (!normalizedLabel) return "";
    const displayLabel = formatPipelineNoteForDisplay(step, normalizedLabel);

    const copy = getPipelineStageCopy(step, displayLabel);
    const hiddenLabels = [copy.title, ...(copy.legacyLabels || [])].map((value) => value.toLowerCase());
    if (hiddenLabels.includes(displayLabel.toLowerCase())) {
        return "";
    }

    return displayLabel;
}

type AIBloggerTrendPlan = {
    liveTrendsEnabled: boolean;
    fallbackToAi: boolean;
    defaultLocation: string;
    trendFirstMode: boolean;
    maxTrendRequestsPerBlog: number;
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
    if (
        lower.includes("timeout") ||
        lower.includes("timed out") ||
        lower.includes("server time limit") ||
        lower.includes("request took too long")
    ) return "timeout";
    if (
        lower.includes("quota") ||
        lower.includes("rate limit") ||
        lower.includes("too many requests") ||
        lower.includes("payment required") ||
        lower.includes("credits")
    ) return "api-limit";
    if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection")) return "network";
    if (lower.includes("validation") || lower.includes("invalid") || lower.includes("required")) return "validation";
    return "unknown";
}

function getErrorSuggestion(errorType: "validation" | "api-limit" | "timeout" | "network" | "unknown"): string {
    switch (errorType) {
        case "api-limit":
            return "An external API quota was exceeded. Wait a few minutes and try again. Try with a simpler topic or fewer features enabled.";
        case "timeout":
            return "The pipeline hit the server time limit. The draft may still finish in the background, so check the posts list in a minute. If it does not, retry with a simpler topic, shorter word count, or fewer research features.";
        case "network":
            return "A network error occurred. Check your connection and try again. This is usually temporary.";
        case "validation":
            return "Check your brief inputs: ensure the source detail is complete and valid.";
        default:
            return "Check the workflow timeline above for diagnostic details. Try again or contact support if the issue persists.";
    }
}

function getErrorIcon(errorType: "validation" | "api-limit" | "timeout" | "network" | "unknown") {
    switch (errorType) {
        case "api-limit": return "API";
        case "timeout": return "TIME";
        case "network": return "NET";
        case "validation": return "!";
        default: return "ERR";
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
    return plan.liveTrendsEnabled && plan.trendFirstMode ? "Trend-first Google Trends" : plan.liveTrendsEnabled ? "Live Google Trends" : "AI topic discovery";
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
                ? `Scanning live trending topics for ${location} with a ${plan.maxTrendRequestsPerBlog}-request cap.`
                : normalizedTrendFocus && sourceMode === "website"
                    ? `Scanning Google Trends for ${location} until a live topic matches the website and "${normalizedTrendFocus}", capped at ${plan.maxTrendRequestsPerBlog} requests.`
                    : `Scanning Google Trends for ${location} until a live topic matches the site, capped at ${plan.maxTrendRequestsPerBlog} requests.`;

        return plan.fallbackToAi
            ? `${modeText} AI fallback is ready if the live provider fails.`
            : modeText;
    }

    return "Live trends is off for this workspace, so AI topic discovery will choose the topic angle.";
}

function getPlannedSerpAnalysisNote(plan: AIBloggerSerpPlan) {
    if (plan.enabled) {
        return `The workflow will review Google results for ${plan.defaultLocation.toUpperCase()} on ${plan.device} to capture search intent, competitors, and People Also Ask patterns.`;
    }

    return "Search landscape review is skipped unless it is enabled in AI Blogger admin.";
}

function getPlannedGroundedResearchNote(
    serpPlan: AIBloggerSerpPlan,
    groundedResearchPlan: AIBloggerGroundedResearchPlan,
) {
    if (!serpPlan.enabled) {
        return "Source verification depends on ranking source pages, so it is skipped when search landscape review is off.";
    }

    if (!groundedResearchPlan.enabled) {
        return "Source verification is turned off in AI Blogger admin, so AI will rely on prompt context and search result patterns only.";
    }

    return "The workflow will fetch a trusted source set from ranking pages so research and writing stay grounded in real external evidence.";
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
        sourceMode === "website" ? "Website scan" : null,
        trendPlan.liveTrendsEnabled ? "Live trends" : "AI topic discovery",
        serpPlan.enabled ? `Search landscape (${serpPlan.device})` : null,
        serpPlan.enabled && groundedResearchPlan.enabled
            ? `Source verification (${groundedResearchPlan.trustPreference === "high-only" ? "high trust" : "balanced"})`
            : null,
        "Content brief",
        "Article outline",
        "Metadata draft",
        "FAQ plan",
        "Internal link plan",
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
            acc[step.key] = formatPipelineNoteForDisplay(step.key, step.notes);
        }
        return acc;
    }, {});
}

function mapGenerationStepStatusToPipelineState(status: BlogStudioGenerationStepInsight["status"]): PipelineStepState {
    if (status === "running") {
        return "active";
    }
    if (status === "failed") {
        return "failed";
    }
    if (status === "pending") {
        return "pending";
    }
    return "completed";
}

function buildPipelineStepStates(
    steps: BlogStudioGenerationStepInsight[],
    current?: PipelineStepsMap,
): PipelineStepsMap {
    const next = current ? { ...current } : getInitialPipelineSteps();
    for (const step of steps) {
        next[step.key] = mapGenerationStepStatusToPipelineState(step.status);
    }
    return next;
}

// BUG-12: module-level constant so it isn't re-created on every component render.
const STORAGE_KEY = "ai-blogger-active-job";

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
    const [isManualSubmitting, setIsManualSubmitting] = useState(false);
    const [showEditorialDefaults, setShowEditorialDefaults] = useState(false);
    const [showPipelinePlan, setShowPipelinePlan] = useState(false);

    const [title, setTitle] = useState("");
    const [sourceMode, setSourceMode] = useState<BlogStudioInputMode>("website");
    const [sourceValue, setSourceValue] = useState("");
    const [targetWebsiteUrl, setTargetWebsiteUrl] = useState("");
    const [trendFocus, setTrendFocus] = useState("");
    const [primaryKeyword, setPrimaryKeyword] = useState("");
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_pipelineStartTime, setPipelineStartTime] = useState<number | null>(null);
    const [pipelineElapsedTime, setPipelineElapsedTime] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_failedStepKey, setFailedStepKey] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<"validation" | "api-limit" | "timeout" | "network" | "unknown" | null>(null);
    const [canRetry, setCanRetry] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const activeJobIdRef = useRef<string | null>(null);
    const connectionNonceRef = useRef<number>(0);
    const streamReconnectNoticeRef = useRef(false);
    const logScrollRef = useRef<HTMLDivElement | null>(null);
    const elapsedTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const eventCursorRef = useRef<number>(0);
    const reconnectAttemptRef = useRef<number>(0);
    const pipelineStatusRef = useRef<PipelineStatus>(pipelineStatus);
    const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isFormLocked = pipelineStatus === "running";
    const submitBusy = isPending || isManualSubmitting || pipelineStatus === "running";
    // BUG-08: prevents a rapid double-click from kicking off two fetches and
    // creating two orphaned pipeline jobs (only one jobId gets saved to localStorage).
    const isSubmittingRef = useRef(false);

    // Keep pipelineStatusRef in sync so the onerror callback always reads the latest.
    useEffect(() => {
        pipelineStatusRef.current = pipelineStatus;
    }, [pipelineStatus]);

    // BUG-12: STORAGE_KEY moved to module level above.

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
        activeJobIdRef.current = null;
    }, []);

    const handlePipelineEvent = useEffectEvent(
        (data: {
            type: string;
            step?: string;
            label?: string;
            notes?: string;
            message?: string;
            result?: BlogStudioPipelineCompletionResult;
        }) => {
            try {
                if (data.type === "connected") {
                    if (streamReconnectNoticeRef.current) {
                        streamReconnectNoticeRef.current = false;
                        pushPipelineLog("Workflow", "Live progress connection restored.", "success");
                    }
                    return;
                }

                if (data.type === "step-start" && data.step) {
                    const copy = getPipelineStageCopy(data.step, data.label);
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "active",
                    }));
                    const secondaryLabel = getPipelineSecondaryLabel(data.step, data.label);
                    setPipelineStepLabels((current) => {
                        const next = { ...current };
                        if (secondaryLabel) {
                            next[data.step!] = secondaryLabel;
                        } else {
                            delete next[data.step!];
                        }
                        return next;
                    });
                    pushPipelineLog(copy.title, getPipelineLogMessage(data, "active"), "info");
                    return;
                }

                if (data.type === "step-complete" && data.step) {
                    const copy = getPipelineStageCopy(data.step, data.label);
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "completed",
                    }));
                    if (data.notes) {
                        setPipelineStepNotes((current) => ({
                            ...current,
                            [data.step!]: formatPipelineNoteForDisplay(data.step, data.notes),
                        }));
                    }
                    if (data.label) {
                        const secondaryLabel = getPipelineSecondaryLabel(data.step, data.label);
                        setPipelineStepLabels((current) => {
                            const next = { ...current };
                            if (secondaryLabel) {
                                next[data.step!] = secondaryLabel;
                            } else {
                                delete next[data.step!];
                            }
                            return next;
                        });
                    }
                    pushPipelineLog(
                        copy.title,
                        getPipelineLogMessage(data, "completed"),
                        "output",
                    );
                    return;
                }

                if (data.type === "step-fail" && data.step) {
                    const copy = getPipelineStageCopy(data.step, data.label);
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "failed",
                    }));
                    if (data.notes) {
                        setPipelineStepNotes((current) => ({
                            ...current,
                            [data.step!]: formatPipelineNoteForDisplay(data.step, data.notes),
                        }));
                    }
                    pushPipelineLog(
                        copy.title,
                        getPipelineLogMessage(data, "failed"),
                        "error",
                    );
                    // Store failed step for potential retry
                    setFailedStepKey(data.step);
                    return;
                }

                if (data.type === "step-skip" && data.step) {
                    const copy = getPipelineStageCopy(data.step, data.label);
                    setPipelineSteps((current) => ({
                        ...current,
                        [data.step!]: "completed",
                    }));
                    if (data.notes) {
                        setPipelineStepNotes((current) => ({
                            ...current,
                            [data.step!]: formatPipelineNoteForDisplay(data.step, data.notes),
                        }));
                    }
                    pushPipelineLog(
                        copy.title,
                        getPipelineLogMessage(data, "skipped"),
                        "warn",
                    );
                    return;
                }

                if (data.type === "log" && data.message) {
                    pushPipelineLog("Workflow", formatPipelineNoteForDisplay(undefined, data.message), "info");
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
                    const result = isBlogStudioPipelineCompletionResult(data.result) ? data.result : null;
                    if (result) {
                        setPipelineStatus("success");
                        setPipelineSteps((current) => buildPipelineStepStates(result.diagnostics.steps, current));
                        setPipelineStepLabels((current) => ({
                            ...current,
                            "fetch-trends": result.diagnostics.fetchTrendsLabel,
                        }));
                        setPipelineStepNotes(buildPipelineStepNotes(result.diagnostics.steps));
                        setPipelineCompletionMessage("Draft generated. Opening the draft...");
                        pushPipelineLog(
                            getPipelineStageCopy("fetch-trends").title,
                            `Source: ${result.diagnostics.fetchTrendsLabel} - ${formatPipelineNoteForDisplay("fetch-trends", result.diagnostics.fetchTrendsNotes)}`,
                            "output",
                        );
                        if (typeof result.diagnostics.businessFitScore === "number") {
                            pushPipelineLog("Topic Fit", `Score: ${result.diagnostics.businessFitScore}/100${result.diagnostics.businessFitSummary ? ` - ${result.diagnostics.businessFitSummary}` : ""}`, "success");
                        }
                        result.diagnostics.businessFitWarnings.forEach((w) =>
                            pushPipelineLog("Topic Fit", `Warning: ${w}`, "warn"),
                        );
                        pushPipelineLog("Workflow", "Draft generated and sent to the review queue.", "success");
                        toast.success("AI Blogger draft generated");

                        // Set slug to navigate to - will be handled in useEffect with cleanup
                        setPostSlugToNavigate(result.post.slug);
                    } else {
                        setPipelineStatus("success");
                        setPipelineCompletionMessage("Workflow complete.");
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
                    const stepLabel = activeStep?.label || "Workflow";

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
                    pushPipelineLog("Workflow", `${stepLabel}: ${message}`, "error");
                    pushPipelineLog("Recommended Next Step", suggestion, "warn");
                    setError(`${errorSummary}: ${message}`);
                    toast.error(`Generation failed at ${stepLabel}`);
                    return;
                }
            } catch (eventHandlingError) {
                console.error("[AI-BLOGGER] [DRAFT-BUILDER] Error handling pipeline event:", eventHandlingError);
                setError("An error occurred while processing the workflow. Please check the browser console.");
                setPipelineStatus("failed");
            }
        },
    );

    const handleSSEError = useEffectEvent(() => {
        // BUG-07: use the ref, not the state variable. This callback fires from an
        // EventSource handler which closes over the render-time value of `pipelineStatus`;
        // the ref is always kept in sync via the useEffect above.
        if (pipelineStatusRef.current === "running" && !streamReconnectNoticeRef.current) {
            streamReconnectNoticeRef.current = true;
            pushPipelineLog(
                "Workflow",
                "Live progress paused. Reconnecting to the saved run...",
                "warn",
            );
        }
    });

    /** Last-resort fallback: poll the status endpoint when SSE is completely unavailable. */
    const startStatusPolling = useEffectEvent(
        (jobId: string) => {
            if (statusPollIntervalRef.current) return; // Already polling

            const poll = async () => {
                try {
                    const res = await fetch(`/api/ai-blogger/generate/status?jobId=${encodeURIComponent(jobId)}`);
                    if (!res.ok) return;
                    const json = await res.json();

                    if (json.status === "completed" && json.result) {
                        // Deliver the result to the UI via handlePipelineEvent
                        handlePipelineEvent({ type: "complete", result: json.result });
                        if (statusPollIntervalRef.current) {
                            clearInterval(statusPollIntervalRef.current);
                            statusPollIntervalRef.current = null;
                        }
                    } else if (json.status === "failed") {
                        handlePipelineEvent({
                            type: "error",
                            message: json.error || "Workflow failed while checking saved status.",
                        });
                        if (statusPollIntervalRef.current) {
                            clearInterval(statusPollIntervalRef.current);
                            statusPollIntervalRef.current = null;
                        }
                    }
                    // If still "running", keep polling — next interval will check again.
                } catch {
                    // Network error during polling — ignore and retry on next interval.
                }
            };

            void poll(); // First check immediately
            statusPollIntervalRef.current = setInterval(() => {
                void poll();
            }, 5000);
        },
    );

    /** Connect (or reconnect) an SSE stream for a given jobId. */
    const connectSSERef = useRef<(jobId: string) => void>(() => {});
    connectSSERef.current = (jobId: string) => {
        const existing = eventSourceRef.current;
        if (
            activeJobIdRef.current === jobId &&
            existing &&
            existing.readyState !== EventSource.CLOSED
        ) {
            return;
        }

        closeEventSource();

        // Increment the nonce so stale error/close callbacks from old
        // connections can detect they are no longer the active one.
        const nonce = connectionNonceRef.current + 1;
        connectionNonceRef.current = nonce;

        // Build the SSE URL with cursor so the server skips already-delivered events.
        const params = new URLSearchParams();
        params.set("jobId", jobId);
        if (eventCursorRef.current > 0) {
            params.set("cursor", String(eventCursorRef.current));
        }
        const es = new EventSource(`/api/ai-blogger/generate/stream?${params.toString()}`);
        eventSourceRef.current = es;
        activeJobIdRef.current = jobId;

        es.onmessage = (event) => {
            // Ignore events from stale connections.
            if (connectionNonceRef.current !== nonce) return;

            // Reset reconnect counter — we're receiving live data.
            reconnectAttemptRef.current = 0;

            try {
                const data = JSON.parse(event.data);
                // eslint-disable-next-line react-hooks/rules-of-hooks -- called from EventSource callback, not during render
                handlePipelineEvent(data);
                // Track cursor after successful processing so reconnect can skip
                // events the client already processed. "connected" events don't go
                // through the server's sendEvent (no id: field), so only count
                // events that have a server-assigned id.
                if (data.type !== "connected") {
                    eventCursorRef.current += 1;
                }
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
            // eslint-disable-next-line react-hooks/rules-of-hooks -- called from EventSource callback, not during render
            handleSSEError();

            // Auto-reconnect when the stream is closed (e.g. Vercel 300s timeout)
            // and the pipeline is still running.
            if (
                es.readyState === EventSource.CLOSED &&
                pipelineStatusRef.current === "running"
            ) {
                const attempt = reconnectAttemptRef.current;
                const MAX_RECONNECT_ATTEMPTS = 10;

                if (attempt < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(2000 * Math.pow(1.5, attempt), 10000);
                    reconnectAttemptRef.current = attempt + 1;
                    console.log(
                        `[AI-BLOGGER] [SSE] Stream closed, reconnecting in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS}, cursor=${eventCursorRef.current})`,
                    );
                    setTimeout(() => {
                        // If another connectSSE call or resetPipeline happened since
                        // this timeout was scheduled, bail — don't double-reconnect.
                        if (connectionNonceRef.current !== nonce) return;
                        connectSSERef.current(jobId);
                    }, delay);
                } else {
                    // Max attempts exhausted — fall back to polling status endpoint.
                    console.warn(
                        `[AI-BLOGGER] [SSE] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) exhausted, falling back to status polling`,
                    );
                    pushPipelineLog(
                        "Workflow",
                        "Live progress stream unavailable. Checking the saved run status in the background...",
                        "warn",
                    );
                    // eslint-disable-next-line react-hooks/rules-of-hooks -- called from EventSource callback, not during render
                    startStatusPolling(jobId);
                }
            }
        };
    };
    const connectSSE = connectSSERef.current;

    /** Reset the pipeline UI to idle state. */
    const resetPipeline = useCallback(() => {
        closeEventSource();
        activeJobIdRef.current = null;
        connectionNonceRef.current += 1;
        eventCursorRef.current = 0;
        reconnectAttemptRef.current = 0;
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        if (elapsedTimeIntervalRef.current) {
            clearInterval(elapsedTimeIntervalRef.current);
            elapsedTimeIntervalRef.current = null;
        }
        if (statusPollIntervalRef.current) {
            clearInterval(statusPollIntervalRef.current);
            statusPollIntervalRef.current = null;
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

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (elapsedTimeIntervalRef.current) {
                clearInterval(elapsedTimeIntervalRef.current);
                elapsedTimeIntervalRef.current = null;
            }
            if (statusPollIntervalRef.current) {
                clearInterval(statusPollIntervalRef.current);
                statusPollIntervalRef.current = null;
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
                        setPipelineLogs([{ id: "reconnect", level: "info", label: "Workflow", message: "Reconnecting to the active generation workflow...", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connectSSE is read from a ref, always current
    }, [closeEventSource]);

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
            "Audience: Will be inferred",
            "Tone: Will be inferred",
            "CTA: Will be inferred",
            `Target: ${targetLabel}`,
        ],
        [targetLabel],
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

        if (sourceMode !== "trending" && !sourceValue.trim()) {
            setError(`Add the ${sourceFieldLabel.toLowerCase()} before creating or generating a draft.`);
            return;
        }

        if (sourceMode === "website" && !isValidWebsiteUrl(sourceValue.trim())) {
            setError("Enter a full website URL starting with http:// or https://.");
            return;
        }

        if (
            sourceMode !== "website" &&
            targetWebsiteUrl.trim() &&
            !isValidWebsiteUrl(targetWebsiteUrl.trim())
        ) {
            setError("The target website URL must start with http:// or https://.");
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
            // BUG-08: bail immediately if a fetch is already in-flight.
            if (isSubmittingRef.current) return;
            isSubmittingRef.current = true;
            // --- SSE-based AI generation ---
            setPipelineVisible(true);
            setPipelineStatus("running");
            setPipelineSteps(getInitialPipelineSteps());
            setPipelineLogs([{ id: "start", level: "info", label: "Workflow", message: "Generation workflow started.", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
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
            eventCursorRef.current = 0;
            reconnectAttemptRef.current = 0;

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
                primaryKeyword,
                language: settings.seo.defaultLanguage,
                location: settings.seo.defaultLocation,
                // Only pass targetWebsiteUrl for non-website modes
                ...(sourceMode !== "website" && targetWebsiteUrl.trim()
                    ? { targetWebsiteUrl: targetWebsiteUrl.trim() }
                    : {}),
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
                    body: JSON.stringify({ brief, target, wordCount: wordTarget }),
                });
                const json = await res.json();

                if (!res.ok || !json.ok) {
                    const msg = json.error || "Failed to start generation.";
                    setError(msg);
                    setPipelineStatus("failed");
                    pushPipelineLog("Workflow", `Could not start generation: ${msg}`, "error");
                    toast.error(msg);
                    if (elapsedTimeIntervalRef.current) {
                        clearInterval(elapsedTimeIntervalRef.current);
                        elapsedTimeIntervalRef.current = null;
                    }
                    isSubmittingRef.current = false; // BUG-08: release lock before early return
                    return;
                }

                const jobId = json.jobId as string;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId, ts: startTs })); } catch {}
                connectSSE(jobId);
                isSubmittingRef.current = false; // BUG-08: SSE is live — release the submit lock
            } catch (fetchError) {
                const msg = fetchError instanceof Error ? fetchError.message : "Network error";
                setError(msg);
                setPipelineStatus("failed");
                pushPipelineLog("Workflow", `Could not start generation: ${msg}`, "error");
                toast.error(msg);
                if (elapsedTimeIntervalRef.current) {
                    clearInterval(elapsedTimeIntervalRef.current);
                    elapsedTimeIntervalRef.current = null;
                }
                isSubmittingRef.current = false; // BUG-08: release lock on network / parse error
            }
            return;
        }

        // --- Manual draft (unchanged) ---
        resetPipeline();
        setIsManualSubmitting(true);

        startTransition(async () => {
            let navigatingToDraft = false;
            try {
                const brief = {
                    sourceMode,
                    sourceValue: sourceValue.trim(),
                    trendFocus,
                    primaryKeyword,
                    language: settings.seo.defaultLanguage,
                    location: settings.seo.defaultLocation,
                    // Only pass targetWebsiteUrl for non-website modes
                    ...(sourceMode !== "website" && targetWebsiteUrl.trim()
                        ? { targetWebsiteUrl: targetWebsiteUrl.trim() }
                        : {}),
                };
                const target = {
                    type: targetType,
                    label: targetLabel,
                };
                const wordTarget = Number.isFinite(normalizedWordCount) ? normalizedWordCount : undefined;

                const created = await createBlogStudioDraft({
                    title: title.trim(),
                    excerpt,
                    content,
                    tags: splitCommaList(tagsText),
                    outline: splitOutlineList(outlineText),
                    wordCount: wordTarget,
                    target,
                    brief,
                });
                toast.success("AI Blogger draft created");
                navigatingToDraft = true;
                router.push(`/dashboard/ai-blogger/posts/${created.slug}`);
                router.refresh();
            } catch (submitError: unknown) {
                const message = submitError instanceof Error ? submitError.message : "Draft creation failed.";
                console.error("[AI-BLOGGER] [GENERATE-UI] Raw error:", message);
                setError(message);
                toast.error(message);
                setIsManualSubmitting(false);
            } finally {
                if (navigatingToDraft) {
                    window.setTimeout(() => setIsManualSubmitting(false), 2500);
                } else {
                    setIsManualSubmitting(false);
                }
            }
        });
    };


    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (submitBusy) {
            return;
        }

        submitDraft(formMode);
    };

    const handleSourceModeSelect = (nextMode: BlogStudioInputMode) => {
        if (isFormLocked || nextMode === sourceMode) {
            return;
        }

        if (sourceMode === "website" && nextMode !== "website" && isValidWebsiteUrl(sourceValue.trim())) {
            setTargetWebsiteUrl(sourceValue.trim());
        }

        if (nextMode === "website") {
            setTargetWebsiteUrl("");
        }

        setSourceMode(nextMode);
        setSourceValue("");
        setTrendFocus("");
    };

    const selectedSourceModeLabel = sourceModeCards.find((mode) => mode.value === sourceMode)?.title ?? "Source";
    const selectedSourceSummary = sourceValue.trim() || (sourceMode === "trending" ? "Live trend discovery" : "Waiting for input");
    const compactSourceSummary = selectedSourceSummary.length > 44
        ? `${selectedSourceSummary.slice(0, 44)}...`
        : selectedSourceSummary;
    const compactPrimaryKeyword = primaryKeyword.trim().length > 34
        ? `${primaryKeyword.trim().slice(0, 34)}...`
        : primaryKeyword.trim();

    return (
        <div className="w-full space-y-4">
            <form
                onSubmit={handleSubmit}
                className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start"
            >
                <div className="space-y-4">
                <AIBloggerGlassCard className="p-4 sm:p-5 xl:p-6">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Generate a new blog draft
                            </h2>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Work from top to bottom: choose how to create the draft, pick a topic source, set the SEO target, then choose the handoff.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <span className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">1. Mode</span>
                                <span className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">2. Topic source</span>
                                <span className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">3. SEO target</span>
                                <span className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">4. Publish</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">1. Draft mode</Label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormMode("ai")}
                                    disabled={isFormLocked}
                                    aria-pressed={formMode === "ai"}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all",
                                        isFormLocked ? "cursor-not-allowed opacity-50" : "",
                                        formMode === "ai" && !isFormLocked
                                            ? "border-primary/35 bg-primary/12 text-primary"
                                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                                    ].join(" ")}
                                    title={isFormLocked ? "Cannot change mode during generation" : ""}
                                >
                                    <WandSparkles className="h-4 w-4" />
                                    AI Draft
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormMode("manual")}
                                    disabled={isFormLocked}
                                    aria-pressed={formMode === "manual"}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all",
                                        isFormLocked ? "cursor-not-allowed opacity-50" : "",
                                        formMode === "manual" && !isFormLocked
                                            ? "border-primary/35 bg-primary/12 text-primary"
                                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                                    ].join(" ")}
                                    title={isFormLocked ? "Cannot change mode during generation" : ""}
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

                        {formMode === "manual" ? (
                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-title">Blog title</Label>
                                <Input
                                    id="ai-blogger-title"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder="e.g. How agencies can use AI blogging without losing brand voice"
                                    className="h-11 rounded-xl border-border/60 bg-background/60 text-base"
                                    required
                                    disabled={isFormLocked}
                                />
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            <Label>2. Topic source</Label>
                            <div className="grid gap-3 lg:grid-cols-3">
                                {sourceModeCards.map((mode) => (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        onClick={() => handleSourceModeSelect(mode.value)}
                                        disabled={isFormLocked}
                                        aria-pressed={sourceMode === mode.value}
                                        className={[
                                            "relative min-h-[132px] rounded-xl border p-4 text-left transition-all duration-200",
                                            isFormLocked ? "cursor-not-allowed opacity-60" : "",
                                            sourceMode === mode.value
                                                ? "border-primary/35 bg-primary/10 ring-2 ring-primary/15"
                                                : "border-border/60 bg-background/45 hover:border-primary/20 hover:bg-background/70",
                                        ].join(" ")}
                                    >
                                        {sourceMode === mode.value && (
                                            <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-black">
                                                <Check className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                        {mode.badge && sourceMode !== mode.value ? (
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

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(220px,0.7fr)_minmax(160px,0.45fr)]">
                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-source-value">{sourceFieldLabel}</Label>
                                <Input
                                    id="ai-blogger-source-value"
                                    type={sourceMode === "website" ? "url" : "text"}
                                    value={sourceValue}
                                    onChange={(event) => setSourceValue(event.target.value)}
                                    placeholder={getSourcePlaceholder(sourceMode)}
                                    className="h-11 rounded-xl border-border/60 bg-background/60"
                                    disabled={isFormLocked}
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
                                    placeholder="Add one ranking keyword"
                                    className="h-11 rounded-xl border-border/60 bg-background/60"
                                    disabled={isFormLocked}
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
                                    className="h-11 rounded-xl border-border/60 bg-background/60"
                                    disabled={isFormLocked}
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Choose a target between {settings.seo.minWords} and {settings.seo.maxWords} words.
                                </p>
                            </div>
                        </div>

                        {/* Optional target website for internal links - only shown in non-website modes */}
                        {sourceMode !== "website" && (
                            <div className="rounded-xl border border-border/60 bg-background/45 p-4">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="ai-blogger-target-website">
                                            Internal links - target website <span className="text-muted-foreground font-normal">(optional)</span>
                                        </Label>
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            Enter your website URL so AI Blogger can crawl your pages and inject real internal links into the blog. Leave blank to skip internal linking.
                                        </p>
                                    </div>
                                    <Input
                                        id="ai-blogger-target-website"
                                        type="url"
                                        value={targetWebsiteUrl}
                                        onChange={(event) => setTargetWebsiteUrl(event.target.value)}
                                        placeholder="Enter target website URL"
                                        className="h-11 rounded-xl border-border/60 bg-background/60"
                                        disabled={isFormLocked}
                                    />
                                    {targetWebsiteUrl.trim() && !isValidWebsiteUrl(targetWebsiteUrl.trim()) && (
                                        <p className="text-xs text-destructive">
                                            Enter a full URL starting with https:// or http://
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {sourceMode === "website" ? (
                            <div className="rounded-xl border border-border/60 bg-background/45 p-4">
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start">
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-trend-focus">Trend angle for this website</Label>
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            Add a timely angle only if you want to steer topic discovery. Leave blank for a pure website-led draft.
                                        </p>
                                        <Input
                                            id="ai-blogger-trend-focus"
                                            value={trendFocus}
                                            onChange={(event) => setTrendFocus(event.target.value)}
                                            placeholder="Add a timely angle"
                                            className="h-11 rounded-xl border-border/60 bg-background/60"
                                            disabled={isFormLocked}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">Live trend blend</p>
                                            <p className="text-xs leading-5 text-muted-foreground">
                                                {trendPlan.liveTrendsEnabled
                                                    ? "Website topics and trend angle both feed discovery."
                                                    : "Live trends is off; this still guides AI discovery."}
                                            </p>
                                        </div>
                                        <Switch checked={trendPlan.liveTrendsEnabled} disabled />
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>4. Publishing target</Label>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {publishingTargetCards.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setTargetType(option.value)}
                                            disabled={isFormLocked}
                                            aria-pressed={targetType === option.value}
                                            className={[
                                                "rounded-xl border p-4 text-left transition-all duration-200",
                                                isFormLocked ? "cursor-not-allowed opacity-60" : "",
                                                targetType === option.value
                                                    ? "border-primary/35 bg-primary/10 ring-2 ring-primary/15"
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
                                    "rounded-xl border px-4 py-3 text-sm leading-6",
                                    targetType === "webhook" && !workspaceWebhookReady
                                        ? "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                                        : "border-border/60 bg-background/45 text-muted-foreground",
                                ].join(" ")}
                            >
                                {targetConfigurationNote}
                            </div>

                            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3.5 sm:px-5">
                                <button
                                    type="button"
                                    onClick={() => setShowEditorialDefaults((current) => !current)}
                                    className="flex w-full flex-col gap-2.5 text-left sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <p className="text-sm font-semibold text-foreground">Editorial direction</p>
                                    <div className="flex flex-wrap gap-2">
                                        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">Audience: Will be inferred</div>
                                        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">Tone: Will be inferred</div>
                                        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">CTA: Will be inferred</div>
                                    </div>
                                </button>

                                {showEditorialDefaults ? (
                                    <div className="mt-4 border-t border-border/60 pt-4 text-sm leading-6 text-muted-foreground">
                                        AI Blogger now decides audience, tone, and CTA inside the existing Brief Pack step using your source input, website intelligence, SERP intent, grounded research, and business-fit analysis.
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {formMode === "ai" ? (
                            <div className="rounded-xl border border-border/60 bg-background/40">
                                <button
                                    type="button"
                                    onClick={() => setShowPipelinePlan((v) => !v)}
                                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-background/60"
                                >
                                    <div>
                                        <p className="text-sm font-semibold">Review pipeline plan</p>
                                        <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                                            {strategyResearchStack.map((item) => (
                                                <span key={item} className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground">
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
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
                                                                "rounded-xl border p-3.5 transition-all",
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
                                                <div className="rounded-xl border border-border/60 bg-background/55 p-3.5">
                                                    <p className="text-xs font-medium text-muted-foreground">Topic source</p>
                                                    <p className="mt-1 text-sm font-semibold">{strategySourceSummary}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {strategySettingBadges.map((badge) => (
                                                        <div key={badge} className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">{badge}</div>
                                                    ))}
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-xl border border-border/60 bg-background/55 p-3">
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold"><BarChart3 className="h-3.5 w-3.5 text-primary" />SEO rules</div>
                                                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{strategySeoSummary}</p>
                                                    </div>
                                                    <div className="rounded-xl border border-border/60 bg-background/55 p-3">
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
                            <div className="space-y-4 rounded-xl border border-border/60 bg-background/40 p-4 sm:p-5">
                                <h3 className="text-lg font-semibold">Write the first version</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="ai-blogger-excerpt">Excerpt</Label>
                                    <Textarea
                                        id="ai-blogger-excerpt"
                                        value={excerpt}
                                        onChange={(event) => setExcerpt(event.target.value)}
                                        placeholder="Short summary for the editorial queue"
                                        className="min-h-[96px] rounded-xl border-border/60 bg-background/60"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ai-blogger-content">Manual draft body</Label>
                                    <Textarea
                                        id="ai-blogger-content"
                                        value={content}
                                        onChange={(event) => setContent(event.target.value)}
                                        placeholder="Write the first pass yourself, then save it into the editorial queue."
                                        className="min-h-[220px] rounded-xl border-border/60 bg-background/60"
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
                                            className="min-h-[120px] rounded-xl border-border/60 bg-background/60"
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
                                            className="min-h-[120px] rounded-xl border-border/60 bg-background/60"
                                        />
                                        <p className="text-xs text-muted-foreground">Use one line per section.</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </AIBloggerGlassCard>

                </div>

                <AIBloggerGlassCard className="overflow-hidden border-primary/20 bg-card p-4 sm:p-6 xl:sticky xl:top-24">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold">Create the draft</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {formMode === "ai"
                                    ? "AI will research, write, and send the draft to review."
                                    : "Save your manual version into the editorial queue."}
                            </p>
                        </div>

                        <dl className="space-y-3">
                            <div className="rounded-xl border border-border/60 bg-background/45 p-3">
                                <dt className="text-xs font-medium text-muted-foreground">Mode</dt>
                                <dd className="mt-1 text-sm font-semibold">{formMode === "ai" ? "AI draft" : "Manual draft"}</dd>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background/45 p-3">
                                <dt className="text-xs font-medium text-muted-foreground">{selectedSourceModeLabel}</dt>
                                <dd className="mt-1 break-words text-sm font-semibold">{selectedSourceSummary}</dd>
                            </div>
                            {compactPrimaryKeyword ? (
                                <div className="rounded-xl border border-border/60 bg-background/45 p-3">
                                    <dt className="text-xs font-medium text-muted-foreground">Primary keyword</dt>
                                    <dd className="mt-1 break-words text-sm font-semibold">{compactPrimaryKeyword}</dd>
                                </div>
                            ) : null}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-border/60 bg-background/45 p-3">
                                    <dt className="text-xs font-medium text-muted-foreground">Word target</dt>
                                    <dd className="mt-1 text-sm font-semibold">{selectedWordTarget} words</dd>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-background/45 p-3">
                                    <dt className="text-xs font-medium text-muted-foreground">Handoff</dt>
                                    <dd className="mt-1 text-sm font-semibold">{targetType === "webhook" ? "Webhook" : "Manual"}</dd>
                                </div>
                            </div>
                        </dl>

                        {error ? (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                                {error}
                            </div>
                        ) : null}

                        <AIBloggerGradientButton
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={submitBusy}
                        >
                            {formMode === "manual" ? (
                                (isManualSubmitting || isPending) && actionMode === "manual" ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Creating Manual Draft...
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
                                    Generating Blog...
                                </>
                                ) : (
                                    <>
                                        <WandSparkles className="h-5 w-5" />
                                        Generate Draft With AI
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                        </AIBloggerGradientButton>

                        <p className="text-xs leading-5 text-muted-foreground">
                            The draft opens in the editorial queue after creation so it can be reviewed before publishing.
                        </p>
                    </div>
                </AIBloggerGlassCard>
            </form>

            {/* Workflow progress - full-width card that slides in when generation starts */}
            {pipelineVisible && formMode === "ai" ? (
                <AIBloggerGlassCard className="overflow-hidden p-4 sm:p-6">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-base font-semibold">Generation Workflow</p>
                                <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                                    {pipelineStatus === "running"
                                        ? `${Object.values(pipelineSteps).filter((s) => s === "completed").length} of ${AI_PIPELINE_STEPS.length} stages completed`
                                        : pipelineStatus === "success"
                                            ? pipelineCompletionMessage || "All stages completed."
                                            : "Workflow stopped before the draft was completed."}
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
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Run Setup</p>
                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                    <div><span className="font-medium text-foreground">Source:</span> {sourceMode === "website" ? "Website" : sourceMode === "trending" ? "Trend Assisted" : "Keywords"} | {compactSourceSummary}</div>
                                    <div><span className="font-medium text-foreground">Word target:</span> {selectedWordTarget} words {compactPrimaryKeyword && `| Keyword: ${compactPrimaryKeyword}`}</div>
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
                            {pipelineStatus === "failed" && `Generation failed. ${pipelineLogs.find((l) => l.level === "error")?.message || "Check the workflow timeline for details."}`}
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
                                                {errorType ? `${errorType.charAt(0).toUpperCase() + errorType.slice(1).replace(/-/g, " ")} Error` : "Workflow Failed"}
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
                                const statusText = getPipelineStepStatusText(step.key, state, pipelineStepNotes[step.key]);
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
                                            <p className={`mt-0.5 text-xs leading-5 ${isFailed ? "text-destructive/60 font-medium" : "text-muted-foreground"}`}>
                                                {statusText}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {pipelineLogs.length > 0 ? (
                            <div className="rounded-2xl border border-border/60 bg-background/65 p-4">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        Workflow Timeline ({pipelineLogs.length} updates)
                                    </p>
                                    <button
                                        onClick={() => {
                                            const logText = pipelineLogs
                                                .map((l) => `[${l.timestamp}] ${l.label}: ${l.message}`)
                                                .join("\n");
                                            navigator.clipboard.writeText(`AI Blogger Workflow Timeline\n${logText}`);
                                            toast.success("Workflow timeline copied");
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        title="Copy workflow timeline"
                                    >
                                        Copy timeline
                                    </button>
                                </div>
                                <div
                                    ref={logScrollRef}
                                    className="max-h-72 space-y-1.5 overflow-y-auto pr-1 text-xs"
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
                                                    "mt-0.5 text-xs leading-5 text-muted-foreground",
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
