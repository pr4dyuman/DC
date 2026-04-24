"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink, ImagePlus, Link2, Loader2, Save, Search, Sparkles, Trash2, UploadCloud, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
    generateBlogStudioFeaturedImage,
    updateBlogStudioPost,
} from "@/lib/actions";
import {
    countInternalLinks,
    extractInternalLinkTargets,
    normalizeInternalLinkHref,
} from "@/lib/ai-blogger-internal-link-utils";
import type {
    BlogStudioInternalLinkPlacement,
    BlogStudioInternalLinkSuggestion,
    BlogStudioPost,
    BlogStudioPostInternalLink,
    BlogStudioSettings,
    BlogStudioTargetType,
} from "@/lib/types";
import {
    AIBloggerGradientButton,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { publishAIBloggerWordCount } from "@/components/ai-blogger/AIBloggerLiveWordCount";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

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

function countWords(value: string) {
    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

function normalizeText(value?: string) {
    return value?.trim().toLowerCase() || "";
}

function includesKeyword(value: string, keyword: string) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) {
        return false;
    }

    return normalizeText(value).includes(normalizedKeyword);
}

function humanizeInternalLinkRelation(value: string) {
    return value
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

function resolveEditorSiteUrl(post: BlogStudioPost) {
    const candidates = [
        post.canonicalUrl,
        post.brief.sourceMode === "website" ? post.brief.sourceValue : post.brief.targetWebsiteUrl,
    ];

    for (const candidate of candidates) {
        const value = candidate?.trim();
        if (!value) {
            continue;
        }

        try {
            return new URL(value).origin;
        } catch {
            continue;
        }
    }

    return undefined;
}

const INTERNAL_LINK_PLACEMENTS: Array<{
    value: BlogStudioInternalLinkPlacement;
    label: string;
}> = [
    { value: "introduction", label: "Introduction" },
    { value: "body", label: "Body" },
    { value: "faq", label: "FAQ" },
    { value: "conclusion", label: "Conclusion" },
];

function buildAcceptedInternalLink(
    suggestion: BlogStudioInternalLinkSuggestion,
): BlogStudioPostInternalLink {
    return {
        href: suggestion.href,
        title: suggestion.title,
        source: suggestion.source,
        anchorText: suggestion.suggestedAnchor,
        relationType: suggestion.relationType,
        score: suggestion.score,
        matchReason: suggestion.matchReason,
        clusterAligned: suggestion.clusterAligned,
        suggestedSectionHeading: suggestion.suggestedSectionHeading,
        targetPostSlug: suggestion.targetPostSlug,
        targetClusterId: suggestion.targetClusterId,
        targetParentTopicSlug: suggestion.targetParentTopicSlug,
        placement: suggestion.suggestedSectionHeading ? "body" : undefined,
    };
}

const MAX_FEATURED_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FEATURED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

function validateFeaturedImageFile(file: File) {
    if (!ALLOWED_FEATURED_IMAGE_TYPES.has(file.type)) {
        throw new Error("Use a JPG, PNG, GIF, or WebP image for the featured asset.");
    }

    if (file.size > MAX_FEATURED_IMAGE_BYTES) {
        throw new Error("Featured images must be 10MB or smaller.");
    }
}

async function uploadFeaturedImageFile(
    file: File,
    onProgress: (value: number) => void,
) {
    const formData = new FormData();
    formData.append("file", file);

    return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) {
                return;
            }

            onProgress(Math.round((event.loaded / event.total) * 100));
        });

        xhr.addEventListener("load", () => {
            try {
                const payload = JSON.parse(xhr.responseText) as {
                    success?: boolean;
                    url?: string;
                    error?: string;
                };

                if (xhr.status >= 200 && xhr.status < 300 && payload.success && payload.url) {
                    resolve(payload.url);
                    return;
                }

                reject(new Error(payload.error || "Image upload failed."));
            } catch {
                reject(new Error("Image upload failed."));
            }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error while uploading the featured image.")));
        xhr.addEventListener("abort", () => reject(new Error("Featured image upload was cancelled.")));
        xhr.addEventListener("timeout", () => reject(new Error("Featured image upload timed out.")));

        xhr.open("POST", "/api/upload-dc");
        xhr.timeout = 120000;
        xhr.send(formData);
    });
}

