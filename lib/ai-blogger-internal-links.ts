import "server-only";

import { BlogStudioPostModel, connectDB } from "./mongodb";
import dbConnect from "./marketing-db";
import MarketingBlog from "../models/marketing/Blog";
import { getAIBloggerWebsiteIntelligence } from "./ai-blogger-website-intelligence";
import { normalizeInternalLinkHref } from "./ai-blogger-internal-link-utils";
import type {
    BlogStudioInternalLinkHealth,
    BlogStudioInternalLinkRelationType,
    BlogStudioInternalLinkSuggestion,
    BlogStudioPost,
} from "./types-ai-blogger";

type LinkCandidate = {
    id: string;
    title: string;
    href: string;
    source: BlogStudioInternalLinkSuggestion["source"];
    description: string;
    suggestedAnchor: string;
    keywords: string[];
    targetPostSlug?: string;
    targetClusterId?: string;
    targetParentTopicSlug?: string;
};

type InternalLinkNetworkPost = Pick<
    BlogStudioPost,
    "id" | "slug" | "publishedEntrySlug" | "contentClusterId" | "parentTopicSlug" | "internalLinks" | "canonicalUrl" | "brief"
>;

const STOP_WORDS = new Set([
    "about",
    "after",
    "also",
    "and",
    "are",
    "best",
    "build",
    "from",
    "for",
    "into",
    "that",
    "the",
    "this",
    "with",
    "your",
]);

function resolveSiteOrigin(value?: string) {
    const rawValue = value?.trim();

    if (!rawValue) {
        return "";
    }

    try {
        return new URL(rawValue).origin;
    } catch {
        return "";
    }
}

function resolvePostSiteUrl(post: BlogStudioPost, siteUrl?: string) {
    const brief = post.brief;
    return (
        resolveSiteOrigin(siteUrl) ||
        resolveSiteOrigin(post.canonicalUrl) ||
        resolveSiteOrigin(brief?.sourceMode === "website" ? brief.sourceValue : "")
    );
}

function resolveNetworkPostSiteUrl(post: InternalLinkNetworkPost) {
    const brief = post.brief;
    return (
        resolveSiteOrigin(post.canonicalUrl) ||
        resolveSiteOrigin(brief?.sourceMode === "website" ? brief.sourceValue : "")
    );
}

function buildAbsoluteSiteHref(siteUrl: string, href: string) {
    try {
        const url = new URL(href, siteUrl);
        url.hash = "";

        if (url.pathname !== "/" && url.pathname.endsWith("/")) {
            url.pathname = url.pathname.slice(0, -1);
        }

        return url.toString();
    } catch {
        return href;
    }
}

function buildPublishedBlogHref(siteUrl: string | undefined, slug: string) {
    const blogPath = `/blog/${slug}`;
    const resolvedSiteUrl = resolveSiteOrigin(siteUrl);

    return resolvedSiteUrl
        ? buildAbsoluteSiteHref(resolvedSiteUrl, blogPath)
        : blogPath;
}

function humanizePathSegment(pathname: string) {
    if (pathname === "/" || !pathname) {
        return "Home";
    }

    const segments = pathname
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean);

    if (segments.length === 0) {
        return "Home";
    }

    return segments[segments.length - 1]
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferGenericCandidateSource(pathname: string): LinkCandidate["source"] {
    return /^\/(?:services?|solutions?|products?|offers?)\b/i.test(pathname) ? "service" : "page";
}

function buildWebsitePathCandidates(siteUrl: string, paths: string[]) {
    const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");

    return paths
        .map((path, index) => {
            const pathname = path.trim() || "/";
            const source = inferGenericCandidateSource(pathname);
            const humanLabel = humanizePathSegment(pathname);

            return {
                id: `site-path-${index}-${pathname}`,
                title: pathname === "/" ? `${hostname} Home` : humanLabel,
                href: buildAbsoluteSiteHref(siteUrl, pathname),
                source,
                description:
                    pathname === "/"
                        ? `Homepage for ${hostname}.`
                        : `${humanLabel} page discovered on the target website.`,
                suggestedAnchor: pathname === "/" ? hostname : humanLabel.toLowerCase(),
                keywords: [humanLabel, pathname.replace(/[\/-]+/g, " "), hostname],
            } satisfies LinkCandidate;
        });
}

function normalizeText(value?: string) {
    return value?.trim().toLowerCase() || "";
}

