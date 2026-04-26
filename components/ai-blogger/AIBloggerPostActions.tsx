"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, FileJson, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AIBloggerGradientButton } from "@/components/ai-blogger/AIBloggerPrimitives";
import { refreshBlogStudioPostFromPerformance } from "@/lib/actions";

const REFRESH_ACTION_LOCK_MS = 2500;

type AIBloggerPostActionsProps = {
    slug?: string;
    title: string;
    content?: string;
    excerpt?: string;
    metaTitle?: string;
    metaDescription?: string;
    performanceRefreshReady?: boolean;
};

function getMarkdownFilename(title: string) {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${base || "ai-blogger-post"}.md`;
}

export function AIBloggerPostActions({
    slug,
    title,
    content,
    excerpt,
    metaTitle,
    metaDescription,
    performanceRefreshReady = false,
}: AIBloggerPostActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const exportBody = content?.trim() ? content : `# ${title}\n`;
    const refreshBusy = isRefreshing || isPending;

    const handleCopyBody = async () => {
        try {
            await navigator.clipboard.writeText(exportBody);
            toast.success("Draft body copied");
        } catch (error) {
            console.error(error);
            toast.error("Unable to copy this draft body");
        }
    };

    const handleCopyFullPack = async () => {
        try {
            const pack = [
                `Title: ${title}`,
                `Excerpt: ${excerpt || "None"}`,
                `Meta Title: ${metaTitle || title}`,
                `Meta Description: ${metaDescription || excerpt || "None"}`,
                "",
                "--- CONTENT ---",
                "",
                exportBody,
            ].join("\n");
            await navigator.clipboard.writeText(pack);
            toast.success("Full draft pack copied");
        } catch (error) {
            console.error(error);
            toast.error("Unable to copy this draft pack");
        }
    };

    const handleCopyMetadata = async () => {
        try {
            const meta = [
                `Title: ${title}`,
                `Excerpt: ${excerpt || "None"}`,
                `Meta Title: ${metaTitle || title}`,
                `Meta Description: ${metaDescription || excerpt || "None"}`,
            ].join("\n");
            await navigator.clipboard.writeText(meta);
            toast.success("Metadata copied");
        } catch (error) {
            console.error(error);
            toast.error("Unable to copy metadata");
        }
    };

    const handleExport = () => {
        try {
            const blob = new Blob([exportBody], { type: "text/markdown;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = getMarkdownFilename(title);
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Markdown exported");
        } catch (error) {
            console.error(error);
            toast.error("Unable to export this draft");
        }
    };

    const handleRefreshFromPerformance = () => {
        if (refreshBusy) {
            return;
        }

        if (!slug) {
            toast.error("This post cannot run the refresh workflow right now");
            return;
        }

        setIsRefreshing(true);
        startTransition(async () => {
            let waitingForRefresh = false;
            try {
                const refreshed = await refreshBlogStudioPostFromPerformance(slug);
                toast.success(`Refresh draft ready: ${refreshed.title}`);
                waitingForRefresh = true;
                router.refresh();
            } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : "Unable to refresh this post");
                setIsRefreshing(false);
            } finally {
                if (waitingForRefresh) {
                    window.setTimeout(() => setIsRefreshing(false), REFRESH_ACTION_LOCK_MS);
                } else {
                    setIsRefreshing(false);
                }
            }
        });
    };

    return (
        <div className="flex flex-wrap gap-3">
            {performanceRefreshReady ? (
                <AIBloggerGradientButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshFromPerformance}
                    disabled={refreshBusy}
                >
                    {refreshBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                    Refresh From Performance
                </AIBloggerGradientButton>
            ) : null}
            <AIBloggerGradientButton type="button" variant="outline" size="sm" onClick={handleCopyBody}>
                <FileText className="h-4 w-4" />
                Copy Body
            </AIBloggerGradientButton>
            <AIBloggerGradientButton type="button" variant="outline" size="sm" onClick={handleCopyMetadata}>
                <FileJson className="h-4 w-4" />
                Copy Meta
            </AIBloggerGradientButton>
            <AIBloggerGradientButton type="button" variant="outline" size="sm" onClick={handleCopyFullPack}>
                <Copy className="h-4 w-4" />
                Copy Full Pack
            </AIBloggerGradientButton>
            <AIBloggerGradientButton type="button" variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export Markdown
            </AIBloggerGradientButton>
        </div>
    );
}
