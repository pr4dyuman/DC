import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Clock, ChevronDown, Share2 } from "lucide-react";
import { BlogPostAnalyticsTracker } from "@/components/marketing/BlogAnalyticsTrackers";
import { BlogThemeToggle } from "@/components/marketing/blog/BlogThemeToggle";
import dbConnect from "@/lib/marketing-db";
import { BlogStudioPostModel, connectDB as connectPrimaryDb } from "@/lib/mongodb";
import Blog from "@/models/marketing/Blog";
import { checkAuth } from "@/lib/authMiddleware";
import {
  cleanStoredBlogSchema,
  getMarketingBlogPublicCategory,
  isRemovedMarketingBlogSlug,
  rewriteMarketingSiteLinksToRelative,
} from "@/lib/marketing-blog-cleanup";
import { buildMarketingBlogHtml, stripStandaloneFaqSection } from "@/lib/marketing-blog-content";
import { getMarketingBlogLinks, pickRelatedMarketingBlogLinks } from "@/lib/marketing-blog-links";
import {
  isRemoteMarketingImageSrc,
  isSvgMarketingImageSrc,
  normalizeMarketingCanonicalUrl,
  normalizeMarketingImageSrc,
  toAbsoluteMarketingImageUrl,
} from "@/lib/marketing-blog-utils";
import {
  getMarketingVerificationMetadata,
  marketingAbsoluteUrl,
} from "@/lib/marketing-seo";
import { notFound } from "next/navigation";

// Blog detail pages depend on MongoDB and draft auth checks, so render them at
// request time instead of during Vercel's static prerender step.
export const dynamic = "force-dynamic";


// ─── Server-safe HTML sanitizer ────────────────────────────────────────────────
// isomorphic-dompurify is intentionally NOT used here — in Next.js 16 production,
// dompurify accesses browser globals (window/document) at module init time,
// causing a Server Component crash BEFORE rendering begins. Since our HTML content
// is already AI-generated and passed through buildMarketingBlogHtml, a targeted
// strip of dangerous patterns is both safe and sufficient.
function serverSanitizeHtml(html = "") {
  return html
    // Remove script blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove style blocks entirely
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Strip inline event handlers (onclick, onload, onerror, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Neutralise javascript: URIs
    .replace(/javascript\s*:/gi, "void:");
}
// ────────────────────────────────────────────────────────────────────────────────

export const revalidate = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://digitalcorvids.com";
const SITE_NAME = "Digital Corvids";

function getBlogUrl(slug) {
  return `${SITE_URL.replace(/\/+$/, "")}/blog/${slug}`;
}

function getBlogSocialImageUrl(value) {
  const imageUrl = toAbsoluteMarketingImageUrl(value, "/og-image");
  if (!imageUrl) {
    return marketingAbsoluteUrl("/og-image");
  }

  return /^https?:\/\//i.test(imageUrl) ? imageUrl : marketingAbsoluteUrl(imageUrl);
}

function getBlogArticleImageUrl(value) {
  const imageUrl = toAbsoluteMarketingImageUrl(value, "");
  if (!imageUrl) {
    return "";
  }

  return /^https?:\/\//i.test(imageUrl) ? imageUrl : marketingAbsoluteUrl(imageUrl);
}

function stripHtml(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFaqItems(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      question: typeof item?.question === "string" ? item.question.trim() : "",
      answer: typeof item?.answer === "string" ? item.answer.trim() : "",
    }))
    .filter((item) => item.question && item.answer);
}

function getStoredFaqItems(blog) {
  return normalizeFaqItems(blog?.faqItems);
}

