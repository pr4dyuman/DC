"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Edit3, Search, Image as ImageIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type PostTab = "write" | "seo" | "assets" | "settings";

export type PostTabHealthSignals = {
    seoScore: number;
    blockersCount: number;
    hasFeaturedImage: boolean;
    hasMetaDescription: boolean;
    hasContent: boolean;
};

function getTabHealthDot(
    tab: PostTab,
    signals: PostTabHealthSignals,
): "green" | "amber" | "red" | null {
    if (tab === "write") {
        if (!signals.hasContent) return "amber";
        return null;
    }
    if (tab === "seo") {
        if (signals.blockersCount > 0) return "red";
        if (!signals.hasMetaDescription) return "amber";
        if (signals.seoScore >= 75) return "green";
        return "amber";
    }
    if (tab === "assets") {
        if (!signals.hasFeaturedImage) return "amber";
        return null;
    }
    return null;
}

const TABS: { key: PostTab; label: string; icon: React.ReactNode; description: string }[] = [
    { key: "write", label: "Write", icon: <Edit3 className="h-4 w-4" />, description: "Draft content, excerpt, tags" },
    { key: "seo", label: "SEO & Meta", icon: <Search className="h-4 w-4" />, description: "Meta fields, keywords, links" },
    { key: "assets", label: "Assets & Brief", icon: <ImageIcon className="h-4 w-4" />, description: "Image, research, AI packs" },
    { key: "settings", label: "Settings", icon: <Settings className="h-4 w-4" />, description: "Brief overrides, cluster, schema" },
];

export function getActiveTab(searchParams: URLSearchParams): PostTab {
    const raw = searchParams.get("tab");
    if (raw === "seo" || raw === "assets" || raw === "settings") return raw;
    return "write";
}

export function PostTabNav({
    activeTab,
    healthSignals,
}: {
    activeTab: PostTab;
    healthSignals?: PostTabHealthSignals;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const setTab = useCallback(
        (tab: PostTab) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", tab);
            router.push(`?${params.toString()}`, { scroll: false });
        },
        [router, searchParams],
    );

    return (
        <div className="flex overflow-x-auto rounded-[28px] border border-border/60 bg-background/40 p-1.5 gap-1 no-scrollbar">
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const dot = healthSignals ? getTabHealthDot(tab.key, healthSignals) : null;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setTab(tab.key)}
                        className={cn(
                            "relative flex items-center gap-2 whitespace-nowrap rounded-[22px] px-4 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                        {/* Health dot */}
                        {dot && !isActive && (
                            <span
                                className={cn(
                                    "absolute right-2 top-2 h-2 w-2 rounded-full border border-background",
                                    dot === "green" && "bg-emerald-500",
                                    dot === "amber" && "bg-amber-400",
                                    dot === "red" && "bg-destructive",
                                )}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