export function AIBloggerPostEditorForm({
    post,
    settings,
    internalLinkSuggestions = [],
    activeTab = "write",
}: {
    post: BlogStudioPost;
    settings: BlogStudioSettings;
    internalLinkSuggestions?: BlogStudioInternalLinkSuggestion[];
    activeTab?: "write" | "seo" | "assets" | "settings";
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isImageActionPending, startImageActionTransition] = useTransition();
    const [error, setError] = useState("");
    const [title, setTitle] = useState(post.title);
    const [excerpt, setExcerpt] = useState(post.excerpt);
    const [metaTitle, setMetaTitle] = useState(post.metaTitle || post.title);
    const [metaDescription, setMetaDescription] = useState(post.metaDescription || post.excerpt);
    const [canonicalUrl, setCanonicalUrl] = useState(post.canonicalUrl || "");
    const [featuredImageAlt, setFeaturedImageAlt] = useState(post.featuredImageAlt || post.title);
    const [featuredImageUrl, setFeaturedImageUrl] = useState(post.featuredImageUrl || "");
    const [featuredImageSource, setFeaturedImageSource] = useState(post.featuredImageSource);
    const [content, setContent] = useState(post.content || "");
    const [primaryKeyword, setPrimaryKeyword] = useState(post.brief.primaryKeyword || "");
    const [trendFocus, setTrendFocus] = useState(post.brief.trendFocus || "");
    const [audience, setAudience] = useState(post.brief.audience || "");
    const [tone, setTone] = useState(post.brief.tone || "");
    const [cta, setCta] = useState(post.brief.cta || "");
    const [language, setLanguage] = useState(post.brief.language || settings.seo.defaultLanguage);
    const [location, setLocation] = useState(post.brief.location || settings.seo.defaultLocation);
    const [targetType, setTargetType] = useState<BlogStudioTargetType>(post.target.type);
    const [targetLabel, setTargetLabel] = useState(post.target.label);
    const [contentClusterId, setContentClusterId] = useState(post.contentClusterId || "");
    const [parentTopicSlug, setParentTopicSlug] = useState(post.parentTopicSlug || "");
    const [tagsText, setTagsText] = useState(post.tags.join(", "));
    const [outlineText, setOutlineText] = useState(post.outline.join("\n"));
    const [acceptedInternalLinks, setAcceptedInternalLinks] = useState<BlogStudioPostInternalLink[]>(post.internalLinks || []);
    const draftBrief = post.draftBrief;
    const faqItems = post.faqItems || [];
    const featuredImagePrompt = post.featuredImagePrompt || "";
    const researchNotes = post.researchNotes || [];
    const externalSources = post.externalSources || [];
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [showBriefOverrides, setShowBriefOverrides] = useState(false);

    const siteUrl = useMemo(() => resolveEditorSiteUrl(post), [post]);
    const liveWordCount = useMemo(() => countWords(content), [content]);
    const keywordOccurrenceCount = useMemo(() => {
        if (!primaryKeyword.trim()) return 0;
        const regex = new RegExp(normalizeText(primaryKeyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        return (content.match(regex) || []).length;
    }, [content, primaryKeyword]);
    const titleLength = title.trim().length;
    const metaTitleLength = metaTitle.trim().length;
    const metaDescriptionLength = metaDescription.trim().length;
    const internalLinkCount = useMemo(() => countInternalLinks(content, siteUrl), [content, siteUrl]);
    const detectedBodyInternalLinkHrefs = useMemo(
        () => new Set(extractInternalLinkTargets(content, siteUrl)),
        [content, siteUrl],
    );
    const acceptedInternalLinkHrefs = useMemo(
        () => new Set(
            acceptedInternalLinks
                .map((link) => normalizeInternalLinkHref(link.href, siteUrl) || link.href),
        ),
        [acceptedInternalLinks, siteUrl],
    );
    const hasPrimaryKeyword = primaryKeyword.trim().length > 0;
    const keywordInTitle = includesKeyword(title, primaryKeyword);
    const keywordInMetaTitle = includesKeyword(metaTitle, primaryKeyword);
    const keywordInMetaDescription = includesKeyword(metaDescription, primaryKeyword);
    const keywordInContent = includesKeyword(content, primaryKeyword);
    const wordCountInRange = liveWordCount >= settings.seo.minWords && liveWordCount <= settings.seo.maxWords;
    const isPublished = post.status === "Published";
    const hasFeaturedImage = featuredImageUrl.trim().length > 0;
    const imageSourceLabel =
        featuredImageSource === "ai-generated"
            ? "AI generated"
            : featuredImageSource === "upload"
                ? "Uploaded"
                : "No asset";
    const imageBusy = isUploadingImage || isImageActionPending;

    useEffect(() => {
        publishAIBloggerWordCount(post.id, liveWordCount);
    }, [liveWordCount, post.id]);

    const toggleAcceptedInternalLink = (suggestion: BlogStudioInternalLinkSuggestion) => {
        const normalizedSuggestionHref = normalizeInternalLinkHref(suggestion.href, siteUrl) || suggestion.href;

        setAcceptedInternalLinks((current) => {
            if (current.some((link) => (normalizeInternalLinkHref(link.href, siteUrl) || link.href) === normalizedSuggestionHref)) {
                return current.filter((link) => (normalizeInternalLinkHref(link.href, siteUrl) || link.href) !== normalizedSuggestionHref);
            }
            return [...current, buildAcceptedInternalLink(suggestion)];
        });
    };

    const updateAcceptedInternalLink = (href: string, changes: Partial<BlogStudioPostInternalLink>) => {
        setAcceptedInternalLinks((current) =>
            current.map((link) => (link.href === href ? { ...link, ...changes } : link)),
        );
    };

    const handleFeaturedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setError("");
        try {
            validateFeaturedImageFile(file);
            setIsUploadingImage(true);
            setUploadProgress(0);
            const uploadedUrl = await uploadFeaturedImageFile(file, setUploadProgress);
            await updateBlogStudioPost(post.slug, {
                featuredImageUrl: uploadedUrl,
                featuredImageSource: "upload",
                featuredImageAlt: featuredImageAlt || title || post.title,
            });
            setFeaturedImageUrl(uploadedUrl);
            setFeaturedImageSource("upload");
            setUploadProgress(100);
            toast.success("Featured image uploaded");
        } catch (uploadError: unknown) {
            const message = uploadError instanceof Error ? uploadError.message : "Failed to upload featured image";
            setError(message);
            toast.error(message);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleGenerateFeaturedImage = () => {
        setError("");
        startImageActionTransition(async () => {
            try {
                const result = await generateBlogStudioFeaturedImage(post.slug);
                setFeaturedImageUrl(result.imageUrl);
                setFeaturedImageSource(result.imageSource);
                setFeaturedImageAlt(result.post.featuredImageAlt || featuredImageAlt || title || post.title);
                toast.success("Featured image generated");
            } catch (generationError: unknown) {
                const message = generationError instanceof Error ? generationError.message : "Failed to generate featured image";
                setError(message);
                toast.error(message);
            }
        });
    };

    const handleRemoveFeaturedImage = () => {
        setError("");
        startImageActionTransition(async () => {
            try {
                await updateBlogStudioPost(post.slug, { featuredImageUrl: "" });
                setFeaturedImageUrl("");
                setFeaturedImageSource(undefined);
                toast.success("Featured image removed");
            } catch (removeError: unknown) {
                const message = removeError instanceof Error ? removeError.message : "Failed to remove featured image";
                setError(message);
                toast.error(message);
            }
        });
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (isPublished) {
            setError("Published posts cannot be edited here yet.");
            return;
        }
        setError("");
        startTransition(async () => {
            try {
                await updateBlogStudioPost(post.slug, {
                    title,
                    excerpt,
                    metaTitle,
                    metaDescription,
                    canonicalUrl,
                    featuredImageAlt,
                    featuredImageUrl,
                    featuredImageSource,
                    content,
                    tags: splitCommaList(tagsText),
                    outline: splitOutlineList(outlineText),
                    brief: {
                        sourceMode: post.brief.sourceMode,
                        sourceValue: post.brief.sourceValue,
                        targetWebsiteUrl: post.brief.targetWebsiteUrl,
                        trendFocus,
                        primaryKeyword,
                        audience,
                        tone,
                        cta,
                        language,
                        location,
                    },
                    target: { type: targetType, label: targetLabel },
                    contentClusterId,
                    parentTopicSlug,
                    internalLinks: acceptedInternalLinks,
                    wordCount: liveWordCount || post.wordCount,
                });
                toast.success("Draft changes saved");
                router.refresh();
            } catch (submitError: unknown) {
                const message = submitError instanceof Error ? submitError.message : "Failed to save the draft";
                setError(message);
                toast.error(message);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Published post warning banner */}
            {isPublished && (
                <div className="relative overflow-hidden rounded-xl border-2 border-amber-500/30 bg-amber-500/8 px-4 py-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-800">Published Post - View Only</h3>
                            <p className="mt-1 text-sm text-amber-700">This post has been published. To make changes, please unpublish it first or create a new version from scratch.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ TAB: WRITE ═══════════════ */}
            {activeTab === "write" && (
                <div className="space-y-6">
                    {/* Title + word count widget */}
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="space-y-2">
                            <Label htmlFor="ai-blogger-post-title">Blog Title</Label>
                            <Input
                                id="ai-blogger-post-title"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                className="h-12 rounded-2xl border-border/60 bg-background/60 text-base"
                                disabled={isPending || isPublished}
                            />
                            <div className="space-y-1.5 px-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span>{titleLength} characters</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`rounded-full border-none bg-background/50 text-[10px] ${titleLength >= 30 && titleLength <= 60 ? "text-emerald-500" : "text-amber-500"}`}>
                                            {titleLength >= 30 && titleLength <= 60 ? "Ideal length" : "Review length"}
                                        </Badge>
                                        {hasPrimaryKeyword ? (
                                            <Badge variant="outline" className={`rounded-full border-none bg-background/50 text-[10px] ${keywordInTitle ? "text-emerald-500" : "text-amber-500"}`}>
                                                {keywordInTitle ? "Keyword present" : "Keyword missing"}
                                            </Badge>
                                        ) : null}
                                    </div>
                                </div>
                                <Progress
                                    value={Math.min((titleLength / 60) * 100, 100)}
                                    className={`h-1.5 ${titleLength > 60 ? "[&>div]:bg-amber-500" : titleLength >= 30 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary/40"}`}
                                />
                            </div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live Word Count</p>
                            <p className="mt-3 text-2xl font-semibold">{liveWordCount || 0}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Target: {settings.seo.minWords}–{settings.seo.maxWords}</p>
                            <div className="mt-3">
                                <Badge variant="outline" className="rounded-full">
                                    {wordCountInRange ? "Within target range" : "Outside target range"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Draft body */}
                    <div className="space-y-2">
                        <Label htmlFor="ai-blogger-post-content">Draft Content</Label>
                        <Textarea
                            id="ai-blogger-post-content"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            className="min-h-[640px] rounded-xl border-border/60 bg-background/60 px-5 py-5 font-mono text-sm leading-7"
                            disabled={isPending || isPublished}
                        />
                        <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
                            <span>{internalLinkCount} internal links detected</span>
                            {hasPrimaryKeyword ? (
                                <Badge variant="outline" className="rounded-full">
                                    {keywordInContent ? "Primary keyword found" : "Primary keyword missing"}
                                </Badge>
                            ) : null}
                            <Badge variant="outline" className="rounded-full">
                                {wordCountInRange ? "Word count on target" : "Word count needs review"}
                            </Badge>
                            {hasPrimaryKeyword && liveWordCount > 0 && keywordOccurrenceCount > 0 ? (
                                <Badge
                                    variant="outline"
                                    className={`rounded-full ${
                                        keywordOccurrenceCount / liveWordCount < 0.005
                                            ? "text-amber-500"
                                            : keywordOccurrenceCount / liveWordCount > 0.025
                                                ? "text-amber-500"
                                                : "text-emerald-500"
                                    }`}
                                    title={`"${primaryKeyword}" appears ${keywordOccurrenceCount}× in ${liveWordCount} words`}
                                >
                                    Keyword {keywordOccurrenceCount}× · ~1 per {Math.round(liveWordCount / keywordOccurrenceCount)} words
                                </Badge>
                            ) : null}
                        </div>
                    </div>

                    {/* Excerpt */}
                    <div className="space-y-2">
                        <Label htmlFor="ai-blogger-post-excerpt">Excerpt</Label>
                        <Textarea
                            id="ai-blogger-post-excerpt"
                            value={excerpt}
                            onChange={(event) => setExcerpt(event.target.value)}
                            className="min-h-[100px] rounded-xl border-border/60 bg-background/60"
                            disabled={isPending || isPublished}
                        />
                        <p className="px-1 text-xs text-muted-foreground">Used in queue previews and as a fallback meta description.</p>
                    </div>

                    {/* Tags + Outline side by side */}
                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="ai-blogger-post-tags">Tags</Label>
                            <Textarea
                                id="ai-blogger-post-tags"
                                value={tagsText}
                                onChange={(event) => setTagsText(event.target.value)}
                                placeholder="SEO, AI Blogging, Content Ops"
                                className="min-h-[120px] rounded-xl border-border/60 bg-background/60"
                                disabled={isPending || isPublished}
                            />
                            <p className="px-1 text-xs text-muted-foreground">Separate tags with commas.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ai-blogger-post-outline">Outline</Label>
                            <Textarea
                                id="ai-blogger-post-outline"
                                value={outlineText}
                                onChange={(event) => setOutlineText(event.target.value)}
                                placeholder={"Intro\nProblem\nFramework\nExamples\nCTA"}
                                className="min-h-[120px] rounded-xl border-border/60 bg-background/60"
                                disabled={isPending || isPublished}
                            />
                            <p className="px-1 text-xs text-muted-foreground">One line per section heading.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ TAB: SEO & META ═══════════════ */}
            {activeTab === "seo" && (
                <div className="space-y-6">
                    {/* Meta title */}
                    <div className="space-y-2">
                        <Label htmlFor="ai-blogger-post-meta-title">Meta Title</Label>
                        <Input
                            id="ai-blogger-post-meta-title"
                            value={metaTitle}
                            onChange={(event) => setMetaTitle(event.target.value)}
                            className="h-12 rounded-2xl border-border/60 bg-background/60"
                            disabled={isPending || isPublished}
                        />
                        <div className="space-y-1.5 px-1">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{metaTitleLength} / 60 characters</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`rounded-full border-none bg-background/50 text-[10px] ${metaTitleLength >= 30 && metaTitleLength <= 60 ? "text-emerald-500" : "text-amber-500"}`}>
                                        {metaTitleLength >= 30 && metaTitleLength <= 60 ? "Ideal length" : "Review length"}
                                    </Badge>
                                    {hasPrimaryKeyword ? (
                                        <Badge variant="outline" className={`rounded-full border-none bg-background/50 text-[10px] ${keywordInMetaTitle ? "text-emerald-500" : "text-amber-500"}`}>
                                            {keywordInMetaTitle ? "Keyword present" : "Keyword missing"}
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                            <Progress
                                value={Math.min((metaTitleLength / 60) * 100, 100)}
                                className={`h-1.5 ${metaTitleLength > 60 ? "[&>div]:bg-amber-500" : metaTitleLength >= 30 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary/40"}`}
                            />
                        </div>
                        <p className="px-1 text-xs text-muted-foreground">Falls back to the blog title if blank. Keep it under 60 characters.</p>
                    </div>

                    {/* Meta description */}
                    <div className="space-y-2">
                        <Label htmlFor="ai-blogger-post-meta-description">Meta Description</Label>
                        <Textarea
                            id="ai-blogger-post-meta-description"
                            value={metaDescription}
                            onChange={(event) => setMetaDescription(event.target.value)}
                            className="min-h-[110px] rounded-xl border-border/60 bg-background/60"
                            disabled={isPending || isPublished}
                        />
                        <div className="space-y-1.5 px-1">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{metaDescriptionLength} / 160 characters</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`rounded-full border-none bg-background/50 text-[10px] ${metaDescriptionLength >= 140 && metaDescriptionLength <= 160 ? "text-emerald-500" : "text-amber-500"}`}>
                                        {metaDescriptionLength >= 140 && metaDescriptionLength <= 160 ? "Ideal length" : "Review length"}
                                    </Badge>
                                    {hasPrimaryKeyword ? (
                                        <Badge variant="outline" className={`rounded-full border-none bg-background/50 text-[10px] ${keywordInMetaDescription ? "text-emerald-500" : "text-amber-500"}`}>
                                            {keywordInMetaDescription ? "Keyword present" : "Keyword missing"}
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                            <Progress
                                value={Math.min((metaDescriptionLength / 160) * 100, 100)}
                                className={`h-1.5 ${metaDescriptionLength > 160 ? "[&>div]:bg-amber-500" : metaDescriptionLength >= 140 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary/40"}`}
                            />
                        </div>
                        <p className="px-1 text-xs text-muted-foreground">Falls back to the excerpt. Aim for 140-160 characters.</p>
                    </div>

                    {/* Alt text + Canonical */}
                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="ai-blogger-post-featured-image-alt">Featured Image Alt Text</Label>
                            <Input
                                id="ai-blogger-post-featured-image-alt"
                                value={featuredImageAlt}
                                onChange={(event) => setFeaturedImageAlt(event.target.value)}
                                className="h-12 rounded-2xl border-border/60 bg-background/60"
                                disabled={isPending || isPublished}
                            />
                            <p className="px-1 text-xs text-muted-foreground">Required when publishing via webhook.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ai-blogger-post-canonical-url">Canonical URL</Label>
                            <Input
                                id="ai-blogger-post-canonical-url"
                                value={canonicalUrl}
                                onChange={(event) => setCanonicalUrl(event.target.value)}
                                placeholder={siteUrl ? `${siteUrl.replace(/\/+$/, "")}/blog/your-post` : "https://your-site.com/blog/your-post"}
                                className="h-12 rounded-2xl border-border/60 bg-background/60"
                                disabled={isPending || isPublished}
                            />
                            <p className="px-1 text-xs text-muted-foreground">Optional. Defaults to the site URL after publish.</p>
                        </div>
                    </div>

                    {/* Live SEO guidance */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <div className="mb-4 flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Live SEO Guidance</h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                { label: "Primary keyword", value: hasPrimaryKeyword ? primaryKeyword.trim() : "Add a keyword target", status: hasPrimaryKeyword ? "Ready" : "Needed" },
                                { label: "Keyword in title", value: keywordInTitle ? "Present" : "Not found", status: keywordInTitle ? "Pass" : "Review" },
                                { label: "Keyword in body", value: keywordInContent ? "Present" : "Not found", status: keywordInContent ? "Pass" : "Review" },
                                {
                                    label: "Internal links",
                                    value: `${internalLinkCount} in copy • ${acceptedInternalLinks.length} mapped`,
                                    status: internalLinkCount >= 2 && acceptedInternalLinks.length >= 2 ? "Strong" : internalLinkCount > 0 || acceptedInternalLinks.length > 0 ? "Add more" : "Missing",
                                },
                            ].map((item) => (
                                <div key={item.label} className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-4">
                                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{item.status}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Internal link suggestions + accepted map */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <div className="mb-4 flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Internal Links</h3>
                            <span className="ml-auto rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">{acceptedInternalLinks.length} accepted</span>
                        </div>
                        <div className="space-y-3">
                            {internalLinkSuggestions.length > 0 ? (
                                internalLinkSuggestions.map((suggestion) => {
                                    const normalizedSuggestionHref = normalizeInternalLinkHref(suggestion.href, siteUrl) || suggestion.href;
                                    const isAcceptedSuggestion = acceptedInternalLinkHrefs.has(normalizedSuggestionHref);
                                    const isDetectedInBody = detectedBodyInternalLinkHrefs.has(normalizedSuggestionHref);

                                    return (
                                    <div key={suggestion.id} className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="rounded-full capitalize">{suggestion.source}</Badge>
                                                    <Badge variant="outline" className="rounded-full">Anchor: {suggestion.suggestedAnchor}</Badge>
                                                    <Badge variant="outline" className="rounded-full">{suggestion.score}/100</Badge>
                                                    <Badge variant="outline" className="rounded-full">{humanizeInternalLinkRelation(suggestion.relationType)}</Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className={`rounded-full ${isDetectedInBody ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border/60 bg-background/40 text-muted-foreground"}`}
                                                    >
                                                        {isDetectedInBody ? "Detected in body" : "Suggestion only"}
                                                    </Badge>
                                                    {isAcceptedSuggestion ? (
                                                        <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
                                                            Tracked
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAcceptedInternalLink(suggestion)}
                                                    disabled={isPending || isPublished}
                                                    className={`inline-flex h-9 items-center rounded-2xl border px-3 text-xs font-medium transition-colors ${isAcceptedSuggestion ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600" : "border-border/60 bg-background/60 text-foreground hover:border-primary/30 hover:text-primary"}`}
                                                >
                                                    {isAcceptedSuggestion ? "Accepted" : "Accept target"}
                                                </button>
                                                <Link href={suggestion.href} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                                    Open <ExternalLink className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{suggestion.description}</p>
                                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{suggestion.matchReason}</p>
                                        {suggestion.suggestedSectionHeading ? (
                                            <p className="mt-2 text-xs leading-5 text-muted-foreground">Suggested section: {suggestion.suggestedSectionHeading}</p>
                                        ) : null}
                                    </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-[20px] border border-dashed border-border/60 bg-background/40 px-4 py-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">No internal link suggestions yet</p>
                                        <p className="text-xs leading-5 text-muted-foreground">Internal links appear here once supporting pages or blog posts are found for your content. This analysis happens automatically as you write.</p>
                                        <p className="text-xs leading-5 text-muted-foreground">Tip: Internal links improve SEO by connecting related content and keeping readers engaged on your site.</p>
                                    </div>
                                </div>
                            )}
                            {acceptedInternalLinks.length > 0 && (
                                <div className="space-y-3 border-t border-border/60 pt-4">
                                    <p className="px-1 text-sm font-semibold text-foreground">Accepted Link Map</p>
                                    {acceptedInternalLinks.map((link) => {
                                        const normalizedLinkHref = normalizeInternalLinkHref(link.href, siteUrl) || link.href;
                                        const isDetectedInBody = detectedBodyInternalLinkHrefs.has(normalizedLinkHref);

                                        return (
                                        <div key={link.href} className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-medium text-foreground">{link.title}</p>
                                                        <Badge variant="outline" className="rounded-full capitalize">{link.source}</Badge>
                                                        <Badge variant="outline" className="rounded-full">{humanizeInternalLinkRelation(link.relationType)}</Badge>
                                                        <Badge
                                                            variant="outline"
                                                            className={`rounded-full ${isDetectedInBody ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-amber-500/30 bg-amber-500/10 text-amber-600"}`}
                                                        >
                                                            {isDetectedInBody ? "In body" : "Not in body"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs leading-5 text-muted-foreground">{link.matchReason}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setAcceptedInternalLinks((cur) => cur.filter((item) => (normalizeInternalLinkHref(item.href, siteUrl) || item.href) !== normalizedLinkHref))}
                                                    disabled={isPending || isPublished}
                                                    className="inline-flex h-9 items-center rounded-2xl border border-border/60 bg-background/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:text-destructive"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`anchor-${link.href}`}>Anchor Text</Label>
                                                    <Input
                                                        id={`anchor-${link.href}`}
                                                        value={link.anchorText}
                                                        onChange={(e) => updateAcceptedInternalLink(link.href, { anchorText: e.target.value })}
                                                        className="h-11 rounded-2xl border-border/60 bg-background/60"
                                                        disabled={isPending || isPublished}
                                                    />
                                                    {link.suggestedSectionHeading ? (
                                                        <p className="text-xs text-muted-foreground">Best section: {link.suggestedSectionHeading}</p>
                                                    ) : null}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Placement</Label>
                                                    {isPending || isPublished ? (
                                                        <div className="flex h-11 items-center rounded-2xl border border-border/60 bg-background/60 px-3 text-sm text-muted-foreground">
                                                            {INTERNAL_LINK_PLACEMENTS.find((p) => p.value === link.placement)?.label || "Not set"}
                                                        </div>
                                                    ) : (
                                                        <Select
                                                            value={link.placement || "unspecified"}
                                                            onValueChange={(value) => updateAcceptedInternalLink(link.href, { placement: value === "unspecified" ? undefined : value as BlogStudioInternalLinkPlacement })}
                                                        >
                                                            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/60">
                                                                <SelectValue placeholder="Where to place it" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="unspecified">Not set</SelectItem>
                                                                {INTERNAL_LINK_PLACEMENTS.map((p) => (
                                                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ TAB: ASSETS & BRIEF ═══════════════ */}
            {activeTab === "assets" && (
                <div className="space-y-6">
                    {/* Featured image */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4 sm:p-5">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={handleFeaturedImageUpload}
                            disabled={isPending || isPublished || imageBusy}
                        />
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Featured Image Asset</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Upload a custom image or generate one from the stored AI prompt.</p>
                                </div>
                                <Badge variant="outline" className="rounded-full">{imageSourceLabel}</Badge>
                            </div>
                            <div className="overflow-hidden rounded-[20px] border border-border/60 bg-background/60">
                                {hasFeaturedImage ? (
                                    <div className="space-y-3 p-3">
                                        <div
                                            className="aspect-video sm:aspect-[16/9] rounded-[18px] bg-cover bg-center bg-no-repeat"
                                            style={{ backgroundImage: `url("${featuredImageUrl.replace(/"/g, "%22")}")` }}
                                        />
                                        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-1">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-foreground">{featuredImageAlt || title || post.title}</p>
                                                <p className="text-xs text-muted-foreground">Source: {imageSourceLabel}</p>
                                            </div>
                                            <Link href={featuredImageUrl} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                                Open Asset <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                                            <ImagePlus className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground">No featured image saved yet</p>
                                            <p className="text-sm text-muted-foreground">Add one so your published post has a real hero asset.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <AIBloggerGradientButton type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isPending || isPublished || imageBusy}>
                                    {isUploadingImage ? (<><Loader2 className="h-4 w-4 animate-spin" />Uploading</>) : (<><UploadCloud className="h-4 w-4" />Upload Image</>)}
                                </AIBloggerGradientButton>
                                <AIBloggerGradientButton type="button" onClick={handleGenerateFeaturedImage} disabled={isPending || isPublished || imageBusy}>
                                    {isImageActionPending ? (<><Loader2 className="h-4 w-4 animate-spin" />Working</>) : (<><Sparkles className="h-4 w-4" />Generate With AI</>)}
                                </AIBloggerGradientButton>
                                {hasFeaturedImage ? (
                                    <AIBloggerGradientButton type="button" variant="ghost" onClick={handleRemoveFeaturedImage} disabled={isPending || isPublished || imageBusy}>
                                        <Trash2 className="h-4 w-4" />Remove Image
                                    </AIBloggerGradientButton>
                                ) : null}
                            </div>
                            {isUploadingImage ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Upload progress</span><span>{uploadProgress}%</span>
                                    </div>
                                    <Progress value={uploadProgress} className="h-1.5" />
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* AI image prompt */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Image Prompt</p>
                        <p className="text-sm leading-6 text-muted-foreground">
                            {featuredImagePrompt || "No image prompt stored for this draft yet."}
                        </p>
                    </div>

                    {/* Brief pack */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="mb-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Brief Pack</p>
                        {draftBrief ? (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {typeof draftBrief.businessFitScore === "number" ? (
                                        <Badge variant="outline" className="rounded-full">Business Fit {draftBrief.businessFitScore}/100</Badge>
                                    ) : null}
                                    {draftBrief.searchIntent ? <Badge variant="outline" className="rounded-full capitalize">{draftBrief.searchIntent}</Badge> : null}
                                    {draftBrief.contentType ? <Badge variant="outline" className="rounded-full capitalize">{draftBrief.contentType}</Badge> : null}
                                </div>
                                {[
                                    ["Business Fit", draftBrief.businessFitSummary],
                                    ["CTA Goal", draftBrief.ctaGoal],
                                    ["Tone Direction", draftBrief.toneDirection],
                                    ["Title Direction", draftBrief.titleDirection],
                                    ["Metadata Direction", draftBrief.metadataDirection],
                                ].map(([label, value]) => value ? (
                                    <div key={String(label)} className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{value}</p>
                                    </div>
                                ) : null)}
                                {draftBrief.entities && draftBrief.entities.length > 0 && (
                                    <div className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Entities</p>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{draftBrief.entities.join(", ")}</p>
                                    </div>
                                )}
                                {draftBrief.businessFitWarnings && draftBrief.businessFitWarnings.length > 0 && (
                                    <div className="space-y-2">
                                        {draftBrief.businessFitWarnings.map((warning) => (
                                            <p key={warning} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm leading-6 text-amber-700 dark:text-amber-300">{warning}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No brief pack has been stored for this draft yet.</p>
                        )}
                    </div>

                    {/* FAQ pack */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="mb-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">FAQ Pack</p>
                        {faqItems.length > 0 ? (
                            <div className="space-y-4">
                                {faqItems.map((item, index) => (
                                    <div key={`${post.id}-faq-${index}`} className="space-y-1 rounded-[20px] border border-border/60 bg-background/60 px-4 py-4">
                                        <p className="text-sm font-medium text-foreground">{item.question}</p>
                                        <p className="text-sm leading-6 text-muted-foreground">{item.answer}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No FAQ pack stored for this draft yet.</p>
                        )}
                    </div>

                    {/* Grounded research */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <div className="mb-4 flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Grounded Research</h3>
                            <span className="ml-auto rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">{externalSources.length} sources</span>
                        </div>
                        <div className="space-y-3">
                            {externalSources.length > 0 ? (
                                externalSources.map((source) => (
                                    <div key={source.id} className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-foreground">{source.title}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="rounded-full capitalize">{source.type}</Badge>
                                                    <Badge variant="outline" className="rounded-full capitalize">Trust: {source.trustLevel}</Badge>
                                                    <Badge variant="outline" className="rounded-full capitalize">{source.freshness}</Badge>
                                                </div>
                                            </div>
                                            <Link href={source.url} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                                Open <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{source.summary}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {source.domain}{source.publishedAt ? ` • ${new Date(source.publishedAt).toLocaleDateString()}` : ""}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-[20px] border border-dashed border-border/60 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                                    No grounded research sources stored for this draft.
                                </div>
                            )}
                            {researchNotes.length > 0 && (
                                <div className="space-y-2 border-t border-border/60 pt-3">
                                    <p className="text-sm font-semibold">Source Notes</p>
                                    {researchNotes.map((note, index) => (
                                        <div key={`${post.id}-note-${index}`} className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-3 text-sm leading-6 text-muted-foreground">{note}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ TAB: SETTINGS ═══════════════ */}
            {activeTab === "settings" && (
                <div className="space-y-6">
                    {/* Publishing target */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="mb-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Publishing Target</p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Target Type</Label>
                                <Select
                                    value={targetType}
                                    onValueChange={(value) => setTargetType(value as BlogStudioTargetType)}
                                >
                                    <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/60">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual-export">Manual Export</SelectItem>
                                        <SelectItem value="webhook">Webhook Publishing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-post-target-label">Target Label</Label>
                                <Input
                                    id="ai-blogger-post-target-label"
                                    value={targetLabel}
                                    onChange={(e) => setTargetLabel(e.target.value)}
                                    className="h-11 rounded-2xl border-border/60 bg-background/60"
                                    disabled={isPending || isPublished}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Brief overrides — collapsible */}
                    <div className="rounded-xl border border-border/60 bg-background/50">
                        <button
                            type="button"
                            onClick={() => setShowBriefOverrides((v) => !v)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-background/40 transition-colors"
                        >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Brief Overrides</p>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="text-[10px]">7 fields</span>
                                {showBriefOverrides ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                        </button>
                        {showBriefOverrides && (
                            <div className="border-t border-border/60 p-4">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {[
                                        { id: "ai-blogger-post-keyword", label: "Primary Keyword", value: primaryKeyword, setter: setPrimaryKeyword },
                                        { id: "ai-blogger-post-trend-focus", label: "Trend Focus", value: trendFocus, setter: setTrendFocus },
                                        { id: "ai-blogger-post-audience", label: "Audience", value: audience, setter: setAudience },
                                        { id: "ai-blogger-post-tone", label: "Tone", value: tone, setter: setTone },
                                        { id: "ai-blogger-post-cta", label: "CTA Style", value: cta, setter: setCta },
                                        { id: "ai-blogger-post-language", label: "Language", value: language, setter: setLanguage },
                                        { id: "ai-blogger-post-location", label: "Location", value: location, setter: setLocation },
                                    ].map(({ id, label, value, setter }) => (
                                        <div key={id} className="space-y-2">
                                            <Label htmlFor={id}>{label}</Label>
                                            <Input
                                                id={id}
                                                value={value}
                                                onChange={(e) => setter(e.target.value)}
                                                className="h-11 rounded-2xl border-border/60 bg-background/60"
                                                disabled={isPending || isPublished}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content cluster */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <p className="mb-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Content Cluster</p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-post-cluster-id">Content Cluster ID</Label>
                                <Input
                                    id="ai-blogger-post-cluster-id"
                                    value={contentClusterId}
                                    onChange={(e) => setContentClusterId(e.target.value)}
                                    placeholder="seo-automation"
                                    className="h-11 rounded-2xl border-border/60 bg-background/60"
                                    disabled={isPending || isPublished}
                                />
                                <p className="px-1 text-xs text-muted-foreground">Use one shared slug for all drafts in the same cluster.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-blogger-post-parent-topic">Parent Topic Slug</Label>
                                <Input
                                    id="ai-blogger-post-parent-topic"
                                    value={parentTopicSlug}
                                    onChange={(e) => setParentTopicSlug(e.target.value)}
                                    placeholder="ai-seo-automation"
                                    className="h-11 rounded-2xl border-border/60 bg-background/60"
                                    disabled={isPending || isPublished}
                                />
                                <p className="px-1 text-xs text-muted-foreground">Set the pillar topic this draft rolls up under.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ SHARED FOOTER ═══════════════ */}
            {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                    {isPublished
                        ? "Published posts are locked to protect the live version."
                        : "Save changes from any tab before advancing the workflow."}
                </p>
                {isPublished ? (
                    <div className="inline-flex h-11 items-center justify-center rounded-lg border border-border/60 bg-muted/40 px-4 text-sm font-medium text-muted-foreground">
                        View-only published post
                    </div>
                ) : (
                    <AIBloggerGradientButton type="submit" disabled={isPending}>
                        {isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />Saving Changes</>
                        ) : (
                            <><Save className="h-4 w-4" />Save Changes</>
                        )}
                    </AIBloggerGradientButton>
                )}
            </div>
        </form>
    );
}