function getExternalSourceHref(source) {
  const rawUrl = typeof source?.url === "string" ? source.url.trim() : "";
  if (!rawUrl) {
    return "";
  }

  try {
    const parsed = new URL(rawUrl);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function contentHasReferenceSection(htmlContent = "") {
  return /<h[2-3][^>]*>\s*(?:sources?|references)\s*<\/h[2-3]>/i.test(htmlContent);
}

function buildEmergencyDescription(blog) {
  const plainText = stripHtml(blog.content || "");
  if (!plainText) {
    return blog.title;
  }

  return plainText.length <= 160
    ? plainText
    : `${plainText.slice(0, 157).trimEnd()}...`;
}

function getBlogDescription(blog) {
  return (
    blog.metaDescription?.trim() ||
    blog.shortDescription?.trim() ||
    buildEmergencyDescription(blog)
  );
}

function getBlogDisplayDescription(blog) {
  return (
    blog.shortDescription?.trim() ||
    blog.metaDescription?.trim() ||
    buildEmergencyDescription(blog)
  );
}

function getBlogKeywords(blog) {
  return blog.metaKeywords
    ? blog.metaKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

const MARKETING_SERVICE_LINKS = [
  {
    key: "seo",
    title: "SEO Services",
    href: "/services/seo",
    description: "Improve technical SEO, content structure, rankings, and organic visibility.",
    keywords: ["seo", "search engine", "organic", "keyword", "ranking", "content distribution"],
  },
  {
    key: "web-development",
    title: "Web Development",
    href: "/services/web-development",
    description: "Build fast, conversion-focused websites and landing pages for campaign traffic.",
    keywords: ["web development", "website", "web design", "landing page", "ecommerce", "e-commerce"],
  },
  {
    key: "ppc",
    title: "PPC Advertising",
    href: "/services/ppc",
    description: "Turn paid media, search ads, and campaign budgets into measurable demand.",
    keywords: ["ppc", "paid media", "paid search", "ads", "advertising", "roi", "roas", "media strategy"],
  },
  {
    key: "social-media-marketing",
    title: "Social Media Marketing",
    href: "/services/social-media-marketing",
    description: "Plan platform-specific social content, campaigns, calendars, and community growth.",
    keywords: ["social media", "instagram", "linkedin", "reels", "carousel", "viral", "content calendar"],
  },
  {
    key: "video-production-ad",
    title: "Video Production Ads",
    href: "/services/video-production-ad",
    description: "Create video, ad films, pre-production systems, and platform-ready creative assets.",
    keywords: ["video", "production", "pre-production", "storytelling", "creative", "youtube"],
  },
  {
    key: "influencer-marketing",
    title: "Influencer Marketing",
    href: "/services/influencer-marketing",
    description: "Build creator partnerships, influencer campaigns, audience trust, and ROI tracking.",
    keywords: ["influencer", "creator", "youtube", "campaign", "brand voice"],
  },
  {
    key: "manage-company",
    title: "Manage Company",
    href: "/services/manage-company",
    description: "Connect agency operations, projects, finances, workflows, and AI-powered management.",
    keywords: ["agency operations", "financial intelligence", "manage your company", "company", "workflows"],
  },
  {
    key: "ai-blogger",
    title: "AI Blogger",
    href: "/services/ai-blogger",
    description: "Plan, generate, optimize, and schedule SEO-focused blog content from one workflow.",
    keywords: ["ai blogger", "ai", "blog", "content workflow", "content", "generated assets"],
  },
];

const BLOG_SERVICE_LINK_OVERRIDES = {
  "2026-platform-specific-social-media-strategy-framework-ai-scaling": [
    "social-media-marketing",
    "ai-blogger",
    "video-production-ad",
    "influencer-marketing",
  ],
  "2026-social-media-marketing-trends-operationalizing-ai-and-creative": [
    "social-media-marketing",
    "ai-blogger",
    "video-production-ad",
  ],
  "2026-viral-worthy-content-calendar-strategy-for-reels-and-carousels": [
    "social-media-marketing",
    "ai-blogger",
    "video-production-ad",
    "influencer-marketing",
  ],
  "ai-trends-for-content-creators-2026-the-geo-playbook": [
    "ai-blogger",
    "social-media-marketing",
    "video-production-ad",
    "influencer-marketing",
  ],
  "ajio-22feet-a-winning-fashion-e-commerce-digital-expansion-strategy": [
    "ppc",
    "web-development",
    "ai-blogger",
  ],
  "amplify-your-brand-voice-with-authentic-content-and-influencer-marketing": [
    "influencer-marketing",
    "social-media-marketing",
    "ai-blogger",
  ],
  "best-seo-agency-in-jaipur-choose-an-ethical-partner": [
    "seo",
    "ai-blogger",
    "web-development",
    "ppc",
  ],
  "brand-voice-insurance-editorial-guardrails-for-ai-generated-assets": [
    "ai-blogger",
    "seo",
    "influencer-marketing",
  ],
  "building-data-driven-ppc-campaigns-the-modern-roi-framework": [
    "ppc",
    "ai-blogger",
    "seo",
    "social-media-marketing",
  ],
  "conversion-funnel-mapping-and-optimization-to-stop-leaks": [
    "ppc",
    "ai-blogger",
    "web-development",
    "social-media-marketing",
  ],
  "digital-production-vs-digital-marketing-strategy-the-2026-gap": [
    "video-production-ad",
    "web-development",
    "ai-blogger",
  ],
  "enterprise-ai-distribution-strategy-2026-scaling-agentic-workflows": [
    "ai-blogger",
    "manage-company",
    "seo",
  ],
  "how-ai-powered-financial-intelligence-improves-agency-operations-2026": [
    "manage-company",
    "ai-blogger",
  ],
  "how-to-build-a-high-roi-content-distribution-engine-for-2026": [
    "ai-blogger",
    "ppc",
    "seo",
  ],
  "how-to-build-a-storytelling-campaign-strategy-the-2026-model": [
    "video-production-ad",
    "influencer-marketing",
    "social-media-marketing",
    "ai-blogger",
  ],
  "how-to-manage-your-company-with-ai-driven-workflows-in-2026": [
    "manage-company",
    "ai-blogger",
  ],
  "how-to-measure-video-production-success-the-performance-framework": [
    "video-production-ad",
    "ai-blogger",
    "ppc",
    "social-media-marketing",
  ],
  "how-to-scale-influencer-content-with-paid-media-playbook": [
    "influencer-marketing",
    "ai-blogger",
    "ppc",
    "social-media-marketing",
  ],
  "influencer-marketing-strategy-that-drives-results-5-step-guide": [
    "influencer-marketing",
    "ai-blogger",
    "social-media-marketing",
    "video-production-ad",
  ],
  "influencer-marketing-attribution-models-beyond-promo-codes": [
    "influencer-marketing",
    "ai-blogger",
    "ppc",
    "seo",
  ],
  "media-strategy-guide-2026-scaling-impact-with-hybrid-models": [
    "ppc",
    "video-production-ad",
    "influencer-marketing",
    "ai-blogger",
  ],
  "pre-production-strategy-for-digital-content-engines-scale-in-2026": [
    "video-production-ad",
    "web-development",
    "ai-blogger",
  ],
  "scaling-b2b-video-production-on-linkedin-beyond-the-feed": [
    "video-production-ad",
    "social-media-marketing",
    "influencer-marketing",
    "ai-blogger",
  ],
  "scaling-performance-influencer-marketing-with-paid-media-allowlisting": [
    "influencer-marketing",
    "ai-blogger",
    "ppc",
    "social-media-marketing",
  ],
  "the-2026-production-mandate-balancing-speed-and-quality": [
    "video-production-ad",
    "ai-blogger",
    "manage-company",
    "seo",
  ],
  "the-2026-seo-management-workflow-scaling-content-with-ai": [
    "seo",
    "ai-blogger",
  ],
  "using-ai-to-optimize-influencer-marketing-roi-a-2026-strategy": [
    "influencer-marketing",
    "ai-blogger",
    "ppc",
  ],
  "vertical-specific-influencer-campaign-management-the-framework": [
    "influencer-marketing",
    "ai-blogger",
    "video-production-ad",
  ],
  "vertical-specific-marketing-strategies-a-production-first-framework": [
    "influencer-marketing",
    "video-production-ad",
    "social-media-marketing",
    "ai-blogger",
  ],
  "what-is-included-in-ppc-advertising-services-the-video-edge": [
    "ppc",
    "ai-blogger",
    "video-production-ad",
    "seo",
  ],
  "youtube-influencer-marketing-campaign-best-practices-the-roi-guide": [
    "influencer-marketing",
    "video-production-ad",
    "ai-blogger",
  ],
};

function uniqueServiceKeys(keys = []) {
  return [...new Set(keys.filter(Boolean))];
}

function getRelatedServiceLinks(blog) {
  const serviceByKey = new Map(MARKETING_SERVICE_LINKS.map((service) => [service.key, service]));
  const explicitKeys = BLOG_SERVICE_LINK_OVERRIDES[blog.slug] || [];
  const searchText = [
    blog.slug,
    blog.title,
    blog.category,
    blog.shortDescription,
    blog.metaDescription,
    blog.metaKeywords,
    stripHtml(blog.content || "").slice(0, 3000),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchedKeys = MARKETING_SERVICE_LINKS.filter((service) =>
    service.key !== "ai-blogger" && service.keywords.some((keyword) => searchText.includes(keyword))
  ).map((service) => service.key);

  return uniqueServiceKeys([...explicitKeys, ...matchedKeys, "ai-blogger"])
    .map((key) => serviceByKey.get(key))
    .filter(Boolean)
    .slice(0, 4);
}

function getReadTimeLabel(content = "") {
  const plainText = stripHtml(content);
  return `${Math.max(
    1,
    Math.ceil(plainText.split(/\s+/).filter(Boolean).length / 200)
  )} min read`;
}

function extractHeadingsFromHtml(htmlContent = "") {
  if (!htmlContent) {
    return [];
  }

  const headings = [];
  const regex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi;
  let match;
  let index = 0;

  while ((match = regex.exec(htmlContent)) !== null) {
    const level = Number.parseInt(match[1], 10);
    const text = stripHtml(match[2]);

    if (!text) {
      continue;
    }

    headings.push({
      id: `heading-${index}`,
      level,
      text,
    });
    index += 1;
  }

  return headings;
}

function addHeadingIdsToHtml(htmlContent = "", headings = []) {
  if (!htmlContent || headings.length === 0) {
    return htmlContent;
  }

  const matches = [...htmlContent.matchAll(/<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi)];
  let result = htmlContent;

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const level = match[1];
    const innerHtml = match[2];
    const headingId = headings[index]?.id;

    if (!headingId) {
      continue;
    }

    result = result.replace(match[0], `<h${level} id="${headingId}">${innerHtml}</h${level}>`);
  }

  return result;
}

function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function preferBlogPostingSchemaType(value) {
  if (Array.isArray(value)) {
    return value.map(preferBlogPostingSchemaType);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const type = value["@type"];
  const normalizedType =
    type === "Article"
      ? "BlogPosting"
      : Array.isArray(type)
        ? type.map((item) => (item === "Article" ? "BlogPosting" : item))
        : type;

  return {
    ...value,
    ...(normalizedType ? { "@type": normalizedType } : {}),
  };
}

function buildFallbackSchemaMarkup(blog) {
  const canonicalUrl =
    normalizeMarketingCanonicalUrl(blog.canonicalUrl, blog.slug) || getBlogUrl(blog.slug);
  const imageUrl = getBlogArticleImageUrl(blog.image);
  const description = getBlogDescription(blog);
  const publishedAt = blog.publishedAt || blog.createdAt;
  const updatedAt = blog.updatedAt || publishedAt;
  const storedFaqItems = getStoredFaqItems(blog);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.metaTitle || blog.title,
    description,
    image: imageUrl
      ? [
          {
            "@type": "ImageObject",
            url: imageUrl,
            caption: blog.imageAlt || blog.title,
          },
        ]
      : undefined,
    datePublished: publishedAt,
    dateModified: updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    keywords: blog.metaKeywords || undefined,
    articleSection: blog.category || "INSIGHTS",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL.replace(/\/+$/, "")}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: blog.title,
        item: canonicalUrl,
      },
    ],
  };

  const faqSchema =
    storedFaqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: storedFaqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return serializeJsonLd([articleSchema, breadcrumbSchema, faqSchema].filter(Boolean));
}

