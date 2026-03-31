import type { AIBloggerConfig, AIBloggerStageConfig, AIBloggerStageKey, AIConfig } from "@/lib/types";
import {
    Globe,
    Search,
    BarChart3,
    FileText,
    Image as ImageIcon,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

/* ── Shared types ────────────────────────────────────────────────── */

export type StageOpenState = Record<AIBloggerStageKey, boolean>;
export type KeyVisibilityState = Record<string, boolean>;
export type AIBloggerPresetKey = "basic" | "seo-strong" | "best-possible";

export interface ConfigSectionProps {
    config: AIBloggerConfig;
    setConfig: Dispatch<SetStateAction<AIBloggerConfig>>;
    visibleKeys: KeyVisibilityState;
    toggleKeyVisibility: (key: string) => void;
}

/* ── Constants ───────────────────────────────────────────────────── */

export const INITIAL_OPEN_STATE: StageOpenState = {
    extractKeywords: true,
    research: false,
    seoAnalysis: false,
    writeBlog: false,
    generateImage: false,
};

export const STAGE_VISUALS: Record<
    AIBloggerStageKey,
    {
        icon: typeof Globe;
        iconColor: string;
        iconBg: string;
        borderColor: string;
        overviewClassName: string;
        shortLabel: string;
    }
> = {
    extractKeywords: {
        icon: Globe,
        iconColor: "text-orange-400",
        iconBg: "bg-orange-500/15",
        borderColor: "border-orange-500/25",
        overviewClassName: "bg-orange-500/15 text-orange-300 border-orange-500/25",
        shortLabel: "Keywords",
    },
    research: {
        icon: Search,
        iconColor: "text-sky-400",
        iconBg: "bg-sky-500/15",
        borderColor: "border-sky-500/25",
        overviewClassName: "bg-sky-500/15 text-sky-300 border-sky-500/25",
        shortLabel: "Research",
    },
    seoAnalysis: {
        icon: BarChart3,
        iconColor: "text-violet-400",
        iconBg: "bg-violet-500/15",
        borderColor: "border-violet-500/25",
        overviewClassName: "bg-violet-500/15 text-violet-300 border-violet-500/25",
        shortLabel: "SEO",
    },
    writeBlog: {
        icon: FileText,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-500/15",
        borderColor: "border-emerald-500/25",
        overviewClassName: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
        shortLabel: "Blog",
    },
    generateImage: {
        icon: ImageIcon,
        iconColor: "text-pink-400",
        iconBg: "bg-pink-500/15",
        borderColor: "border-pink-500/25",
        overviewClassName: "bg-pink-500/15 text-pink-300 border-pink-500/25",
        shortLabel: "Image",
    },
};

export const RESET_PROMPT_LABEL = "Reset to default";

export const AI_BLOGGER_PRESET_META: Record<
    AIBloggerPresetKey,
    {
        label: string;
        description: string;
    }
> = {
    basic: {
        label: "Basic",
        description: "Fast drafting with lighter SEO requirements and fewer external dependencies.",
    },
    "seo-strong": {
        label: "SEO Strong",
        description: "Balanced agency setup with SERP, grounded research, and stricter publish quality rules.",
    },
    "best-possible": {
        label: "Best Possible",
        description: "Turns on the strongest SEO stack and the strictest quality controls for serious content operations.",
    },
};

/* ── Helper functions ────────────────────────────────────────────── */

export function listToTextarea(value: string[]) {
    return value.join("\n");
}

export function textareaToList(value: string) {
    return Array.from(
        new Set(
            value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    );
}

export function formatResolvedModel(config: Pick<AIBloggerStageConfig, "model" | "customModelId">) {
    if (config.model === "custom" && config.customModelId?.trim()) {
        return config.customModelId.trim();
    }

    return config.model;
}

export function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

export function getStageConfigStatus(stageConfig: AIBloggerStageConfig, baseAiConfig: AIConfig | null) {
    const inheritsBaseKey =
        !stageConfig.apiKey &&
        !!baseAiConfig &&
        stageConfig.provider === (baseAiConfig.heavyTasksConfig?.provider || baseAiConfig.provider);

    if (stageConfig.apiKey) {
        return {
            label: "Configured",
            badgeClassName: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
        };
    }

    if (inheritsBaseKey) {
        return {
            label: "Inherited",
            badgeClassName: "bg-sky-500/15 text-sky-300 border-sky-500/25",
        };
    }

    return {
        label: "Not set",
        badgeClassName: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    };
}
