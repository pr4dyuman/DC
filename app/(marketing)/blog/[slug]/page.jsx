import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Clock, ChevronDown } from "lucide-react";
import dbConnect from "@/lib/marketing-db";
import Blog from "@/models/marketing/Blog";
import { checkAuth } from "@/lib/authMiddleware";
import { buildMarketingBlogHtml } from "@/lib/marketing-blog-content";
import {
  isRemoteMarketingImageSrc,
  isSvgMarketingImageSrc,
  normalizeMarketingCanonicalUrl,
  normalizeMarketingImageSrc,
  toAbsoluteMarketingImageUrl,
} from "@/lib/marketing-blog-utils";
import { notFound } from "next/navigation";


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
  )} MIN READ`;
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
    "@type": "Article",
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
      return serializeJsonLd(JSON.parse(blog.schemaMarkup));
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

    // Serialize MongoDB ObjectId fields to plain strings to prevent
    // React Server Component serialization failures in production.
    const serializeInternalLinks = (links) => {
      if (!Array.isArray(links)) return [];
      return links.map((link) => ({
        ...link,
        _id: link._id ? link._id.toString() : undefined,
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
    month: "short",
    day: "numeric",
  });
  const faqItems = getStoredFaqItems(post);
  const peopleAlsoAsk = getPeopleAlsoAskQuestions(post).slice(0, 6);
  const renderedContent = buildMarketingBlogHtml(post.content, {
    internalLinks: post.internalLinks,
    siteUrl: SITE_URL,
  });
  const headings = extractHeadingsFromHtml(renderedContent);
  const shouldShowToc = headings.length >= 2;
  const contentWithHeadingIds = shouldShowToc
    ? addHeadingIdsToHtml(renderedContent, headings)
    : renderedContent;
  const sanitizedContent = serverSanitizeHtml(contentWithHeadingIds);
  const readTime = getReadTimeLabel(renderedContent || post.content);

  const heroImageSrc = normalizeMarketingImageSrc(post.image);
  const isDefaultImage = heroImageSrc?.includes("ai-blogger.svg");
  const showImage = heroImageSrc && !isDefaultImage;
  const useNativeHeroImage = isRemoteMarketingImageSrc(heroImageSrc);
  const isSvgHeroImage = isSvgMarketingImageSrc(heroImageSrc);

  return (
    <div className="bg-black min-h-screen flex flex-col font-glacial text-white selection:bg-[#F5EE30] selection:text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: seo.schemaMarkup }} />

      <article className="flex-grow">
        {showImage && (
          <div className="relative w-full h-[70vh] min-h-[500px]">
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
                className="object-cover"
                priority
                unoptimized={isSvgHeroImage}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          </div>
        )}

        <div className="bg-black relative px-4 py-16 sm:px-6 md:px-10 md:py-24 lg:px-16">
          <div className="max-w-3xl mx-auto relative z-10">
            <div className="mb-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-[#F5EE30] hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-wide"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <span className="inline-block bg-[#F5EE30] text-black px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full">
                {category}
              </span>
            </div>

            <h1 className="font-etna text-4xl md:text-5xl lg:text-6xl leading-tight mb-6 text-white">
              {post.title}
            </h1>

            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              {seo.displayDescription}
            </p>

            <div className="flex flex-wrap items-center gap-6 md:gap-8 text-gray-300 text-sm font-bold uppercase tracking-wide mb-12 border-t border-white/20 pt-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#F5EE30]" />
                <span>{author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F5EE30]" />
                <span>{dateStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F5EE30]" />
                <span>{readTime}</span>
              </div>
            </div>

            {shouldShowToc && (
              <div className="mb-12 p-6 border border-white/10 rounded-lg bg-white/[0.02]">
                <p className="text-xs font-bold uppercase tracking-wide text-[#F5EE30] mb-4">
                  ON THIS PAGE
                </p>
                <nav className="space-y-2.5">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-sm transition-colors hover:text-[#F5EE30] ${
                        heading.level === 2
                          ? "text-gray-300 font-medium"
                          : "text-gray-400 ml-4"
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {peopleAlsoAsk.length > 0 && (
              <div className="mb-12 p-6 md:p-8 border border-white/10 rounded-lg bg-white/[0.02]">
                <p className="text-xs font-bold uppercase tracking-wide text-[#F5EE30] mb-4">
                  SEARCH INTENT
                </p>
                <h2 className="font-etna text-3xl text-white mb-6">PEOPLE ALSO ASK</h2>
                <div className="grid gap-4">
                  {peopleAlsoAsk.map((question, index) => (
                    <div
                      key={`paa-${index}`}
                      className="bg-white/[0.03] border border-white/10 rounded-lg p-5 hover:border-white/20 hover:bg-white/[0.05] transition-all"
                    >
                      <p className="text-white text-base font-medium leading-relaxed">{question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="prose prose-invert max-w-none mb-12
              prose-headings:font-etna prose-headings:text-white
              prose-h2:text-3xl md:prose-h2:text-4xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:leading-tight
              prose-h3:text-2xl md:prose-h3:text-3xl prose-h3:mt-12 prose-h3:mb-6 prose-h3:leading-tight
              prose-h4:text-xl prose-h4:mt-10 prose-h4:mb-4
              prose-p:text-gray-300 prose-p:text-base md:prose-p:text-lg prose-p:leading-relaxed prose-p:mb-7
              prose-a:text-[#F5EE30] prose-a:no-underline hover:prose-a:underline prose-a:transition-colors prose-a:font-medium
              prose-strong:text-white prose-strong:font-semibold
              prose-em:text-gray-200 prose-em:italic
              prose-ul:text-gray-300 prose-ul:text-base md:prose-ul:text-lg prose-ul:mb-8 prose-ul:pl-6
              prose-li:mb-4 prose-li:leading-relaxed
              prose-ol:text-gray-300 prose-ol:text-base md:prose-ol:text-lg prose-ol:mb-8 prose-ol:pl-6
              prose-blockquote:border-l-4 prose-blockquote:border-[#F5EE30] prose-blockquote:bg-white/[0.05] prose-blockquote:text-gray-300 prose-blockquote:pl-6 prose-blockquote:pr-6 prose-blockquote:py-5 prose-blockquote:italic prose-blockquote:my-10 prose-blockquote:rounded
              prose-code:bg-white/[0.08] prose-code:text-[#F5EE30] prose-code:px-2.5 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:not-italic
              prose-pre:bg-white/[0.03] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-pre:p-6 prose-pre:my-10 prose-pre:text-gray-300 prose-pre:text-sm
              prose-hr:border-white/20 prose-hr:my-12
              prose-img:rounded-lg prose-img:my-10 prose-img:border prose-img:border-white/10
              prose-table:text-gray-300 prose-thead:bg-white/[0.03] prose-th:text-white prose-th:font-semibold prose-th:border-white/10 prose-td:border-white/10
              font-sans"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            {faqItems.length > 0 && (
              <div className="mb-12 p-6 md:p-8 border border-white/10 rounded-lg bg-white/[0.02]">
                <p className="text-xs font-bold uppercase tracking-wide text-[#F5EE30] mb-4">
                  FAQ
                </p>
                <h2 className="font-etna text-3xl text-white mb-8">FREQUENTLY ASKED QUESTIONS</h2>
                <div className="space-y-4">
                  {faqItems.map((item, index) => (
                    <details
                      key={`faq-${index}`}
                      className="group bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all"
                      open={index === 0}
                    >
                      <summary className="flex items-center justify-between cursor-pointer p-5 md:p-6 hover:bg-white/[0.05] transition-colors">
                        <span className="font-etna text-lg text-white pr-6">{item.question}</span>
                        <ChevronDown className="w-5 h-5 text-[#F5EE30] transition-transform group-open:rotate-180 flex-shrink-0" />
                      </summary>
                      <div
                        className="px-5 md:px-6 pb-5 md:pb-6 border-t border-white/10 pt-5 prose prose-invert max-w-none
                        prose-p:text-gray-300 prose-p:text-base prose-p:leading-relaxed prose-p:mb-4 md:prose-p:text-lg
                        prose-a:text-[#F5EE30] prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-white prose-strong:font-semibold
                        prose-ul:text-gray-300 prose-ul:pl-6 prose-li:mb-2
                        prose-ol:text-gray-300 prose-ol:pl-6"
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

            <div className="mt-16 pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
              <h3 className="font-etna text-2xl text-white">SHARE THIS ARTICLE</h3>
              <div className="flex gap-4 flex-wrap">
                {(() => {
                  const url = encodeURIComponent(seo.canonicalUrl);
                  const title = encodeURIComponent(post.title);
                  const platforms = [
                    { name: "Twitter", href: `https://twitter.com/intent/tweet?url=${url}&text=${title}` },
                    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
                    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
                  ];

                  return platforms.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-full border border-white/20 text-white hover:border-[#F5EE30] hover:bg-[#F5EE30] hover:text-black transition-all duration-300 font-bold uppercase text-xs tracking-wider whitespace-nowrap"
                    >
                      {platform.name}
                    </a>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
