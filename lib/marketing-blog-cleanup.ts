import removedBlogPosts from "./marketing-blog-removed-posts.json";

// Blog posts removed in the 2026-10 content cleanup. Posts listed under
// "redirects" are permanently redirected in next.config.ts; posts under "gone"
// have no close replacement and return 404. Both are hidden from the blog list
// and the sitemap even before their database records are deleted.
export const REMOVED_BLOG_REDIRECTS: Record<string, string> = removedBlogPosts.redirects;

export const REMOVED_BLOG_SLUGS = new Set<string>([
    ...Object.keys(removedBlogPosts.redirects),
    ...removedBlogPosts.gone,
]);

export function isRemovedMarketingBlogSlug(slug?: string) {
    return Boolean(slug && REMOVED_BLOG_SLUGS.has(slug.trim()));
}

// Pipeline labels that were stored as the post category or schema fields but
// are not meant for readers (tool names, queue names, content-type labels).
const INTERNAL_LABEL_PATTERN =
    /zseo|content studio|export queue|^(?:practical |expert-led educational |commercial decision |how-to )?(?:how-to )?guide$|^listicle$|^explainer$/i;

export function isInternalMarketingBlogLabel(value?: string) {
    const label = value?.trim() || "";
    return !label || INTERNAL_LABEL_PATTERN.test(label);
}

const PUBLIC_CATEGORY_RULES: Array<{ label: string; keywords: string[] }> = [
    { label: "Influencer Marketing", keywords: ["influencer", "creator", "allowlisting", "whitelisting"] },
    { label: "PPC", keywords: ["ppc", "paid search", "google ads", "local service ads", "advertising"] },
    { label: "Video Production", keywords: ["video", "storytelling", "production"] },
    { label: "Social Media", keywords: ["social media", "instagram", "linkedin", "reels", "content calendar"] },
    { label: "Web Development", keywords: ["web development", "web application", "website", "cms"] },
    { label: "SEO", keywords: ["seo", "search", "keyword", "geo", "citation"] },
];

/**
 * Returns the category shown to readers. Real editorial categories are kept;
 * internal pipeline labels are replaced by a topic label derived from the
 * post's slug and title.
 */
export function getMarketingBlogPublicCategory(blog: {
    category?: string;
    slug?: string;
    title?: string;
}) {
    if (!isInternalMarketingBlogLabel(blog.category)) {
        return blog.category!.trim();
    }

    const text = `${blog.slug || ""} ${blog.title || ""}`.replace(/-/g, " ").toLowerCase();
    const rule = PUBLIC_CATEGORY_RULES.find((candidate) =>
        candidate.keywords.some((keyword) => text.includes(keyword)),
    );

    return rule?.label || "Insights";
}

/**
 * Points absolute links to this site (any scheme, with or without www) at
 * root-relative paths, so they no longer pass through the www redirect.
 */
export function rewriteMarketingSiteLinksToRelative(html = "") {
    return html.replace(
        /href=(["'])https?:\/\/(?:www\.)?digitalcorvids\.com(\/[^"']*)?\1/gi,
        (_match, quote: string, path?: string) => `href=${quote}${path || "/"}${quote}`,
    );
}

type JsonLdNode = Record<string, unknown>;

function isBlogPostingNode(node: JsonLdNode) {
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.some((item) => item === "BlogPosting" || item === "Article");
}

function cleanBlogPostingNode(node: JsonLdNode, publicCategory: string, siteName: string): JsonLdNode {
    const next: JsonLdNode = { ...node };

    if (typeof next.articleSection !== "string" || isInternalMarketingBlogLabel(next.articleSection)) {
        next.articleSection = publicCategory;
    }

    const author = next.author as JsonLdNode | JsonLdNode[] | undefined;
    const authors = Array.isArray(author) ? author : author ? [author] : [];
    if (
        authors.length === 0 ||
        authors.some((item) => typeof item?.name !== "string" || isInternalMarketingBlogLabel(item.name as string))
    ) {
        next.author = { "@type": "Organization", name: siteName };
    }

    return next;
}

/**
 * Replaces internal pipeline labels in stored BlogPosting JSON-LD
 * (articleSection, author) with reader-facing values.
 */
export function cleanStoredBlogSchema(value: unknown, publicCategory: string, siteName: string): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => cleanStoredBlogSchema(item, publicCategory, siteName));
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    const node = value as JsonLdNode;
    const withGraph = Array.isArray(node["@graph"])
        ? { ...node, "@graph": cleanStoredBlogSchema(node["@graph"], publicCategory, siteName) }
        : node;

    return isBlogPostingNode(withGraph)
        ? cleanBlogPostingNode(withGraph, publicCategory, siteName)
        : withGraph;
}
