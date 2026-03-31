import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import { checkAuth } from '@/lib/authMiddleware';
import { notFound } from 'next/navigation';

// Cache for 60 seconds
export const revalidate = 60;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://digitalcorvids.com";
const SITE_NAME = "Digital Corvids";

function getBlogUrl(slug) {
  return `${SITE_URL.replace(/\/+$/, '')}/blog/${slug}`;
}

function normalizeUrl(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    const url = new URL(value);
    const pathname = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
    return `${url.protocol}//${url.host.toLowerCase()}${pathname}`;
  } catch {
    return fallback;
  }
}

function getAbsoluteAssetUrl(value) {
  if (!value) return undefined;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `${SITE_URL.replace(/\/+$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
}

function stripHtml(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function buildEmergencyDescription(blog) {
  const plainText = stripHtml(blog.content || '');
  if (!plainText) {
    return blog.title;
  }

  return plainText.length <= 160 ? plainText : `${plainText.slice(0, 157).trimEnd()}...`;
}

function getBlogDescription(blog) {
  return blog.metaDescription?.trim() || blog.shortDescription?.trim() || buildEmergencyDescription(blog);
}

function getBlogDisplayDescription(blog) {
  return blog.shortDescription?.trim() || blog.metaDescription?.trim() || buildEmergencyDescription(blog);
}

function getBlogKeywords(blog) {
  return blog.metaKeywords
    ? blog.metaKeywords.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
}

function getReadTimeLabel(content = "") {
  return `${Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200))} MIN READ`;
}

function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildFallbackSchemaMarkup(blog) {
  const canonicalUrl = normalizeUrl(blog.canonicalUrl, getBlogUrl(blog.slug));
  const imageUrl = getAbsoluteAssetUrl(blog.image);
  const description = getBlogDescription(blog);
  const publishedAt = blog.publishedAt || blog.createdAt;
  const updatedAt = blog.updatedAt || publishedAt;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.metaTitle || blog.title,
    description,
    image: imageUrl ? [{
      "@type": "ImageObject",
      url: imageUrl,
      caption: blog.imageAlt || blog.title,
    }] : undefined,
    datePublished: publishedAt,
    dateModified: updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    author: {
      "@type": "Organization",
      name: "Digital Corvids",
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
        item: `${SITE_URL.replace(/\/+$/, '')}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: blog.title,
        item: canonicalUrl,
      },
    ],
  };

  const faqItems = Array.isArray(blog.faqItems) ? blog.faqItems.filter((item) => item?.question && item?.answer) : [];
  const faqSchema = faqItems.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
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
  const canonicalUrl = normalizeUrl(blog.canonicalUrl, getBlogUrl(blog.slug));
  const title = blog.metaTitle?.trim() || `${blog.title} | ${SITE_NAME}`;
  const description = getBlogDescription(blog);
  const displayDescription = getBlogDisplayDescription(blog);
  const imageUrl = getAbsoluteAssetUrl(blog.image);
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

async function getBlog(slug) {
  await dbConnect();
  const auth = await checkAuth();
  const isAdmin = auth.authorized === true;

  // Try finding by slug first, then ID
  let blog = await Blog.findOne(isAdmin ? { slug } : { slug, status: 'published' }).lean();

  if (!blog && /^[0-9a-fA-F]{24}$/.test(slug)) {
    blog = await Blog.findOne(isAdmin ? { _id: slug } : { _id: slug, status: 'published' }).lean();
  }

  if (!blog) return null;

  // Convert _id to string and createdAt to ISO string for serialization
  return {
    ...blog,
    _id: blog._id.toString(),
    publishedAt: blog.publishedAt instanceof Date ? blog.publishedAt.toISOString() : undefined,
    createdAt: blog.createdAt.toISOString(),
    updatedAt: blog.updatedAt instanceof Date ? blog.updatedAt.toISOString() : blog.createdAt.toISOString(),
  };
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const blog = await getBlog(resolvedParams.slug);

  if (!blog) return { title: 'Not Found' };

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
      type: 'article',
      url: seo.canonicalUrl,
      title: seo.title,
      description: seo.description,
      publishedTime: seo.publishedAt,
      modifiedTime: seo.updatedAt,
      authors: [SITE_NAME],
      section: blog.category || 'Insights',
      siteName: SITE_NAME,
      tags: seo.keywords.length > 0 ? seo.keywords : undefined,
      images: seo.imageUrl ? [{ url: seo.imageUrl, alt: seo.imageAlt }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: seo.imageUrl ? [seo.imageUrl] : undefined,
    },
  };
}