function tokenize(values: Array<string | undefined>) {
    return Array.from(
        new Set(
            values
                .flatMap((value) =>
                    normalizeText(value)
                        .replace(/[^a-z0-9\s-]/g, " ")
                        .split(/\s+/)
                        .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
                ),
        ),
    );
}

function dedupeSuggestions(suggestions: BlogStudioInternalLinkSuggestion[]) {
    const seen = new Set<string>();

    return suggestions.filter((suggestion) => {
        if (seen.has(suggestion.href)) {
            return false;
        }

        seen.add(suggestion.href);
        return true;
    });
}

function extractSectionHeadings(post: BlogStudioPost) {
    const fromContent = (post.content || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^#{2,6}\s+/.test(line))
        .map((line) => line.replace(/^#{2,6}\s+/, "").trim());

    return Array.from(
        new Set(
            [...post.outline, ...fromContent]
                .map((heading) => heading?.trim())
                .filter(Boolean),
        ),
    ) as string[];
}

function getPostContext(post: BlogStudioPost) {
    const brief = post.brief;
    const focusPhrases = [
        brief?.primaryKeyword,
        post.title,
        post.excerpt,
        brief?.sourceValue,
        ...post.tags.slice(0, 4),
    ]
        .map((value) => value?.trim())
        .filter(Boolean) as string[];

    const tokens = tokenize([
        post.title,
        post.excerpt,
        brief?.primaryKeyword,
        brief?.sourceValue,
        brief?.audience,
        brief?.tone,
        ...post.tags,
        ...post.outline,
        post.content?.slice(0, 1200),
    ]);

    return {
        tokens,
        primaryKeyword: brief?.primaryKeyword?.trim() || "",
        focusPhrases,
        publishedEntrySlug: post.publishedEntrySlug || "",
        sectionHeadings: extractSectionHeadings(post),
    };
}

function getRelationType(post: BlogStudioPost, candidate: LinkCandidate): BlogStudioInternalLinkRelationType {
    if (candidate.targetPostSlug && post.parentTopicSlug && candidate.targetPostSlug === post.parentTopicSlug) {
        return "pillar-parent";
    }

    if (candidate.targetClusterId && post.contentClusterId && candidate.targetClusterId === post.contentClusterId) {
        return candidate.targetPostSlug === post.parentTopicSlug ? "cluster-parent" : "cluster-supporting";
    }

    if (candidate.targetParentTopicSlug && post.parentTopicSlug && candidate.targetParentTopicSlug === post.parentTopicSlug) {
        return "pillar-supporting";
    }

    if (candidate.source === "service") {
        return "service-authority";
    }

    if (candidate.source === "blog") {
        return "related-reading";
    }

    return "site-supporting";
}

function getBestSectionHeading(post: BlogStudioPost, candidate: LinkCandidate) {
    const context = getPostContext(post);

    if (context.sectionHeadings.length === 0) {
        return undefined;
    }

    const candidateTokens = tokenize([candidate.title, candidate.description, candidate.suggestedAnchor, ...candidate.keywords]);
    let bestHeading = "";
    let bestScore = -1;

    for (const heading of context.sectionHeadings) {
        const headingTokens = tokenize([heading]);
        let headingScore = 0;

        for (const token of headingTokens) {
            if (candidateTokens.includes(token)) {
                headingScore += 4;
            }
        }

        if (candidate.source === "service" && /(next step|why|strategy|services?|support|partner|help)/i.test(heading)) {
            headingScore += 3;
        }

        if (headingScore > bestScore) {
            bestHeading = heading;
            bestScore = headingScore;
        }
    }

    if (bestScore > 0) {
        return bestHeading;
    }

    if (candidate.source === "service") {
        return context.sectionHeadings.find((heading) => /(next step|conclusion|cta|services?|help)/i.test(heading)) ?? undefined;
    }

    return context.sectionHeadings[0] ?? undefined;
}

function scoreCandidate(post: BlogStudioPost, candidate: LinkCandidate) {
    const context = getPostContext(post);
    const candidateTokens = tokenize([candidate.title, candidate.description, ...candidate.keywords]);
    const candidateText = normalizeText([candidate.title, candidate.description, candidate.suggestedAnchor, ...candidate.keywords].join(" "));
    const relationType = getRelationType(post, candidate);
    const clusterAligned =
        relationType === "cluster-parent" ||
        relationType === "cluster-supporting" ||
        relationType === "pillar-parent" ||
        relationType === "pillar-supporting";

    let score = candidate.source === "service" ? 8 : candidate.source === "page" ? 4 : 3;
    let overlapCount = 0;

    for (const token of context.tokens) {
        if (candidateTokens.includes(token)) {
            score += 4;
            overlapCount += 1;
        }
    }

    if (context.primaryKeyword) {
        const primaryKeyword = normalizeText(context.primaryKeyword);

        if (candidateText.includes(primaryKeyword)) {
            score += 10;
        }
    }

    if (context.focusPhrases.some((phrase) => candidateText.includes(normalizeText(phrase)))) {
        score += 5;
    }

    if (post.target.type === "webhook" && candidate.source === "service") {
        score += 2;
    }

    if (relationType === "cluster-parent") {
        score += 18;
    } else if (relationType === "pillar-parent") {
        score += 16;
    } else if (relationType === "cluster-supporting") {
        score += 14;
    } else if (relationType === "pillar-supporting") {
        score += 10;
    }

    const suggestedSectionHeading = getBestSectionHeading(post, candidate);

    const matchReason =
        relationType === "cluster-parent"
            ? "Best-fit cluster parent page for this topic group."
            : relationType === "pillar-parent"
                ? "Matches the saved parent topic and acts as the pillar page."
                : relationType === "cluster-supporting"
                    ? "Shares the same content cluster and supports stronger topical authority."
                    : relationType === "pillar-supporting"
                        ? "Supports the same pillar topic and helps tighten topic relationships."
                        : context.primaryKeyword && candidateText.includes(normalizeText(context.primaryKeyword))
            ? `Matches the primary keyword "${context.primaryKeyword}".`
            : overlapCount > 0
                ? `Overlaps with the article topic across ${overlapCount} shared term${overlapCount === 1 ? "" : "s"}.`
                : candidate.source === "service"
                    ? "Strong supporting service page for internal link authority."
                    : candidate.source === "blog"
                        ? "Related reading from the archive."
                        : "Relevant supporting page on the connected website.";

    return {
        score,
        matchReason,
        relationType,
        clusterAligned,
        suggestedSectionHeading,
    };
}

async function getPublishedBlogCandidates(siteUrl?: string) {
    // Removed company-specific check - now works for ALL websites
    try {
        await dbConnect();

        const blogs = await MarketingBlog.find({ status: "published" })
            .select("title slug category metaKeywords shortDescription")
            .sort({ createdAt: -1 })
            .limit(18)
            .lean();

        return blogs.map((blog) => ({
            id: `blog-${blog._id.toString()}`,
            title: blog.title,
            href: buildPublishedBlogHref(siteUrl, blog.slug),
            source: "blog" as const,
            description: blog.shortDescription || `${blog.category || "Blog"} article on the blog archive.`,
            suggestedAnchor: blog.title,
            keywords: [
                blog.title,
                blog.category,
                blog.metaKeywords,
                blog.shortDescription,
            ].filter(Boolean) as string[],
        }));
    } catch (error) {
        console.error("[AI-BLOGGER] Failed to fetch published blog candidates:", error instanceof Error ? error.message : error);
        return [];
    }
}

async function getPublishedAIBloggerCandidates(post: BlogStudioPost, siteUrl?: string): Promise<LinkCandidate[]> {
    try {
        await connectDB();

        const posts = await BlogStudioPostModel.find({
            agencyId: post.agencyId,
            slug: { $ne: post.slug },
            status: "Published",
            publishedEntrySlug: { $exists: true, $ne: "" },
        })
            .select("id slug title excerpt brief tags contentClusterId parentTopicSlug publishedEntrySlug")
            .sort({ publishedAt: -1, updatedAt: -1 })
            .limit(24)
            .lean();

        return posts.map((candidatePost) => ({
            id: `ai-blogger-${candidatePost.id || candidatePost.slug}`,
            title: candidatePost.title,
            href: buildPublishedBlogHref(siteUrl, candidatePost.publishedEntrySlug || candidatePost.slug),
            source: "blog" as const,
            description: candidatePost.excerpt || "Published AI Blogger article on the blog archive.",
            suggestedAnchor: candidatePost.title,
            keywords: [
                candidatePost.title,
                candidatePost.excerpt,
                candidatePost.brief?.primaryKeyword,
                ...(candidatePost.tags || []),
            ].filter(Boolean) as string[],
            targetPostSlug: candidatePost.slug,
            targetClusterId: candidatePost.contentClusterId,
            targetParentTopicSlug: candidatePost.parentTopicSlug,
        }));
    } catch (error) {
        console.error("[AI-BLOGGER] Failed to fetch AI Blogger internal link candidates:", error instanceof Error ? error.message : error);
        return [];
    }
}

async function getWebsiteCandidates(post: BlogStudioPost, siteUrl?: string): Promise<LinkCandidate[]> {
    const resolvedSiteUrl = resolvePostSiteUrl(post, siteUrl);

    if (!resolvedSiteUrl) {
        return [];
    }

    // Use website intelligence discovery for ALL websites (generic, not company-specific)
    const crawlUrl = (post.brief?.sourceMode === "website" ? post.brief.sourceValue : "") || resolvedSiteUrl;
    const websiteIntelligence = await getAIBloggerWebsiteIntelligence(crawlUrl, {
        agencyId: post.agencyId,
    }).catch(() => null);

    const candidates = buildWebsitePathCandidates(
        resolvedSiteUrl,
        websiteIntelligence?.priorityPaths?.length
            ? websiteIntelligence.priorityPaths
            : ["/", "/services", "/about", "/contact", "/blog"],
    );

    return candidates.filter((candidate) => Boolean(normalizeInternalLinkHref(candidate.href, resolvedSiteUrl)));
}

function toStructuredInternalLinkSuggestion(
    candidate: LinkCandidate,
    score: number,
    matchReason: string,
    relationType: BlogStudioInternalLinkRelationType,
    clusterAligned: boolean,
    suggestedSectionHeading?: string,
): BlogStudioInternalLinkSuggestion {
    return {
        id: candidate.id,
        title: candidate.title,
        href: candidate.href,
        source: candidate.source,
        description: candidate.description,
        suggestedAnchor: candidate.suggestedAnchor,
        matchReason,
        score,
        relationType,
        clusterAligned,
        suggestedSectionHeading,
        targetPostSlug: candidate.targetPostSlug,
        targetClusterId: candidate.targetClusterId,
        targetParentTopicSlug: candidate.targetParentTopicSlug,
    };
}

function getKnownPostHrefs(post: InternalLinkNetworkPost, siteUrl?: string) {
    const hrefs = new Set<string>();

    if (post.publishedEntrySlug) {
        hrefs.add(normalizeInternalLinkHref(`/blog/${post.publishedEntrySlug}`, siteUrl) || `/blog/${post.publishedEntrySlug}`);
    }

    hrefs.add(`/dashboard/ai-blogger/posts/${post.slug}`);
    return hrefs;
}

function buildInternalLinkHealth(
    post: InternalLinkNetworkPost,
    inboundCount: number,
    relatedPostCount: number,
): BlogStudioInternalLinkHealth {
    const outboundCount = post.internalLinks?.length || 0;
    const clusterAlignedCount = (post.internalLinks || []).filter((link) => link.clusterAligned).length;
    const acceptedCount = outboundCount;

    if (outboundCount === 0 && inboundCount === 0 && relatedPostCount === 0) {
        return {
            status: "orphan",
            label: "Orphaned",
            summary: "No accepted internal links or cluster relationships are stored for this post yet.",
            outboundCount,
            inboundCount,
            acceptedCount,
            clusterAlignedCount,
            relatedPostCount,
        };
    }

    if (outboundCount >= 2 && (clusterAlignedCount >= 1 || inboundCount >= 1 || relatedPostCount >= 2)) {
        return {
            status: "connected",
            label: "Connected",
            summary: "This post has a usable internal-link map with cluster or network support.",
            outboundCount,
            inboundCount,
            acceptedCount,
            clusterAlignedCount,
            relatedPostCount,
        };
    }

    return {
        status: "weak",
        label: "Weakly Connected",
        summary: "Some internal-link structure exists, but the map still needs stronger cluster or inbound support.",
        outboundCount,
        inboundCount,
        acceptedCount,
        clusterAlignedCount,
        relatedPostCount,
    };
}

export function buildBlogStudioInternalLinkHealthMap(posts: InternalLinkNetworkPost[]) {
    const healthMap = new Map<string, BlogStudioInternalLinkHealth>();
    const inboundCounts = new Map<string, number>();
    const relatedCounts = new Map<string, number>();
    const hrefsByPostId = new Map<string, Set<string>>();
    const siteUrlByPostId = new Map<string, string>();

    for (const post of posts) {
        const resolvedSiteUrl = resolveNetworkPostSiteUrl(post);
        siteUrlByPostId.set(post.id, resolvedSiteUrl);
        hrefsByPostId.set(post.id, getKnownPostHrefs(post, resolvedSiteUrl));
        inboundCounts.set(post.id, 0);
        relatedCounts.set(post.id, 0);
    }

    for (const post of posts) {
        const relatedPostCount = posts.filter((candidate) => {
            if (candidate.id === post.id) {
                return false;
            }

            return Boolean(
                (post.contentClusterId && candidate.contentClusterId === post.contentClusterId) ||
                (post.parentTopicSlug && candidate.parentTopicSlug === post.parentTopicSlug),
            );
        }).length;

        relatedCounts.set(post.id, relatedPostCount);
    }

    for (const sourcePost of posts) {
        const sourceSiteUrl = siteUrlByPostId.get(sourcePost.id);
        for (const link of sourcePost.internalLinks || []) {
            const normalizedLinkHref = normalizeInternalLinkHref(link.href, sourceSiteUrl) || link.href;
            for (const targetPost of posts) {
                if (targetPost.id === sourcePost.id) {
                    continue;
                }

                const targetHrefs = hrefsByPostId.get(targetPost.id) || new Set<string>();
                if (
                    (link.targetPostSlug && link.targetPostSlug === targetPost.slug) ||
                    targetHrefs.has(normalizedLinkHref)
                ) {
                    inboundCounts.set(targetPost.id, (inboundCounts.get(targetPost.id) || 0) + 1);
                }
            }
        }
    }

    for (const post of posts) {
        healthMap.set(
            post.id,
            buildInternalLinkHealth(
                post,
                inboundCounts.get(post.id) || 0,
                relatedCounts.get(post.id) || 0,
            ),
        );
    }

    return healthMap;
}

export async function getBlogStudioInternalLinkSuggestions(
    post: BlogStudioPost,
    limit = 6,
    options?: {
        siteUrl?: string;
    },
): Promise<BlogStudioInternalLinkSuggestion[]> {
    const resolvedSiteUrl = resolvePostSiteUrl(post, options?.siteUrl);
    const [siteCandidates, blogCandidates, aiBloggerCandidates] = await Promise.all([
        getWebsiteCandidates(post, resolvedSiteUrl),
        getPublishedBlogCandidates(resolvedSiteUrl),
        getPublishedAIBloggerCandidates(post, resolvedSiteUrl),
    ]);
    const publishedHref = post.publishedEntrySlug
        ? buildPublishedBlogHref(resolvedSiteUrl, post.publishedEntrySlug)
        : "";
    const candidates = [...siteCandidates, ...blogCandidates, ...aiBloggerCandidates]
        .filter((candidate) => candidate.href !== publishedHref);

    const ranked = candidates
        .map((candidate) => {
            const { score, matchReason, relationType, clusterAligned, suggestedSectionHeading } = scoreCandidate(post, candidate);

            return {
                candidate,
                score,
                matchReason,
                relationType,
                clusterAligned,
                suggestedSectionHeading,
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            if (left.candidate.source !== right.candidate.source) {
                const sourceWeight = { service: 3, page: 2, blog: 1 };
                return sourceWeight[right.candidate.source] - sourceWeight[left.candidate.source];
            }

            return left.candidate.title.localeCompare(right.candidate.title);
        });

    const suggestions = dedupeSuggestions(
        ranked.slice(0, Math.max(limit, 8)).map(({ candidate, score, matchReason, relationType, clusterAligned, suggestedSectionHeading }) =>
            toStructuredInternalLinkSuggestion(
                candidate,
                score,
                matchReason,
                relationType,
                clusterAligned,
                suggestedSectionHeading,
            )),
    );

    if (suggestions.length >= limit) {
        return suggestions.slice(0, limit);
    }

    const fallback = dedupeSuggestions(
        [
            ...suggestions,
            ...siteCandidates.map((candidate) =>
                toStructuredInternalLinkSuggestion(
                    candidate,
                    candidate.source === "service" ? 12 : 6,
                    candidate.source === "service"
                        ? "Useful service page for internal link support."
                        : "Useful supporting page on the target website.",
                    candidate.source === "service" ? "service-authority" : "site-supporting",
                    false,
                    undefined,
                )),
        ],
    );

    return fallback.slice(0, limit);
}
