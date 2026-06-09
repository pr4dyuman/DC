import type { MetadataRoute } from "next";

import dbConnect from "@/lib/marketing-db";
import { normalizeMarketingCanonicalUrl, toAbsoluteMarketingImageUrl } from "@/lib/marketing-blog-utils";
import Blog from "@/models/marketing/Blog";

// Published blogs are stored in MongoDB, so keep the sitemap fresh for crawlers
// immediately after a post is published or corrected.
export const dynamic = "force-dynamic";

const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://digitalcorvids.com"
).replace(/\/+$/, "");
const STATIC_LAST_MODIFIED = new Date("2026-05-17");

type MarketingSitemapBlog = {
    slug?: string;
    canonicalUrl?: string;
    image?: string;
    updatedAt?: string | Date;
    publishedAt?: string | Date;
    createdAt?: string | Date;
};

const REDIRECTED_BLOG_SLUGS = new Set([
    "how-to-manage-your-company-using-ai-powered-tools-2026-strategy",
]);

function toDate(value?: string | Date) {
    if (!value) {
        return undefined;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function withSiteUrl(path: string) {
    return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeHost(hostname: string) {
    return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function isSameSiteUrl(value: string) {
    try {
        const candidate = new URL(value);
        const site = new URL(SITE_URL);
        return normalizeHost(candidate.hostname) === normalizeHost(site.hostname);
    } catch {
        return false;
    }
}

function toSitemapPageUrl(value: string, fallbackPath: string) {
    if (isSameSiteUrl(value)) {
        return value;
    }

    return withSiteUrl(fallbackPath);
}

function toSitemapImageUrl(value?: string) {
    const imageUrl = toAbsoluteMarketingImageUrl(value, "");
    if (!imageUrl) {
        return undefined;
    }

    return /^https?:\/\//i.test(imageUrl) ? imageUrl : withSiteUrl(imageUrl);
}

function staticEntry(
    path: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number,
): MetadataRoute.Sitemap[number] {
    return {
        url: withSiteUrl(path),
        lastModified: STATIC_LAST_MODIFIED,
        changeFrequency,
        priority,
    };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticEntries: MetadataRoute.Sitemap = [
        staticEntry("/", "weekly", 1),
        staticEntry("/about", "monthly", 0.8),
        staticEntry("/portfolio", "monthly", 0.8),
        staticEntry("/services", "monthly", 0.9),
        staticEntry("/services/seo", "monthly", 0.85),
        staticEntry("/services/web-development", "monthly", 0.85),
        staticEntry("/services/ppc", "monthly", 0.8),
        staticEntry("/services/social-media-marketing", "monthly", 0.8),
        staticEntry("/services/video-production-ad", "monthly", 0.75),
        staticEntry("/services/influencer-marketing", "monthly", 0.75),
        staticEntry("/services/manage-company", "monthly", 0.75),
        staticEntry("/services/ai-blogger", "monthly", 0.75),
        staticEntry("/contact", "monthly", 0.7),
        staticEntry("/get-started", "monthly", 0.7),
        staticEntry("/blog", "daily", 0.9),
    ];

    try {
        await dbConnect();

        const blogs = await Blog.find({ status: "published" })
            .select("slug canonicalUrl image updatedAt publishedAt createdAt")
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean();

        const blogEntries: MetadataRoute.Sitemap = [];

        for (const blog of blogs as MarketingSitemapBlog[]) {
            const slug = blog.slug?.trim();
            if (!slug) {
                continue;
            }
            if (REDIRECTED_BLOG_SLUGS.has(slug)) {
                continue;
            }

            const canonicalUrl =
                normalizeMarketingCanonicalUrl(blog.canonicalUrl, slug) ||
                withSiteUrl(`/blog/${slug}`);
            const sitemapUrl = toSitemapPageUrl(canonicalUrl, `/blog/${slug}`);
            const imageUrl = toSitemapImageUrl(blog.image);

            blogEntries.push({
                url: sitemapUrl,
                lastModified:
                    toDate(blog.updatedAt) ||
                    toDate(blog.publishedAt) ||
                    toDate(blog.createdAt),
                changeFrequency: "weekly",
                priority: 0.75,
                images: imageUrl ? [imageUrl] : undefined,
            });
        }

        return [...staticEntries, ...blogEntries];
    } catch (error) {
        console.warn("[Sitemap] Failed to load published blogs for sitemap.", error);
        return staticEntries;
    }
}