function resolveSchemaMarkup(blog) {
  if (blog.schemaMarkup?.trim()) {
    try {
      return serializeJsonLd(
        cleanStoredBlogSchema(
          preferBlogPostingSchemaType(JSON.parse(blog.schemaMarkup)),
          blog.category || "Insights",
          SITE_NAME,
        ),
      );
    } catch {
      return buildFallbackSchemaMarkup(blog);
    }
  }

  return buildFallbackSchemaMarkup(blog);
}

function getResolvedBlogSeo(blog) {
  const canonicalUrl =
    normalizeMarketingCanonicalUrl(blog.canonicalUrl, blog.slug) || getBlogUrl(blog.slug);
  const title = blog.metaTitle?.trim() || `${blog.title} | ${SITE_NAME}`;
  const description = getBlogDescription(blog);
  const displayDescription = getBlogDisplayDescription(blog);
  const imageUrl = getBlogSocialImageUrl(blog.image);
  const imageAlt = blog.imageAlt?.trim() || blog.title;
  const keywords = getBlogKeywords(blog);
  const publishedAt = blog.publishedAt || blog.createdAt;
  const updatedAt = blog.updatedAt || publishedAt;
  const schemaMarkup = resolveSchemaMarkup(blog);

  return {
    canonicalUrl,
    title,
    description,
    displayDescription,
    imageUrl,
    imageAlt,
    keywords,
    publishedAt,
    updatedAt,
    schemaMarkup,
  };
}

