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

/** ISO 3166-1 alpha-2 codes supported by SerpAPI's `geo` parameter.
 * Use code "__global__" in the UI — it maps to empty string for the API (worldwide results). */
export const SERPAPI_GEO_COUNTRIES: { code: string; name: string }[] = [
    { code: "__global__", name: "🌐 Global (Worldwide)" },
    { code: "af", name: "Afghanistan" },
    { code: "al", name: "Albania" },
    { code: "dz", name: "Algeria" },
    { code: "ar", name: "Argentina" },
    { code: "am", name: "Armenia" },
    { code: "au", name: "Australia" },
    { code: "at", name: "Austria" },
    { code: "az", name: "Azerbaijan" },
    { code: "bh", name: "Bahrain" },
    { code: "bd", name: "Bangladesh" },
    { code: "by", name: "Belarus" },
    { code: "be", name: "Belgium" },
    { code: "bo", name: "Bolivia" },
    { code: "ba", name: "Bosnia and Herzegovina" },
    { code: "br", name: "Brazil" },
    { code: "bn", name: "Brunei" },
    { code: "bg", name: "Bulgaria" },
    { code: "kh", name: "Cambodia" },
    { code: "cm", name: "Cameroon" },
    { code: "ca", name: "Canada" },
    { code: "cl", name: "Chile" },
    { code: "cn", name: "China" },
    { code: "co", name: "Colombia" },
    { code: "cr", name: "Costa Rica" },
    { code: "hr", name: "Croatia" },
    { code: "cu", name: "Cuba" },
    { code: "cy", name: "Cyprus" },
    { code: "cz", name: "Czechia" },
    { code: "dk", name: "Denmark" },
    { code: "do", name: "Dominican Republic" },
    { code: "ec", name: "Ecuador" },
    { code: "eg", name: "Egypt" },
    { code: "sv", name: "El Salvador" },
    { code: "ee", name: "Estonia" },
    { code: "et", name: "Ethiopia" },
    { code: "fi", name: "Finland" },
    { code: "fr", name: "France" },
    { code: "ge", name: "Georgia" },
    { code: "de", name: "Germany" },
    { code: "gh", name: "Ghana" },
    { code: "gr", name: "Greece" },
    { code: "gt", name: "Guatemala" },
    { code: "hn", name: "Honduras" },
    { code: "hk", name: "Hong Kong" },
    { code: "hu", name: "Hungary" },
    { code: "is", name: "Iceland" },
    { code: "in", name: "India" },
    { code: "id", name: "Indonesia" },
    { code: "ir", name: "Iran" },
    { code: "iq", name: "Iraq" },
    { code: "ie", name: "Ireland" },
    { code: "il", name: "Israel" },
    { code: "it", name: "Italy" },
    { code: "jm", name: "Jamaica" },
    { code: "jp", name: "Japan" },
    { code: "jo", name: "Jordan" },
    { code: "kz", name: "Kazakhstan" },
    { code: "ke", name: "Kenya" },
    { code: "kw", name: "Kuwait" },
    { code: "kg", name: "Kyrgyzstan" },
    { code: "la", name: "Laos" },
    { code: "lv", name: "Latvia" },
    { code: "lb", name: "Lebanon" },
    { code: "ly", name: "Libya" },
    { code: "lt", name: "Lithuania" },
    { code: "lu", name: "Luxembourg" },
    { code: "mo", name: "Macao" },
    { code: "my", name: "Malaysia" },
    { code: "mt", name: "Malta" },
    { code: "mx", name: "Mexico" },
    { code: "md", name: "Moldova" },
    { code: "mn", name: "Mongolia" },
    { code: "me", name: "Montenegro" },
    { code: "ma", name: "Morocco" },
    { code: "mm", name: "Myanmar" },
    { code: "np", name: "Nepal" },
    { code: "nl", name: "Netherlands" },
    { code: "nz", name: "New Zealand" },
    { code: "ni", name: "Nicaragua" },
    { code: "ng", name: "Nigeria" },
    { code: "mk", name: "North Macedonia" },
    { code: "no", name: "Norway" },
    { code: "om", name: "Oman" },
    { code: "pk", name: "Pakistan" },
    { code: "pa", name: "Panama" },
    { code: "py", name: "Paraguay" },
    { code: "pe", name: "Peru" },
    { code: "ph", name: "Philippines" },
    { code: "pl", name: "Poland" },
    { code: "pt", name: "Portugal" },
    { code: "pr", name: "Puerto Rico" },
    { code: "qa", name: "Qatar" },
    { code: "ro", name: "Romania" },
    { code: "ru", name: "Russia" },
    { code: "sa", name: "Saudi Arabia" },
    { code: "sn", name: "Senegal" },
    { code: "rs", name: "Serbia" },
    { code: "sg", name: "Singapore" },
    { code: "sk", name: "Slovakia" },
    { code: "si", name: "Slovenia" },
    { code: "za", name: "South Africa" },
    { code: "kr", name: "South Korea" },
    { code: "es", name: "Spain" },
    { code: "lk", name: "Sri Lanka" },
    { code: "se", name: "Sweden" },
    { code: "ch", name: "Switzerland" },
    { code: "tw", name: "Taiwan" },
    { code: "tj", name: "Tajikistan" },
    { code: "tz", name: "Tanzania" },
    { code: "th", name: "Thailand" },
    { code: "tn", name: "Tunisia" },
    { code: "tr", name: "Turkey" },
    { code: "tm", name: "Turkmenistan" },
    { code: "ug", name: "Uganda" },
    { code: "ua", name: "Ukraine" },
    { code: "ae", name: "United Arab Emirates" },
    { code: "gb", name: "United Kingdom" },
    { code: "us", name: "United States" },
    { code: "uy", name: "Uruguay" },
    { code: "uz", name: "Uzbekistan" },
    { code: "ve", name: "Venezuela" },
    { code: "vn", name: "Vietnam" },
    { code: "ye", name: "Yemen" },
    { code: "zm", name: "Zambia" },
    { code: "zw", name: "Zimbabwe" },
];

/** Convert a stored API location value ("" or country code) to a Select item value. */
export function locationToSelectValue(location: string): string {
    return location === "" ? "__global__" : location;
}

/** Convert a Select item value back to an API location value ("" for global, code otherwise). */
export function locationFromSelectValue(value: string): string {
    return value === "__global__" ? "" : value;
}

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
