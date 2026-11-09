import removedBlogPosts from "./marketing-blog-removed-posts.json";
import { isMarketingBlogPlaceholderImage } from "./marketing-blog-utils";

// Blog posts removed in the 2026-10 content cleanup. Posts listed under
// "redirects" are permanently redirected in next.config.ts; posts under "gone"
// have no close replacement and return 404. Both are hidden from the blog list,
// the sitemap and llms.txt even before their database records are deleted.
export const REMOVED_BLOG_REDIRECTS: Record<string, string> = removedBlogPosts.redirects;

export const REMOVED_BLOG_SLUGS = new Set<string>([
    ...Object.keys(removedBlogPosts.redirects),
    ...removedBlogPosts.gone,
]);

// Older posts whose URLs were already redirected in next.config.ts before the
// cleanup, but whose database records are still published. The blog list, the
// sitemap, llms.txt and the related/latest post links hide them so they never
// link to a redirect.
export const LEGACY_BLOG_REDIRECTS: Record<string, string> = removedBlogPosts.legacyRedirects;

export const LEGACY_REDIRECTED_BLOG_SLUGS = new Set<string>(Object.keys(LEGACY_BLOG_REDIRECTS));

const RETIRED_BLOG_REDIRECTS: Record<string, string> = {
    ...LEGACY_BLOG_REDIRECTS,
    ...REMOVED_BLOG_REDIRECTS,
};

export function isRemovedMarketingBlogSlug(slug?: string) {
    return Boolean(slug && REMOVED_BLOG_SLUGS.has(slug.trim()));
}

const ANCHOR_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const HREF_ATTRIBUTE_PATTERN = /\bhref\s*=\s*(["'])([^"']*)\1/i;
const SITE_BLOG_POST_HREF_PATTERN =
    /^(?:https?:\/\/(?:www\.)?digitalcorvids\.com)?\/blog\/([^/?#]+)\/?(?:[?#]|$)/i;

/**
 * Points links to retired posts at their redirect target and unlinks posts
 * that are gone, keeping the link text. Stored post HTML and internalLinks
 * keep linking to retired posts until their database records are cleaned up.
 * A link whose target is the post being rendered (currentSlug) is unlinked too.
 */
export function rewriteRetiredMarketingBlogLinks(html = "", currentSlug = "") {
    return html.replace(ANCHOR_PATTERN, (anchor: string, attributes: string, inner: string) => {
        const href = attributes.match(HREF_ATTRIBUTE_PATTERN)?.[2]?.trim() || "";
        const slug = href.match(SITE_BLOG_POST_HREF_PATTERN)?.[1]?.toLowerCase();
        if (!slug || !(REMOVED_BLOG_SLUGS.has(slug) || LEGACY_REDIRECTED_BLOG_SLUGS.has(slug))) {
            return anchor;
        }

        const destination = RETIRED_BLOG_REDIRECTS[slug];
        if (!destination || (currentSlug && destination === `/blog/${currentSlug.trim()}`)) {
            return inner;
        }

        return `<a${attributes.replace(HREF_ATTRIBUTE_PATTERN, () => `href="${destination}"`)}>${inner}</a>`;
    });
}

const ZSEO_URL = "https://zseo.ai";
const AI_BLOGGER_PAGE_HREF_PATTERN =
    /^(?:https?:\/\/(?:www\.)?digitalcorvids\.com)?\/services\/ai-blogger\/?(?:[?#]|$)/i;
const AI_BLOGGER_NAME_PATTERN = /\bAI Blogger\b/gi;

/**
 * AI Blogger moved to its own website, zSEO.ai. Stored post HTML still links
 * to the old service page and uses the old name, so point those links at
 * zSEO.ai and use the new name in the text (never inside tags or URLs).
 */
export function replaceAIBloggerReferences(html = "") {
    return html
        .replace(ANCHOR_PATTERN, (anchor: string, attributes: string, inner: string) => {
            const href = attributes.match(HREF_ATTRIBUTE_PATTERN)?.[2]?.trim() || "";
            if (!AI_BLOGGER_PAGE_HREF_PATTERN.test(href)) {
                return anchor;
            }

            return `<a${attributes.replace(HREF_ATTRIBUTE_PATTERN, () => `href="${ZSEO_URL}"`)}>${inner}</a>`;
        })
        .replace(/(^|>)([^<]+)/g, (_match, tagEnd: string, text: string) =>
            `${tagEnd}${text.replace(AI_BLOGGER_NAME_PATTERN, "zSEO.ai")}`,
        );
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
    { label: "SEO", keywords: ["seo", "search", "keyword", "geo", "citation", "ranking"] },
];

/** The blog's topics in filter order: the six services, then everything else. */
export const MARKETING_BLOG_TOPICS = [
    "SEO",
    "PPC",
    "Social Media",
    "Web Development",
    "Video Production",
    "Influencer Marketing",
    "Insights",
];

function matchBlogTopic(text: string) {
    const normalized = text.replace(/-/g, " ").toLowerCase();
    return PUBLIC_CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))?.label;
}

/**
 * The topic readers browse by: one of the six services, or "Insights".
 * Stored categories are often one-off labels ("2026 social media marketing
 * trends") or differ only in case ("influencer marketing" and "Influencer
 * Marketing"), so the blog groups posts by topic instead. An editor's
 * category decides when it names a service; otherwise the slug and title do.
 */
export function getMarketingBlogTopic(blog: { category?: string; slug?: string; title?: string }) {
    const category = isInternalMarketingBlogLabel(blog.category) ? "" : blog.category!;
    return (category && matchBlogTopic(category)) || matchBlogTopic(`${blog.slug || ""} ${blog.title || ""}`) || "Insights";
}

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

function isPlaceholderSchemaImage(image: unknown) {
    const node = image && typeof image === "object" ? (image as JsonLdNode) : null;
    const urls = node ? [node.url, node.contentUrl] : [image];
    return urls.some((url) => typeof url === "string" && isMarketingBlogPlaceholderImage(url));
}

function cleanBlogPostingNode(node: JsonLdNode, publicCategory: string, siteName: string): JsonLdNode {
    const next: JsonLdNode = { ...node };

    if (typeof next.articleSection !== "string" || isInternalMarketingBlogLabel(next.articleSection)) {
        next.articleSection = publicCategory;
    }

    // Drop the AI Blogger illustration that was stored for posts without an image.
    if (Array.isArray(next.image)) {
        const images = next.image.filter((image) => !isPlaceholderSchemaImage(image));
        if (images.length > 0) {
            next.image = images;
        } else {
            delete next.image;
        }
    } else if (isPlaceholderSchemaImage(next.image)) {
        delete next.image;
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