export default async function BlogPost({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const post = await getBlog(slug);

  if (!post) {
    notFound();
  }

  const seo = getResolvedBlogSeo(post);
  const category = post.category || "INSIGHTS";
  const author = SITE_NAME;
  const dateStr = new Date(seo.publishedAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
  const readTime = getReadTimeLabel(post.content);
  const faqItems = Array.isArray(post.faqItems) ? post.faqItems.filter((item) => item?.question && item?.answer) : [];

  return (
    <div className="bg-black min-h-screen flex flex-col font-glacial text-white selection:bg-[#F5EE30] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: seo.schemaMarkup }}
      />

      <article className="flex-grow">
        {/* Immersive Hero Section */}
        <div className="relative w-full h-[70vh] min-h-[500px]">
          {post.image && (
            <Image
              src={post.image}
              alt={seo.imageAlt}
              fill
              className="object-cover"
              priority
            />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

          <div className="absolute bottom-0 left-0 w-full px-4 sm:px-6 md:px-10 lg:px-16 pb-12 md:pb-16">
            <div className="max-w-5xl mx-auto">
              <nav aria-label="Breadcrumb" className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-white/60">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/" className="transition-colors hover:text-[#F5EE30]">
                    Home
                  </Link>
                  <span>/</span>
                  <Link href="/blog" className="transition-colors hover:text-[#F5EE30]">
                    Blog
                  </Link>
                  <span>/</span>
                  <span className="text-white/80">{category}</span>
                </div>
              </nav>
              <Link
                href="/blog"
                className="inline-flex items-center text-white/80 hover:text-[#F5EE30] transition-colors mb-6 font-bold tracking-widest uppercase text-sm group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Back to Insights
              </Link>

              <div className="flex items-center gap-4 mb-6">
                <span className="bg-[#F5EE30] text-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(245,238,48,0.3)]">
                  {category}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-etna leading-[1.1] mb-8 text-white drop-shadow-2xl max-w-4xl uppercase">
                {post.title}
              </h1>

              <p className="max-w-3xl text-base leading-7 text-gray-300 md:text-lg">
                {seo.displayDescription}
              </p>

              <div className="flex flex-wrap items-center gap-6 md:gap-8 text-gray-300 text-sm font-bold tracking-wide uppercase border-t border-white/20 pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600">
                    <User className="w-4 h-4 text-[#F5EE30]" />
                  </div>
                  <span>{author}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#F5EE30]" />
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#F5EE30]" />
                  <span>{readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 sm:px-6 md:px-10 lg:px-16 py-16 md:py-24 bg-black relative">
          {/* Background Glow */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#F5EE30] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-3xl mx-auto relative z-10">
            {/* 
              Converted to render HTML for Rich Text Editor support.
              Using prose class to style standard HTML tags from Quill.
            */}
            <div
              className="prose prose-invert prose-lg md:prose-xl max-w-none 
              prose-headings:font-etna prose-headings:text-white prose-headings:leading-tight
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-[#F5EE30] prose-a:no-underline hover:prose-a:underline 
              prose-strong:text-white 
              font-sans"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />

            {faqItems.length > 0 && (
              <section className="mt-16 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#F5EE30]">FAQ</p>
                  <h2 className="mt-3 font-etna text-3xl text-white">COMMON QUESTIONS</h2>
                </div>
                <div className="space-y-6">
                  {faqItems.map((item, index) => (
                    <div key={`${post._id}-faq-${index}`} className="border-b border-white/10 pb-5 last:border-b-0 last:pb-0">
                      <h3 className="font-etna text-xl text-white">{item.question}</h3>
                      <p className="mt-2 text-base leading-7 text-gray-300">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Share Section */}
            <div className="mt-20 pt-10 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
              <span className="font-etna text-2xl text-gray-400">SHARE THIS ARTICLE</span>
              <div className="flex gap-4">
                {(() => {
                  const url = encodeURIComponent(seo.canonicalUrl);
                  const title = encodeURIComponent(post.title);
                  const platforms = [
                    { name: 'Twitter', href: `https://twitter.com/intent/tweet?url=${url}&text=${title}` },
                    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
                    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
                  ];
                  return platforms.map((platform) => (
                    <a key={platform.name} href={platform.href} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-gray-700 hover:border-[#F5EE30] hover:bg-[#F5EE30] hover:text-black transition-all duration-300 font-bold uppercase text-sm tracking-wider">
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
