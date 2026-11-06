import { LEGACY_REDIRECTED_BLOG_SLUGS, REMOVED_BLOG_SLUGS } from "@/lib/marketing-blog-cleanup";
import dbConnect from "@/lib/marketing-db";
import Blog from "@/models/marketing/Blog";
import {
    MARKETING_DEFAULT_DESCRIPTION,
    MARKETING_SITE_NAME,
    MARKETING_SITE_URL,
    marketingAbsoluteUrl,
} from "@/lib/marketing-seo";
import { normalizeMarketingCanonicalUrl } from "@/lib/marketing-blog-utils";
import { getMarketingTemplates } from "@/lib/marketing-templates";

type LlmsBlog = {
    title?: string;
    slug?: string;
    shortDescription?: string;
    metaDescription?: string;
    category?: string;
    canonicalUrl?: string;
    updatedAt?: string | Date;
    publishedAt?: string | Date;
    createdAt?: string | Date;
};

const CORE_PAGES = [
    {
        title: "Home",
        path: "/",
        description: "Digital Corvids overview, primary services, agency positioning, and calls to action.",
    },
    {
        title: "About Digital Corvids",
        path: "/about",
        description: "Agency background, team positioning, values, and service philosophy.",
    },
    {
        title: "Services",
        path: "/services",
        description: "Index of Digital Corvids digital marketing, web, content, and AI services.",
    },
    {
        title: "Portfolio",
        path: "/portfolio",
        description: "Selected client websites and web apps, plus the website templates Digital Corvids designs and sells.",
    },
    {
        title: "Website Templates",
        path: "/templates",
        description: "Ready-made HTML and Tailwind CSS website templates with page tours, prices, and customisation options.",
    },
    {
        title: "Blog",
        path: "/blog",
        description: "Published Digital Corvids insights on SEO, marketing, content, AI workflows, and growth.",
    },
    {
        title: "Contact",
        path: "/contact",
        description: "Contact details for Digital Corvids in Jaipur, Rajasthan.",
    },
    {
        title: "Get Started",
        path: "/get-started",
        description: "Project intake and signup path for new Digital Corvids clients.",
    },
];

const SERVICE_PAGES = [
    {
        title: "SEO Services",
        path: "/services/seo",
        description: "Technical SEO, keyword strategy, content optimization, local SEO, and reporting.",
    },
    {
        title: "Web Development",
        path: "/services/web-development",
        description: "Conversion-focused website design, development, UX, technical SEO, and performance.",
    },
    {
        title: "PPC Advertising",
        path: "/services/ppc",
        description: "Google Ads, Microsoft Ads, paid social, campaign planning, bidding, and ROI reporting.",
    },
    {
        title: "Social Media Marketing",
        path: "/services/social-media-marketing",
        description: "Social strategy, content planning, paid social, community growth, and analytics.",
    },
    {
        title: "Video Production and Ad Films",
        path: "/services/video-production-ad",
        description: "Pre-production, production, editing, ad films, distribution, and performance creative.",
    },
    {
        title: "Influencer Marketing",
        path: "/services/influencer-marketing",
        description: "Creator discovery, campaign planning, collaboration, amplification, and ROI tracking.",
    },
    {
        title: "Manage Your Company With AI",
        path: "/services/manage-company",
        description: "Agency management platform for projects, finance, invoicing, team workflows, and AI assistance.",
    },
];