function toIsoDate(value, fallback) {
  const candidate = value ?? fallback;
  if (!candidate) {
    return undefined;
  }

  const parsed = candidate instanceof Date ? candidate : new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function canViewDraftBlog() {
  try {
    const auth = await checkAuth();
    return auth.authorized === true;
  } catch (error) {
    console.warn("[Blog Page] Marketing admin auth check failed, falling back to public mode.", error);
    return false;
  }
}

async function getBlog(slug) {
  if (isRemovedMarketingBlogSlug(slug)) {
    return null;
  }

  try {
    await dbConnect();
    const isAdmin = await canViewDraftBlog();

    let blog = await Blog.findOne(
      isAdmin ? { slug } : { slug, status: "published" }
    ).lean();

    if (!blog && /^[0-9a-fA-F]{24}$/.test(slug)) {
      blog = await Blog.findOne(
        isAdmin ? { _id: slug } : { _id: slug, status: "published" }
      ).lean();
    }

    if (!blog) {
      return null;
    }

    let resolvedExternalSources = Array.isArray(blog.externalSources) ? blog.externalSources : [];
    if (resolvedExternalSources.length === 0 && typeof blog.sourcePostId === "string" && blog.sourcePostId.trim()) {
      try {
        await connectPrimaryDb();
        const sourcePost = await BlogStudioPostModel.findOne({ id: blog.sourcePostId.trim() })
          .select("externalSources")
          .lean();
        resolvedExternalSources = Array.isArray(sourcePost?.externalSources) ? sourcePost.externalSources : [];
      } catch (sourceError) {
        console.warn("[Blog Page] Failed to hydrate external sources from AI Blogger post:", blog.sourcePostId, sourceError);
      }
    }

    // Serialize MongoDB ObjectId fields to plain strings to prevent
    // React Server Component serialization failures in production.
    const serializeInternalLinks = (links) => {
      if (!Array.isArray(links)) return [];
      return links.map((link) => ({
        ...link,
        _id: link._id ? link._id.toString() : undefined,
      }));
    };

    const serializeExternalSources = (sources) => {
      if (!Array.isArray(sources)) return [];
      return sources.map((source) => ({
        ...source,
        _id: source._id ? source._id.toString() : undefined,
      }));
    };

    return {
      ...blog,
      _id: blog._id.toString(),
      category: getMarketingBlogPublicCategory(blog),
      image: normalizeMarketingImageSrc(blog.image, ""),
      canonicalUrl: normalizeMarketingCanonicalUrl(blog.canonicalUrl, blog.slug),
      publishedAt: toIsoDate(blog.publishedAt),
      createdAt: toIsoDate(blog.createdAt) || new Date().toISOString(),
      updatedAt: toIsoDate(blog.updatedAt, blog.createdAt) || new Date().toISOString(),
      internalLinks: serializeInternalLinks(blog.internalLinks),
      externalSources: serializeExternalSources(resolvedExternalSources),
      faqItems: Array.isArray(blog.faqItems)
        ? blog.faqItems.map((item) => ({ ...item, _id: item._id ? item._id.toString() : undefined }))
        : [],
      peopleAlsoAsk: Array.isArray(blog.peopleAlsoAsk) ? blog.peopleAlsoAsk : [],
    };
  } catch (error) {
    console.error("[Blog Page] Failed to fetch blog:", slug, error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  try {
    const resolvedParams = await params;
    const blog = await getBlog(resolvedParams.slug);

    if (!blog) {
      return { title: "Not Found" };
    }

    const seo = getResolvedBlogSeo(blog);

    return {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords.length > 0 ? seo.keywords : undefined,
      verification: getMarketingVerificationMetadata(),
      alternates: {
        canonical: seo.canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
      openGraph: {
        type: "article",
        url: seo.canonicalUrl,
        title: seo.title,
        description: seo.description,
        publishedTime: seo.publishedAt,
        modifiedTime: seo.updatedAt,
        authors: [SITE_NAME],
        section: blog.category || "Insights",
        siteName: SITE_NAME,
        tags: seo.keywords.length > 0 ? seo.keywords : undefined,
        images: [
          {
            url: seo.imageUrl,
            width: 1200,
            height: 630,
            alt: seo.imageAlt,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: seo.title,
        description: seo.description,
        images: [seo.imageUrl],
      },
    };
  } catch (error) {
    console.error("[Blog Page] generateMetadata failed:", error);
    return {
      title: `${SITE_NAME} | Blog`,
      description: "Read our latest insights and articles.",
    };
  }
}

export default async function BlogPost({ params }) {
  const resolvedParams = await params;
  const [post, blogLinks] = await Promise.all([
    getBlog(resolvedParams.slug),
    getMarketingBlogLinks(),
  ]);

  if (!post) {
    notFound();
  }

  const seo = getResolvedBlogSeo(post);
  const category = post.category || "INSIGHTS";
  const author = SITE_NAME;
  const dateStr = new Date(seo.publishedAt || post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const faqItems = getStoredFaqItems(post);
  const renderedContent = buildMarketingBlogHtml(post.content, {
    internalLinks: post.internalLinks,
    siteUrl: SITE_URL,
    externalSources: post.externalSources,
  });
  const visibleSources = contentHasReferenceSection(renderedContent)
    ? []
    : (post.externalSources || [])
        .map((source) => ({
          href: getExternalSourceHref(source),
          title: source?.title?.trim() || source?.domain?.trim() || "Source",
          domain: source?.domain?.trim() || "",
        }))
        .filter((source) => source.href && source.title)
        .slice(0, 6);
  const contentWithoutInlineFaq = faqItems.length > 0
    ? stripStandaloneFaqSection(renderedContent)
    : renderedContent;
  const headings = extractHeadingsFromHtml(contentWithoutInlineFaq);
  const shouldShowToc = headings.length >= 2;
  const contentWithHeadingIds = shouldShowToc
    ? addHeadingIdsToHtml(contentWithoutInlineFaq, headings)
    : contentWithoutInlineFaq;
  const sanitizedContent = rewriteMarketingSiteLinksToRelative(serverSanitizeHtml(contentWithHeadingIds));
  const readTime = getReadTimeLabel(contentWithoutInlineFaq || post.content);
  const relatedServiceLinks = getRelatedServiceLinks(post);
  const relatedPosts = pickRelatedMarketingBlogLinks(blogLinks, post);

  const heroImageSrc = normalizeMarketingImageSrc(post.image, "");
  const isDefaultImage = heroImageSrc?.includes("ai-blogger.svg");
  const showImage = Boolean(heroImageSrc) && !isDefaultImage;
  const useNativeHeroImage = isRemoteMarketingImageSrc(heroImageSrc);
  const isSvgHeroImage = isSvgMarketingImageSrc(heroImageSrc);

  const shareUrl = encodeURIComponent(seo.canonicalUrl);
  const shareTitle = encodeURIComponent(post.title);
  const shareLinks = [
    {
      name: "Twitter / X",
      href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.733-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--blog-bg)] font-sans text-[var(--blog-text)] selection:bg-[var(--blog-accent)] selection:text-[var(--blog-accent-ink)]">
      <BlogPostAnalyticsTracker slug={post.slug} category={category} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: seo.schemaMarkup }} />

      <article>
        {/* ── Hero Image ── */}
        {showImage && (
          <div className="relative h-[34vh] min-h-[240px] max-h-[720px] w-full overflow-hidden sm:h-[46vh] sm:min-h-[340px] lg:h-[58vh] lg:min-h-[440px]">
            {useNativeHeroImage ? (
              <img
                src={heroImageSrc}
                alt={seo.imageAlt}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={heroImageSrc}
                alt={seo.imageAlt}
                fill
                sizes="100vw"
                className="object-cover"
                priority
                unoptimized={isSvgHeroImage}
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, var(--blog-bg) 0%, color-mix(in srgb, var(--blog-bg) 72%, transparent) 42%, transparent 78%)",
              }}
            />
          </div>
        )}

        {/* ── Wide article shell ── */}
        <div className={`relative ${showImage ? "-mt-20 z-10 sm:-mt-28 lg:-mt-36" : "pt-8 sm:pt-12 lg:pt-16"}`}>
          <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-12">
            {/* ── Article header ── */}
            <header className="-mx-4 mb-6 border-y border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-7 shadow-[var(--blog-shadow)] sm:mx-0 sm:rounded-2xl sm:border sm:p-8 lg:p-10 xl:p-12">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <Link
                  href="/blog"
                  className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--blog-muted)] transition-colors hover:text-[var(--blog-link)]"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  All Articles
                </Link>

                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <span className="inline-flex items-center rounded-full border border-[var(--blog-border)] bg-[var(--blog-surface-muted)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--blog-link)] sm:px-4">
                    {category}
                  </span>
                  <BlogThemeToggle />
                </div>
              </div>

              <h1 className="mb-6 text-balance font-sans text-3xl font-extrabold leading-[1.04] tracking-[-0.035em] text-[var(--blog-heading)] sm:text-5xl lg:text-6xl xl:text-[4.5rem]">
                {post.title}
              </h1>

              <p className="mb-8 w-full text-lg leading-8 text-[var(--blog-text)] sm:text-xl sm:leading-9 lg:text-2xl lg:leading-10">
                {seo.displayDescription}
              </p>

              <div className="flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-[var(--blog-border)] pt-6 text-sm text-[var(--blog-muted)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--blog-border)] bg-[var(--blog-surface-muted)]">
                    <User className="h-4 w-4 text-[var(--blog-link)]" />
                  </span>
                  <span className="font-semibold text-[var(--blog-text)]">{author}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--blog-border)] bg-[var(--blog-surface-muted)]">
                    <Calendar className="h-4 w-4 text-[var(--blog-link)]" />
                  </span>
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--blog-border)] bg-[var(--blog-surface-muted)]">
                    <Clock className="h-4 w-4 text-[var(--blog-link)]" />
                  </span>
                  <span>{readTime}</span>
                </div>
              </div>
            </header>

            <div className="flex items-start gap-8 xl:gap-10 2xl:gap-12">
              {/* ── Desktop TOC ── */}
              {shouldShowToc && (
                <aside className="sticky top-8 hidden w-72 shrink-0 xl:block">
                  <div className="rounded-2xl border border-[var(--blog-border)] bg-[var(--blog-surface)] p-6 shadow-[var(--blog-shadow)]">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--blog-link)]">
                      On This Page
                    </p>
                    <nav className="space-y-1">
                      {headings.map((heading) => (
                        <a
                          key={heading.id}
                          href={`#${heading.id}`}
                          data-blog-analytics="toc"
                          className={`block rounded-lg px-3 py-2 transition-colors hover:bg-[var(--blog-surface-muted)] hover:text-[var(--blog-link)] ${
                            heading.level === 2
                              ? "text-sm font-semibold text-[var(--blog-text)]"
                              : "ml-3 text-xs text-[var(--blog-muted)]"
                          }`}
                        >
                          {heading.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}

              <div className="min-w-0 flex-1">
                {/* Collapsible TOC below desktop */}
                {shouldShowToc && (
                  <details className="group -mx-4 mb-6 overflow-hidden border-y border-[var(--blog-border)] bg-[var(--blog-surface)] sm:mx-0 sm:rounded-2xl sm:border xl:hidden">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-[var(--blog-surface-muted)] sm:px-6">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--blog-link)]">
                        On This Page
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--blog-muted)] transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-[var(--blog-border)] px-4 py-4 sm:px-6">
                      <nav className="space-y-1">
                        {headings.map((heading) => (
                          <a
                            key={heading.id}
                            href={`#${heading.id}`}
                            data-blog-analytics="toc"
                            className={`flex min-h-11 items-center py-2 transition-colors hover:text-[var(--blog-link)] ${
                              heading.level === 2
                                ? "text-sm font-semibold text-[var(--blog-text)]"
                                : "ml-4 text-xs text-[var(--blog-muted)]"
                            }`}
                          >
                            {heading.text}
                          </a>
                        ))}
                      </nav>
                    </div>
                  </details>
                )}

                {/* ── Article Body ── */}
                <div className="-mx-4 mb-6 border-y border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-8 sm:mx-0 sm:rounded-2xl sm:border sm:p-8 lg:p-10 2xl:p-14">
                  <div
                    className="blog-prose"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                </div>

                {relatedServiceLinks.length > 0 && (
                  <section className="-mx-4 mb-6 border-y border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-7 sm:mx-0 sm:rounded-2xl sm:border sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--blog-link)]">
                      Related Services
                    </p>
                    <h2 className="mb-3 font-sans text-2xl font-bold tracking-tight text-[var(--blog-heading)] sm:text-3xl">
                      Turn This Strategy Into Execution
                    </h2>
                    <p className="mb-6 text-sm leading-6 text-[var(--blog-muted)] sm:text-base">
                      Explore the Digital Corvids services that connect most directly with this article.
                    </p>
                    <div className="divide-y divide-[var(--blog-border)] border-y border-[var(--blog-border)]">
                      {relatedServiceLinks.map((service) => (
                        <Link
                          key={service.href}
                          href={service.href}
                          data-blog-analytics="related-service"
                          className="group block px-1 py-5 transition-colors hover:bg-[var(--blog-surface-muted)] sm:px-3"
                        >
                          <span className="block text-base font-bold text-[var(--blog-heading)] transition-colors group-hover:text-[var(--blog-link)]">
                            {service.title}
                          </span>
                          <span className="mt-1.5 block text-sm leading-6 text-[var(--blog-muted)]">
                            {service.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {visibleSources.length > 0 && (
                  <section className="-mx-4 mb-6 border-y border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-7 sm:mx-0 sm:rounded-2xl sm:border sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--blog-link)]">
                      Sources
                    </p>
                    <h2 className="mb-5 font-sans text-2xl font-bold tracking-tight text-[var(--blog-heading)] sm:text-3xl">
                      Research References
                    </h2>
                    <ol className="space-y-3">
                      {visibleSources.map((source, index) => (
                        <li key={`${source.href}-${index}`} className="text-sm leading-6 text-[var(--blog-text)]">
                          <a
                            href={source.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-blog-analytics="source"
                            className="font-semibold text-[var(--blog-link)] underline decoration-[var(--blog-border)] underline-offset-4 transition-colors hover:decoration-[var(--blog-link)]"
                          >
                            {source.title}
                          </a>
                          {source.domain ? (
                            <span className="ml-2 text-[var(--blog-muted)]">({source.domain})</span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {/* FAQ Section */}
                {faqItems.length > 0 && (
                  <section className="-mx-4 mb-6 overflow-hidden border-y border-[var(--blog-border)] bg-[var(--blog-surface)] sm:mx-0 sm:rounded-2xl sm:border">
                    <div className="px-4 pb-4 pt-7 sm:px-8 sm:pt-8">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--blog-link)]">
                        FAQ
                      </p>
                      <h2 className="font-sans text-2xl font-bold tracking-tight text-[var(--blog-heading)] sm:text-3xl">
                        Frequently Asked Questions
                      </h2>
                    </div>
                    <div className="space-y-3 px-4 pb-7 sm:px-8 sm:pb-8">
                      {faqItems.map((item, index) => (
                        <details
                          key={`faq-${index}`}
                          className="group overflow-hidden rounded-xl border border-[var(--blog-border)] bg-[var(--blog-surface-muted)] transition-colors hover:border-[var(--blog-accent)]"
                          open={index === 0}
                        >
                          <summary
                            className="flex cursor-pointer items-start justify-between gap-4 p-5 transition-colors hover:bg-[var(--blog-surface)]"
                            data-blog-faq-toggle="true"
                            data-blog-faq-position={index + 1}
                          >
                            <span className="font-sans text-base font-bold leading-snug text-[var(--blog-heading)]">
                              {item.question}
                            </span>
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blog-link)] transition-transform group-open:rotate-180" />
                          </summary>
                          <div
                            className="blog-prose blog-prose-sm border-t border-[var(--blog-border)] px-5 pb-5 pt-4"
                            dangerouslySetInnerHTML={{
                              __html: rewriteMarketingSiteLinksToRelative(
                                serverSanitizeHtml(
                                  buildMarketingBlogHtml(item.answer, { siteUrl: SITE_URL })
                                )
                              ),
                            }}
                          />
                        </details>
                      ))}
                    </div>
                  </section>
                )}

                {relatedPosts.length > 0 && (
                  <section className="-mx-4 mb-6 border-y border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-7 sm:mx-0 sm:rounded-2xl sm:border sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--blog-link)]">
                      Related Articles
                    </p>
                    <h2 className="mb-6 font-sans text-2xl font-bold tracking-tight text-[var(--blog-heading)] sm:text-3xl">
                      Keep Reading
                    </h2>
                    <div className="divide-y divide-[var(--blog-border)] border-y border-[var(--blog-border)]">
                      {relatedPosts.map((related) => (
                        <Link
                          key={related.href}
                          href={related.href}
                          data-blog-analytics="related-post"
                          className="group block px-1 py-5 transition-colors hover:bg-[var(--blog-surface-muted)] sm:px-3"
                        >
                          <span className="block text-base font-bold text-[var(--blog-heading)] transition-colors group-hover:text-[var(--blog-link)]">
                            {related.title}
                          </span>
                          {related.description ? (
                            <span className="mt-1.5 block text-sm leading-6 text-[var(--blog-muted)]">
                              {related.description}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Share Section */}
                <section className="-mx-4 border-y border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-6 sm:mx-0 sm:rounded-2xl sm:border sm:p-8">
                  <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--blog-accent)] text-[var(--blog-accent-ink)]">
                        <Share2 className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-sans text-lg font-bold text-[var(--blog-heading)]">Share this article</p>
                        <p className="mt-0.5 text-xs text-[var(--blog-muted)]">Spread the knowledge</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {shareLinks.map((platform) => (
                        <a
                          key={platform.name}
                          href={platform.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Share on ${platform.name}`}
                          data-blog-analytics="share"
                          data-share-platform={platform.name}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[var(--blog-border)] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[var(--blog-text)] transition-colors hover:border-[var(--blog-accent)] hover:bg-[var(--blog-accent)] hover:text-[var(--blog-accent-ink)]"
                        >
                          {platform.icon}
                          <span className="hidden sm:inline">{platform.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>

                <div className="mt-8 text-center">
                  <Link
                    href="/blog"
                    className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--blog-muted)] transition-colors hover:text-[var(--blog-link)]"
                  >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to all articles
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-16 sm:pb-20" />
      </article>
    </div>
  );
}
