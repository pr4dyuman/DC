import type { BlogStudioTargetType } from "@/lib/types-ai-blogger";

const BLOG_STUDIO_TARGET_TYPE_ALIASES: Record<BlogStudioTargetType, string[]> = {
    webhook: ["webhook", "dc-marketing-blog"],
    "manual-export": ["manual-export", "agency-blog"],
};

const BLOG_STUDIO_LEGACY_TARGET_TYPE_MAP = BLOG_STUDIO_TARGET_TYPE_ALIASES.webhook
    .concat(BLOG_STUDIO_TARGET_TYPE_ALIASES["manual-export"])
    .reduce<Record<string, BlogStudioTargetType>>((accumulator, value) => {
        if (value === "dc-marketing-blog") {
            accumulator[value] = "webhook";
        } else if (value === "agency-blog") {
            accumulator[value] = "manual-export";
        } else {
            accumulator[value] = value as BlogStudioTargetType;
        }

        return accumulator;
    }, {});

export function normalizeBlogStudioTargetType(
    value: string | null | undefined,
    fallback: BlogStudioTargetType = "manual-export",
): BlogStudioTargetType {
    const normalized = value?.trim().toLowerCase() || "";
    return BLOG_STUDIO_LEGACY_TARGET_TYPE_MAP[normalized] || fallback;
}

export function resolveBlogStudioTargetType(
    value: string | null | undefined,
): BlogStudioTargetType | null {
    const normalized = value?.trim().toLowerCase() || "";
    return BLOG_STUDIO_LEGACY_TARGET_TYPE_MAP[normalized] || null;
}

export function getBlogStudioTargetTypeAliases(type: BlogStudioTargetType) {
    return BLOG_STUDIO_TARGET_TYPE_ALIASES[type];
}
