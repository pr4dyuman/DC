import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Clock, ChevronDown, Share2 } from "lucide-react";
import dbConnect from "@/lib/marketing-db";
import { BlogStudioPostModel, connectDB as connectPrimaryDb } from "@/lib/mongodb";
import Blog from "@/models/marketing/Blog";
import { checkAuth } from "@/lib/authMiddleware";
import { buildMarketingBlogHtml, stripStandaloneFaqSection } from "@/lib/marketing-blog-content";
import {
  isRemoteMarketingImageSrc,
  isSvgMarketingImageSrc,
  normalizeMarketingCanonicalUrl,
  normalizeMarketingImageSrc,
  toAbsoluteMarketingImageUrl,
} from "@/lib/marketing-blog-utils";
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

function normalizeQuestionList(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());
}

function getStoredFaqItems(blog) {
  return normalizeFaqItems(blog?.faqItems);
}

function getPeopleAlsoAskQuestions(blog) {
  return normalizeQuestionList(blog?.peopleAlsoAsk);
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
  const imageUrl = toAbsoluteMarketingImageUrl(blog.image);
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
      return serializeJsonLd(preferBlogPostingSchemaType(JSON.parse(blog.schemaMarkup)));
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
  const imageUrl = toAbsoluteMarketingImageUrl(blog.image);
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
      image: normalizeMarketingImageSrc(blog.image),
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
      alternates: {
        canonical: seo.canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
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
        images: seo.imageUrl ? [{ url: seo.imageUrl, alt: seo.imageAlt }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: seo.title,
        description: seo.description,
        images: seo.imageUrl ? [seo.imageUrl] : undefined,
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
  const post = await getBlog(resolvedParams.slug);

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
  const peopleAlsoAsk = getPeopleAlsoAskQuestions(post).slice(0, 6);
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
  const sanitizedContent = serverSanitizeHtml(contentWithHeadingIds);
  const readTime = getReadTimeLabel(contentWithoutInlineFaq || post.content);

  const heroImageSrc = normalizeMarketingImageSrc(post.image);
  const isDefaultImage = heroImageSrc?.includes("ai-blogger.svg");
  const showImage = heroImageSrc && !isDefaultImage;
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
    <div className="bg-black min-h-screen flex flex-col font-glacial text-white selection:bg-[#F5EE30] selection:text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: seo.schemaMarkup }} />

      <article className="flex-grow">
        {/* ── Hero Image ── */}
        {showImage && (
          <div className="relative w-full h-[60vh] min-h-[420px] max-h-[700px] overflow-hidden">
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
            {/* multi-stop gradient for smooth content merge */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            {/* subtle vignette sides */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
          </div>
        )}

        {/* ── Main Content Area ── */}
        <div className={`relative ${showImage ? "-mt-32 z-10" : "pt-16"}`}>
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">

            {/* ── Header Card ── */}
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-8 md:p-12 mb-8 shadow-2xl">

              {/* breadcrumb + category */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-gray-400 hover:text-[#F5EE30] transition-colors text-sm font-medium group"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  All Articles
                </Link>
                <span className="inline-flex items-center gap-1.5 bg-[#F5EE30]/10 border border-[#F5EE30]/20 text-[#F5EE30] px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full">
                  {category}
                </span>
              </div>

              {/* title */}
              <h1 className="font-etna text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.15] mb-6 text-white">
                {post.title}
              </h1>

              {/* description */}
              <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-8 max-w-3xl">
                {seo.displayDescription}
              </p>

              {/* meta row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 border-t border-white/[0.07]">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-7 h-7 rounded-full bg-[#F5EE30]/10 border border-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-[#F5EE30]" />
                  </div>
                  <span className="font-medium text-gray-300">{author}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-7 h-7 rounded-full bg-[#F5EE30]/10 border border-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-[#F5EE30]" />
                  </div>
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-7 h-7 rounded-full bg-[#F5EE30]/10 border border-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[#F5EE30]" />
                  </div>
                  <span>{readTime}</span>
                </div>
              </div>
            </div>

            {/* ── Two-column layout: Sidebar + Content ── */}
            <div className="flex gap-8 items-start">

              {/* ── Left: TOC Sidebar (desktop) ── */}
              {shouldShowToc && (
                <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-8">
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5EE30] mb-4">
                      On This Page
                    </p>
                    <nav className="space-y-1">
                      {headings.map((heading) => (
                        <a
                          key={heading.id}
                          href={`#${heading.id}`}
                          className={`block text-sm py-1.5 px-3 rounded-lg transition-all hover:bg-[#F5EE30]/5 hover:text-[#F5EE30] ${
                            heading.level === 2
                              ? "text-gray-300 font-medium"
                              : "text-gray-500 ml-3 text-xs"
                          }`}
                        >
                          {heading.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}

              {/* ── Right: Main Article Content ── */}
              <div className="flex-1 min-w-0">

                {/* Mobile TOC */}
                {shouldShowToc && (
                  <details className="lg:hidden mb-6 bg-[#0d0d0d] border border-white/[0.07] rounded-xl overflow-hidden group">
                    <summary className="flex items-center justify-between cursor-pointer px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#F5EE30]">
                        On This Page
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-white/[0.07] px-6 py-4">
                      <nav className="space-y-1">
                        {headings.map((heading) => (
                          <a
                            key={heading.id}
                            href={`#${heading.id}`}
                            className={`block text-sm py-1.5 transition-colors hover:text-[#F5EE30] ${
                              heading.level === 2
                                ? "text-gray-300 font-medium"
                                : "text-gray-500 ml-4 text-xs"
                            }`}
                          >
                            {heading.text}
                          </a>
                        ))}
                      </nav>
                    </div>
                  </details>
                )}

                {/* People Also Ask */}
                {peopleAlsoAsk.length > 0 && (
                  <div className="mb-8 bg-[#0d0d0d] border border-white/[0.07] rounded-xl p-6 md:p-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5EE30] mb-3">
                      Search Intent
                    </p>
                    <h2 className="font-etna text-2xl text-white mb-5">People Also Ask</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {peopleAlsoAsk.map((question, index) => (
                        <div
                          key={`paa-${index}`}
                          className="bg-black/40 border border-white/[0.06] rounded-lg p-4 hover:border-[#F5EE30]/20 hover:bg-[#F5EE30]/[0.02] transition-all cursor-default"
                        >
                          <p className="text-gray-300 text-sm leading-relaxed">{question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Article Body ── */}
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-xl p-6 md:p-10 mb-8">
                  <div
                    className="blog-prose"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                </div>

                {visibleSources.length > 0 && (
                  <div className="mb-8 bg-[#0d0d0d] border border-white/[0.07] rounded-xl p-6 md:p-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5EE30] mb-3">
                      Sources
                    </p>
                    <h2 className="font-etna text-2xl text-white mb-5">Research References</h2>
                    <ol className="space-y-3">
                      {visibleSources.map((source, index) => (
                        <li key={`${source.href}-${index}`} className="text-sm leading-relaxed text-gray-300">
                          <a
                            href={source.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-200 underline decoration-[#F5EE30]/40 underline-offset-4 hover:text-[#F5EE30]"
                          >
                            {source.title}
                          </a>
                          {source.domain ? (
                            <span className="ml-2 text-gray-500">({source.domain})</span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* FAQ Section */}
                {faqItems.length > 0 && (
                  <div className="mb-8 bg-[#0d0d0d] border border-white/[0.07] rounded-xl overflow-hidden">
                    <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5EE30] mb-3">
                        FAQ
                      </p>
                      <h2 className="font-etna text-2xl text-white">Frequently Asked Questions</h2>
                    </div>
                    <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-3">
                      {faqItems.map((item, index) => (
                        <details
                          key={`faq-${index}`}
                          className="group bg-black/30 border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all"
                          open={index === 0}
                        >
                          <summary className="flex items-start justify-between cursor-pointer p-5 hover:bg-white/[0.02] transition-colors gap-4">
                            <span className="font-etna text-base text-white leading-snug">{item.question}</span>
                            <ChevronDown className="w-4 h-4 text-[#F5EE30] transition-transform group-open:rotate-180 flex-shrink-0 mt-0.5" />
                          </summary>
                          <div
                            className="px-5 pb-5 border-t border-white/[0.06] pt-4 blog-prose blog-prose-sm"
                            dangerouslySetInnerHTML={{
                              __html: serverSanitizeHtml(
                                buildMarketingBlogHtml(item.answer, { siteUrl: SITE_URL })
                              ),
                            }}
                          />
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {/* Share Section */}
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-xl p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F5EE30]/10 border border-[#F5EE30]/20 flex items-center justify-center flex-shrink-0">
                        <Share2 className="w-4 h-4 text-[#F5EE30]" />
                      </div>
                      <div>
                        <p className="text-white font-etna text-lg">Share this article</p>
                        <p className="text-gray-500 text-xs mt-0.5">Spread the knowledge</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {shareLinks.map((platform) => (
                        <a
                          key={platform.name}
                          href={platform.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Share on ${platform.name}`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/[0.12] text-gray-300 hover:border-[#F5EE30] hover:text-black hover:bg-[#F5EE30] transition-all duration-200 text-xs font-bold uppercase tracking-wide"
                        >
                          {platform.icon}
                          <span className="hidden sm:inline">{platform.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Back to Blog */}
                <div className="mt-8 text-center">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-[#F5EE30] transition-colors text-sm group"
                  >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to all articles
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* bottom spacing */}
        <div className="pb-20" />
      </article>
    </div>
  );
}