function normalizeHost(hostname: string) {
    return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function isSameSiteUrl(value: string) {
    try {
        const candidate = new URL(value);
        const site = new URL(MARKETING_SITE_URL);
        return normalizeHost(candidate.hostname) === normalizeHost(site.hostname);
    } catch {
        return false;
    }
}

function toSiteUrl(path: string) {
    return marketingAbsoluteUrl(path);
}

function getBlogUrl(blog: LlmsBlog) {
    const slug = blog.slug?.trim();
    if (!slug) {
        return "";
    }

    const canonicalUrl = normalizeMarketingCanonicalUrl(blog.canonicalUrl, slug);
    if (canonicalUrl && isSameSiteUrl(canonicalUrl)) {
        return canonicalUrl;
    }

    return toSiteUrl(`/blog/${slug}`);
}

function compactDescription(value?: string, fallback = "") {
    const text = (value || fallback).replace(/\s+/g, " ").trim();
    if (text.length <= 180) {
        return text;
    }

    return `${text.slice(0, 177).replace(/\s+\S*$/, "")}...`;
}

function linkLine(item: { title: string; path?: string; url?: string; description: string }) {
    const url = item.url || toSiteUrl(item.path || "/");
    return `- [${item.title}](${url}): ${item.description}`;
}

async function getPublishedBlogs(limit: number) {
    try {
        await dbConnect();

        return (await Blog.find({
            status: "published",
            slug: { $nin: [...REMOVED_BLOG_SLUGS, ...LEGACY_REDIRECTED_BLOG_SLUGS] },
        })
            .select("title slug shortDescription metaDescription category canonicalUrl updatedAt publishedAt createdAt")
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(limit)
            .lean()) as LlmsBlog[];
    } catch (error) {
        console.warn("[llms.txt] Failed to load published blogs.", error);
        return [];
    }
}

function renderBlogLines(blogs: LlmsBlog[]) {
    return blogs
        .map((blog) => {
            const title = blog.title?.trim();
            const url = getBlogUrl(blog);
            if (!title || !url) {
                return "";
            }

            const description = compactDescription(
                blog.metaDescription || blog.shortDescription,
                blog.category ? `Digital Corvids ${blog.category} insight.` : "Digital Corvids blog insight.",
            );

            return `- [${title}](${url}): ${description}`;
        })
        .filter(Boolean);
}

export async function buildMarketingLlmsText({ full = false } = {}) {
    const blogLimit = full ? 50 : 8;
    const blogs = await getPublishedBlogs(blogLimit);
    const blogLines = renderBlogLines(blogs);
    const lines = [
        `# ${MARKETING_SITE_NAME}`,
        "",
        `> ${MARKETING_DEFAULT_DESCRIPTION}`,
        "",
        "Digital Corvids is a Jaipur, Rajasthan based digital marketing agency serving businesses that need SEO, paid media, social media marketing, web development, video production, influencer marketing, and practical growth systems.",
        "",
        "This file is a navigation aid for AI assistants and research tools. Respect robots.txt, page metadata, and applicable site terms.",
        "",
        "## Site",
        `- Primary site: ${MARKETING_SITE_URL}`,
        `- Sitemap: ${toSiteUrl("/sitemap.xml")}`,
        `- Robots: ${toSiteUrl("/robots.txt")}`,
        `- Contact email: flytheraven@digitalcorvids.com`,
        `- Location: Jaipur, Rajasthan, India`,
        "",
        "## Core Pages",
        ...CORE_PAGES.map(linkLine),
        "",
        "## Services",
        ...SERVICE_PAGES.map(linkLine),
        "",
        "## Website Templates",
        ...getMarketingTemplates().map((template) =>
            linkLine({
                title: `${template.name}: ${template.title}`,
                path: template.path,
                description: `${template.summary} ${template.pageCount} pages, ${template.priceLabel} USD.`,
            }),
        ),
        "",
        "## Published Insights",
        ...(blogLines.length > 0 ? blogLines : ["- Blog list unavailable right now. Use the main blog index and sitemap."]),
        "",
    ];

    if (full) {
        lines.push(
            "## Best Pages By Intent",
            "- For agency background and trust signals: use About Digital Corvids.",
            "- For service discovery: use Services and the individual service pages.",
            "- For project inquiries: use Contact or Get Started.",
            "- For ready-made website templates to buy or have customised: use Website Templates.",
            "- For AI-assisted SEO planning and content publishing tools: use zSEO.ai (https://zseo.ai).",
            "- For agency operations software: use Manage Your Company With AI.",
            "",
            "## Public Crawling Notes",
            "- Public marketing pages are intended for indexing.",
            "- Dashboard, admin, API, login, trial-expired, and plan-expired areas are private or non-indexable.",
            "- Published blog URLs appear in sitemap.xml when their status is published.",
            "",
        );
    } else {
        lines.push(
            "## More Detail",
            `- [Full LLM context](${toSiteUrl("/llms-full.txt")}): Expanded site map, intent guidance, and more published insights.`,
            "",
        );
    }

    return `${lines.join("\n").trim()}\n`;
}
