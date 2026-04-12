import "server-only";

import { BlogStudioPostModel, connectDB } from "./mongodb";
import dbConnect from "./marketing-db";
import MarketingBlog from "../models/marketing/Blog";
import { getAIBloggerWebsiteIntelligence } from "./ai-blogger-website-intelligence";
import { normalizeMarketingSiteOrigin } from "./marketing-blog-utils";
import { normalizeInternalLinkHref } from "./ai-blogger-internal-link-utils";
import type {
    BlogStudioInternalLinkHealth,
    BlogStudioInternalLinkRelationType,
    BlogStudioInternalLinkSuggestion,
    BlogStudioPost,
    BlogStudioSitePriorityPage,
    BlogStudioSitePriorityPageCategory,
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
    websiteCategory?: BlogStudioSitePriorityPageCategory;
    priorityScore?: number;
};

type RankedLinkCandidate = {
    candidate: LinkCandidate;
    score: number;
    matchReason: string;
    relationType: BlogStudioInternalLinkRelationType;
    clusterAligned: boolean;
    suggestedSectionHeading?: string;
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

const COMMERCIAL_WEBSITE_CATEGORIES = new Set<BlogStudioSitePriorityPageCategory>([
    "service",
    "solution",
    "case-study",
    "pricing",
    "industry",
]);

const LOW_VALUE_WEBSITE_CATEGORIES = new Set<BlogStudioSitePriorityPageCategory>([
    "home",
    "about",
    "contact",
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
        resolveSiteOrigin(brief?.sourceMode === "website" ? brief.sourceValue : brief?.targetWebsiteUrl)
    );
}

function resolveNetworkPostSiteUrl(post: InternalLinkNetworkPost) {
    const brief = post.brief;
    return (
        resolveSiteOrigin(post.canonicalUrl) ||
        resolveSiteOrigin(brief?.sourceMode === "website" ? brief.sourceValue : brief?.targetWebsiteUrl)
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

/**
 * Resolves the best available href for a published blog post.
 * Priority: canonicalUrl (set by publishing webhook response) > /blog/publishedEntrySlug > /blog/slug
 */
function resolvePublishedBlogHref(siteUrl: string | undefined, slug: string, publishedEntrySlug?: string, canonicalUrl?: string): string {
    const resolvedSiteUrl = resolveSiteOrigin(siteUrl);

    // Use canonicalUrl when it's an absolute URL on the same domain
    if (canonicalUrl?.trim()) {
        try {
            const canonical = new URL(canonicalUrl.trim());
            if (!resolvedSiteUrl || canonical.origin === resolveSiteOrigin(resolvedSiteUrl)) {
                canonical.hash = "";
                if (canonical.pathname !== "/" && canonical.pathname.endsWith("/")) {
                    canonical.pathname = canonical.pathname.slice(0, -1);
                }
                return canonical.toString();
            }
        } catch {
            // fall through
        }
    }

    return buildPublishedBlogHref(siteUrl, publishedEntrySlug || slug);
}

/**
 * Converts a full page title into a short, natural anchor (3-4 words max).
 * Preserves connecting words (with, for, in, on, of) to keep the phrase readable.
 * E.g. "How to Manage Your Company Using AI in 2026" → "manage company with ai"
 */
function toNaturalAnchor(title: string): string {
    // Strip year tokens and special chars first
    const cleaned = title
        .toLowerCase()
        .replace(/\b20\d{2}\b/g, "") // strip years
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const HARD_STOP_WORDS = new Set([
        "about", "after", "also", "and", "are", "best", "build",
        "from", "into", "that", "the", "this", "your",
        "how", "what", "why", "when", "where", "which",
        "can", "get", "use", "using", "used", "will", "would",
        "our", "they", "their", "you", "its",
    ]);

    const words = cleaned
        .split(/\s+/)
        .filter((w) => w.length > 1 && !HARD_STOP_WORDS.has(w));

    // Take up to 5 words then slice to 4 — preserving short connectives (with/for/in)
    const phrase = words.slice(0, 5).join(" ");

    // Final trim to 4 words
    return phrase.split(/\s+/).slice(0, 4).join(" ") || title.toLowerCase().slice(0, 30);
}

/**
 * Fires parallel HEAD requests against blog link candidates and removes any that return 404.
 * Silently skips on network error (keeps the link) — only hard 404s are filtered.
 */
async function validateBlogHrefs(candidates: LinkCandidate[]): Promise<LinkCandidate[]> {
    const results = await Promise.allSettled(
        candidates.map(async (candidate) => {
            try {
                const response = await fetch(candidate.href, {
                    method: "HEAD",
                    redirect: "follow",
                    signal: AbortSignal.timeout(6_000),
                });
                return { ok: response.status !== 404, candidate };
            } catch {
                // Network error → keep the candidate (don't penalise for flaky network)
                return { ok: true, candidate };
            }
        }),
    );

    return results
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((entry): entry is { ok: boolean; candidate: LinkCandidate } => entry !== null && entry.ok)
        .map((entry) => entry.candidate);
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

function uniqueCandidateStrings(values: Array<string | undefined>, limit = 10) {
    const seen = new Set<string>();
    const results: string[] = [];

    for (const value of values) {
        const trimmed = value?.trim();

        if (!trimmed) {
            continue;
        }

        const key = trimmed.toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        results.push(trimmed);

        if (results.length >= limit) {
            break;
        }
    }

    return results;
}

function getWebsiteCategoryLabel(category?: BlogStudioSitePriorityPageCategory) {
    switch (category) {
        case "service":
            return "service";
        case "solution":
            return "solution";
        case "case-study":
            return "case study";
        case "pricing":
            return "pricing";
        case "industry":
            return "industry";
        case "blog":
            return "blog";
        case "faq":
            return "FAQ";
        case "about":
            return "about";
        case "contact":
            return "contact";
        case "home":
            return "homepage";
        default:
            return "website";
    }
}

function getWebsiteCategoryFromPath(pathname: string): BlogStudioSitePriorityPageCategory {
    const normalizedPath = pathname.toLowerCase();

    if (normalizedPath === "/") {
        return "home";
    }

    if (/(^|\/)(pricing|plans?|packages?|costs?|quotes?)(\/|$)/.test(normalizedPath)) {
        return "pricing";
    }

    if (/(^|\/)(case-studies?|work|portfolio|results|customer-stories?)(\/|$)/.test(normalizedPath)) {
        return "case-study";
    }

    if (/(^|\/)(industr(y|ies)|sectors?|verticals?)(\/|$)/.test(normalizedPath)) {
        return "industry";
    }

    if (/(^|\/)(blog|blogs|articles?|resources?|news|insights)(\/|$)/.test(normalizedPath)) {
        return "blog";
    }

    if (/(^|\/)(faq|faqs|help|questions)(\/|$)/.test(normalizedPath)) {
        return "faq";
    }

    if (/(^|\/)(about|company|team)(\/|$)/.test(normalizedPath)) {
        return "about";
    }

    if (/(^|\/)(contact|book|demo|consultation|schedule)(\/|$)/.test(normalizedPath)) {
        return "contact";
    }

    if (/(^|\/)(solutions?)(\/|$)/.test(normalizedPath)) {
        return "solution";
    }

    if (/(^|\/)(services?|products?|offers?)(\/|$)/.test(normalizedPath)) {
        return "service";
    }

    return "general";
}

function getCandidateSourceForWebsiteCategory(category?: BlogStudioSitePriorityPageCategory): LinkCandidate["source"] {
    return category && COMMERCIAL_WEBSITE_CATEGORIES.has(category) ? "service" : "page";
}

function isCommercialCandidate(candidate: Pick<LinkCandidate, "source" | "websiteCategory">) {
    return candidate.source === "service"
        || Boolean(candidate.websiteCategory && COMMERCIAL_WEBSITE_CATEGORIES.has(candidate.websiteCategory));
}

function isLowValueWebsiteCategory(category?: BlogStudioSitePriorityPageCategory) {
    return Boolean(category && LOW_VALUE_WEBSITE_CATEGORIES.has(category));
}

function getWebsiteCategoryWeight(category?: BlogStudioSitePriorityPageCategory) {
    switch (category) {
        case "service":
            return 14;
        case "solution":
            return 13;
        case "pricing":
            return 12;
        case "case-study":
            return 11;
        case "industry":
            return 10;
        case "faq":
            return 3;
        case "blog":
            return 1;
        case "home":
            return -4;
        case "about":
            return -7;
        case "contact":
            return -8;
        default:
            return 0;
    }
}

function buildWebsitePriorityPageCandidates(siteUrl: string, pages: BlogStudioSitePriorityPage[]) {
    return pages.map((page, index) => {
        const pathname = page.path.trim() || "/";
        const title = page.title.trim() || humanizePathSegment(pathname);
        const source = getCandidateSourceForWebsiteCategory(page.pageCategory);
        const categoryLabel = getWebsiteCategoryLabel(page.pageCategory);
        const description = uniqueCandidateStrings([
            page.description,
            page.excerpt,
            page.highlights[0],
            page.proofSignals[0],
        ], 3).join(" | ");
        const keywords = uniqueCandidateStrings([
            title,
            page.description,
            page.excerpt,
            ...page.highlights,
            ...page.serviceSignals,
            ...page.proofSignals,
            ...page.ctaPatterns,
            pathname.replace(/[\/-]+/g, " "),
        ], 12);

        return {
            id: `site-page-${index}-${pathname}`,
            title,
            href: buildAbsoluteSiteHref(siteUrl, page.url || pathname),
            source,
            description: description || `${title} ${categoryLabel} page discovered on the target website.`,
            suggestedAnchor: toNaturalAnchor(title),
            keywords,
            websiteCategory: page.pageCategory,
            priorityScore: page.pageScore,
        } satisfies LinkCandidate;
    });
}

function buildWebsitePathCandidates(siteUrl: string, paths: string[]) {
    const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");

    return paths
        .map((path, index) => {
            const pathname = path.trim() || "/";
            const websiteCategory = getWebsiteCategoryFromPath(pathname);
            const source = getCandidateSourceForWebsiteCategory(websiteCategory);
            const humanLabel = humanizePathSegment(pathname);
            const categoryLabel = getWebsiteCategoryLabel(websiteCategory);

            return {
                id: `site-path-${index}-${pathname}`,
                title: pathname === "/" ? `${hostname} Home` : humanLabel,
                href: buildAbsoluteSiteHref(siteUrl, pathname),
                source,
                description:
                    pathname === "/"
                        ? `Homepage for ${hostname}.`
                        : `${humanLabel} ${categoryLabel} page discovered on the target website.`,
                suggestedAnchor: pathname === "/" ? hostname : humanLabel.toLowerCase(),
                keywords: [humanLabel, pathname.replace(/[\/-]+/g, " "), hostname],
                websiteCategory,
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

        if (isCommercialCandidate(candidate) && /(next step|why|strategy|services?|support|partner|help)/i.test(heading)) {
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

    if (isCommercialCandidate(candidate)) {
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

    score += getWebsiteCategoryWeight(candidate.websiteCategory);

    if (typeof candidate.priorityScore === "number" && candidate.priorityScore > 0) {
        score += Math.min(12, Math.round(candidate.priorityScore / 6));
    }

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

    if (post.target.type === "webhook" && isCommercialCandidate(candidate)) {
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

    if (isLowValueWebsiteCategory(candidate.websiteCategory) && overlapCount === 0 && !clusterAligned) {
        score -= 4;
    }

    const suggestedSectionHeading = getBestSectionHeading(post, candidate);
    const websiteCategoryLabel = getWebsiteCategoryLabel(candidate.websiteCategory);

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
                : isCommercialCandidate(candidate)
                    ? `High-value ${websiteCategoryLabel} page for commercial context and internal authority.`
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
    // The MarketingBlog table is DC's own marketing site blog archive.
    // Only include these candidates when the post targets DC's own website.
    // For external client websites, these blogs are irrelevant.
    const marketingOrigin = normalizeMarketingSiteOrigin();
    if (!marketingOrigin) {
        return [];
    }

    // If a siteUrl is provided, check that it matches the marketing domain
    if (siteUrl) {
        try {
            const targetHost = new URL(siteUrl).hostname.replace(/^www\./, "").toLowerCase();
            const marketingHost = new URL(marketingOrigin).hostname.replace(/^www\./, "").toLowerCase();
            if (targetHost !== marketingHost) {
                return [];
            }
        } catch {
            return [];
        }
    }

    try {
        await dbConnect();

        const blogs = await MarketingBlog.find({ status: "published" })
            .select("title slug category metaKeywords shortDescription")
            .sort({ createdAt: -1 })
            .limit(18)
            .lean();

        const candidates = blogs.map((blog) => ({
            id: `blog-${blog._id.toString()}`,
            title: blog.title,
            href: buildPublishedBlogHref(siteUrl, blog.slug),
            source: "blog" as const,
            description: blog.shortDescription || `${blog.category || "Blog"} article on the blog archive.`,
            suggestedAnchor: toNaturalAnchor(blog.title),
            keywords: [
                blog.title,
                blog.category,
                blog.metaKeywords,
                blog.shortDescription,
            ].filter(Boolean) as string[],
        }));

        return await validateBlogHrefs(candidates);
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
            .select("id slug title excerpt brief tags contentClusterId parentTopicSlug publishedEntrySlug canonicalUrl")
            .sort({ publishedAt: -1, updatedAt: -1 })
            .limit(24)
            .lean();

        const candidates = posts.map((candidatePost) => ({
            id: `ai-blogger-${candidatePost.id || candidatePost.slug}`,
            title: candidatePost.title,
            href: resolvePublishedBlogHref(
                siteUrl,
                candidatePost.slug,
                candidatePost.publishedEntrySlug,
                candidatePost.canonicalUrl,
            ),
            source: "blog" as const,
            description: candidatePost.excerpt || "Published AI Blogger article on the blog archive.",
            suggestedAnchor: toNaturalAnchor(candidatePost.title),
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

        return await validateBlogHrefs(candidates);
    } catch (error) {
        console.error("[AI-BLOGGER] Failed to fetch AI Blogger internal link candidates:", error instanceof Error ? error.message : error);
        return [];
    }
}

async function getWebsiteCandidates(
    post: BlogStudioPost,
    siteUrl?: string,
    crawlConfig?: {
        enabled?: boolean;
        maxPages?: number;
        timeoutMs?: number;
        refreshWindowHours?: number;
        allowedPaths?: string[];
        blockedPaths?: string[];
    },
): Promise<LinkCandidate[]> {
    const resolvedSiteUrl = resolvePostSiteUrl(post, siteUrl);

    if (!resolvedSiteUrl) {
        return [];
    }

    // Use website intelligence discovery for ALL websites (generic, not company-specific)
    const crawlUrl =
        (post.brief?.sourceMode === "website" ? post.brief.sourceValue : post.brief?.targetWebsiteUrl) ||
        resolvedSiteUrl;
    const websiteIntelligence = await getAIBloggerWebsiteIntelligence(crawlUrl, {
        agencyId: post.agencyId,
        enabled: crawlConfig?.enabled ?? true,
        maxPages: crawlConfig?.maxPages,
        timeoutMs: crawlConfig?.timeoutMs,
        refreshWindowHours: crawlConfig?.refreshWindowHours,
        allowedPaths: crawlConfig?.allowedPaths,
        blockedPaths: crawlConfig?.blockedPaths,
        totalBudgetMs: 15_000,
    }).catch(() => null);

    const candidates = [
        ...(websiteIntelligence?.priorityPages?.length
            ? buildWebsitePriorityPageCandidates(resolvedSiteUrl, websiteIntelligence.priorityPages)
            : []),
        ...buildWebsitePathCandidates(
            resolvedSiteUrl,
            websiteIntelligence?.priorityPaths?.length
                ? websiteIntelligence.priorityPaths
                : ["/", "/services", "/pricing", "/case-studies", "/about", "/contact", "/blog"],
        ),
    ];

    const seen = new Set<string>();

    return candidates.filter((candidate) => {
        const normalizedHref = normalizeInternalLinkHref(candidate.href, resolvedSiteUrl);

        if (!normalizedHref || seen.has(normalizedHref)) {
            return false;
        }

        seen.add(normalizedHref);
        return true;
    });
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

function selectSuggestionMix(ranked: RankedLinkCandidate[], limit: number) {
    const targetCount = Math.max(limit, 8);
    const selected: RankedLinkCandidate[] = [];
    const seenHrefs = new Set<string>();
    const hasCommercialCandidates = ranked.some((entry) => isCommercialCandidate(entry.candidate));
    const maxBlogCount = hasCommercialCandidates ? Math.max(1, Math.floor(targetCount / 3)) : targetCount;

    const addEntry = (entry?: RankedLinkCandidate) => {
        if (!entry || seenHrefs.has(entry.candidate.href)) {
            return;
        }

        selected.push(entry);
        seenHrefs.add(entry.candidate.href);
    };

    if (hasCommercialCandidates) {
        addEntry(ranked.find((entry) => isCommercialCandidate(entry.candidate)));
    }

    addEntry(ranked.find((entry) => entry.relationType === "cluster-parent" || entry.relationType === "pillar-parent"));
    addEntry(ranked.find((entry) => entry.relationType === "cluster-supporting" || entry.relationType === "pillar-supporting"));

    let blogCount = selected.filter((entry) => entry.candidate.source === "blog").length;
    let lowValueCount = selected.filter((entry) => isLowValueWebsiteCategory(entry.candidate.websiteCategory)).length;

    for (const entry of ranked) {
        if (selected.length >= targetCount) {
            break;
        }

        if (seenHrefs.has(entry.candidate.href)) {
            continue;
        }

        if (hasCommercialCandidates && entry.candidate.source === "blog" && blogCount >= maxBlogCount) {
            continue;
        }

        if (isLowValueWebsiteCategory(entry.candidate.websiteCategory) && lowValueCount >= 1) {
            continue;
        }

        addEntry(entry);

        if (entry.candidate.source === "blog") {
            blogCount += 1;
        }

        if (isLowValueWebsiteCategory(entry.candidate.websiteCategory)) {
            lowValueCount += 1;
        }
    }

    if (selected.length >= targetCount) {
        return selected;
    }

    for (const entry of ranked) {
        if (selected.length >= targetCount) {
            break;
        }

        addEntry(entry);
    }

    return selected;
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
        crawlConfig?: {
            enabled?: boolean;
            maxPages?: number;
            timeoutMs?: number;
            refreshWindowHours?: number;
            allowedPaths?: string[];
            blockedPaths?: string[];
        };
    },
): Promise<BlogStudioInternalLinkSuggestion[]> {
    const resolvedSiteUrl = resolvePostSiteUrl(post, options?.siteUrl);
    const [siteCandidates, blogCandidates, aiBloggerCandidates] = await Promise.all([
        getWebsiteCandidates(post, resolvedSiteUrl, options?.crawlConfig),
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
        .filter(({ candidate, score }) => {
            // Blog candidates from a shared table may be irrelevant cross-client content.
            // Require a minimum relevance score for blog candidates only.
            if (candidate.source === "blog" && score < 8) {
                return false;
            }
            return true;
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            const categoryWeightDelta =
                getWebsiteCategoryWeight(right.candidate.websiteCategory) -
                getWebsiteCategoryWeight(left.candidate.websiteCategory);
            if (categoryWeightDelta !== 0) {
                return categoryWeightDelta;
            }

            if (left.candidate.source !== right.candidate.source) {
                const sourceWeight = { service: 3, page: 2, blog: 1 };
                return sourceWeight[right.candidate.source] - sourceWeight[left.candidate.source];
            }

            return left.candidate.title.localeCompare(right.candidate.title);
        });

    const selectedCandidates = selectSuggestionMix(ranked, limit);
    const suggestions = dedupeSuggestions(
        selectedCandidates.map(({ candidate, score, matchReason, relationType, clusterAligned, suggestedSectionHeading }) =>
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
                    candidate.source === "service"
                        ? Math.max(18, Math.min(26, Math.round((candidate.priorityScore || 0) / 5) + 12))
                        : isLowValueWebsiteCategory(candidate.websiteCategory)
                            ? 5
                            : 8,
                    candidate.source === "service"
                        ? `Useful ${getWebsiteCategoryLabel(candidate.websiteCategory)} page for internal link support.`
                        : "Useful supporting page on the target website.",
                    candidate.source === "service" ? "service-authority" : "site-supporting",
                    false,
                    undefined,
                )),
        ],
    );

    return fallback.slice(0, limit);
}
