import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BlogIndexAnalyticsTracker } from "./BlogAnalyticsTrackers";
import BlogCard from "./BlogCard";
import BlogThemeToggle from "@/components/marketing/blog/BlogThemeToggle";
import {
  isRemoteMarketingImageSrc,
  isSvgMarketingImageSrc,
  normalizeMarketingImageSrc,
} from "@/lib/marketing-blog-utils";

function FeaturedPost({ post }) {
  const normalizedImageSrc = normalizeMarketingImageSrc(post.image, "");
  const isDefaultImage = normalizedImageSrc?.includes("ai-blogger.svg");
  const hasImage = Boolean(normalizedImageSrc) && !isDefaultImage;
  const useNativeImage = hasImage && isRemoteMarketingImageSrc(normalizedImageSrc);
  const isSvgImage = hasImage && isSvgMarketingImageSrc(normalizedImageSrc);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block"
      data-blog-card-link="featured"
      data-blog-slug={post.slug}
      data-blog-category={post.category}
      data-blog-position="1"
      data-blog-featured="true"
    >
      <article
        className={`grid overflow-hidden rounded-[24px] border border-[var(--blog-border)] bg-[var(--blog-surface)] shadow-[var(--blog-shadow)] transition-colors duration-300 ${
          hasImage ? "lg:grid-cols-[1.15fr_0.85fr]" : ""
        }`}
      >
        {hasImage ? (
          <div className="relative min-h-[280px] border-b border-[var(--blog-border)] sm:min-h-[340px] lg:min-h-[520px] lg:border-b-0 lg:border-r">
            {useNativeImage ? (
              <img
                src={normalizedImageSrc}
                alt={post.imageAlt || post.title}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <Image
                src={normalizedImageSrc}
                alt={post.imageAlt || post.title}
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                unoptimized={isSvgImage}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
            <div className="absolute left-6 top-6">
              <span className="inline-flex items-center rounded-full bg-[var(--blog-accent)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--blog-accent-ink)]">
                Featured
              </span>
            </div>
          </div>
        ) : null}

        <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,var(--blog-surface-muted),transparent_60%)]" />
          <div className="relative">
            {!hasImage ? (
              <span className="mb-6 inline-flex items-center rounded-full bg-[var(--blog-accent)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--blog-accent-ink)]">
                Featured
              </span>
            ) : null}
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--blog-muted)]">
              {post.date || "LATEST INSIGHT"} | {post.category}
            </p>
            <h2 className="mb-6 max-w-3xl font-sans text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[var(--blog-heading)] transition-colors duration-300 group-hover:text-[var(--blog-link)] sm:text-4xl md:text-5xl">
              {post.title}
            </h2>
            <p className="max-w-2xl text-base leading-8 text-[var(--blog-text)] md:text-lg">
              {post.excerpt}
            </p>
          </div>

          <div className="relative mt-10 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[var(--blog-link)]">
            Read Full Article
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
        </div>
      </article>
    </Link>
  );
}

function getCategoryHref(category) {
  return category === "ALL" ? "/blog" : `/blog?category=${encodeURIComponent(category)}`;
}

const BlogList = ({ posts, categories, activeCategory = "ALL" }) => {
  const filteredPosts =
    activeCategory === "ALL"
      ? posts
      : posts.filter((post) => post.category === activeCategory);

  const categoryCounts = posts.reduce((acc, post) => {
    const key = post.category || "Uncategorized";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  categoryCounts.ALL = posts.length;

  const featuredPost = filteredPosts[0] || null;
  const remainingPosts = featuredPost ? filteredPosts.slice(1) : [];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--blog-bg)] font-sans text-[var(--blog-text)] transition-colors duration-300">
      <BlogIndexAnalyticsTracker />
      <section className="relative overflow-hidden px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24 xl:px-12">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[var(--blog-accent)] opacity-[0.08] blur-[150px]" />
        <div className="pointer-events-none absolute left-0 top-24 h-[420px] w-[420px] rounded-full bg-[var(--blog-surface-muted)] opacity-60 blur-[160px]" />

        <div className="relative z-10 mx-auto max-w-[1760px]">
          <div className="mb-8 flex items-start justify-between gap-6">
            <p className="pt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--blog-link)]">
              Digital Corvids Journal
            </p>
            <BlogThemeToggle />
          </div>
          <h1 className="mb-6 max-w-6xl font-sans text-[clamp(2.75rem,7vw,7rem)] font-black leading-[0.92] tracking-[-0.045em] text-[var(--blog-heading)]">
            LATEST <span className="block text-[var(--blog-link)] sm:inline">INSIGHTS</span>
          </h1>
          <p className="mb-10 max-w-4xl text-lg leading-8 text-[var(--blog-text)] md:text-xl md:leading-9">
            SEO-ready articles, brand strategy thinking, and practical digital growth ideas from the Digital Corvids team.
          </p>

          <div className="mb-10 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--blog-muted)]">
            <span className="rounded-full border border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-2">
              {filteredPosts.length} Articles
            </span>
            <span className="rounded-full border border-[var(--blog-border)] bg-[var(--blog-surface)] px-4 py-2">
              {activeCategory === "ALL" ? "All Categories" : activeCategory}
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={getCategoryHref(cat)}
                prefetch={false}
                scroll={false}
                aria-current={activeCategory === cat ? "page" : undefined}
                data-blog-category-filter="true"
                data-blog-category={cat}
                className={`inline-flex items-center gap-3 rounded-full border px-6 py-3 text-sm font-bold tracking-[0.16em] transition-all duration-300 ${
                  activeCategory === cat
                    ? "border-[var(--blog-accent)] bg-[var(--blog-accent)] text-[var(--blog-accent-ink)]"
                    : "border-[var(--blog-border)] bg-[var(--blog-surface)] text-[var(--blog-muted)] hover:border-[var(--blog-link)] hover:bg-[var(--blog-surface-muted)] hover:text-[var(--blog-link)]"
                }`}
              >
                <span>{cat}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeCategory === cat ? "bg-black/10" : "bg-[var(--blog-surface-muted)]"}`}>
                  {categoryCounts[cat] || 0}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32 xl:px-12">
        <div className="mx-auto max-w-[1760px]">
          {filteredPosts.length === 0 && (
            <div className="rounded-[24px] border border-[var(--blog-border)] bg-[var(--blog-surface)] px-6 py-20 text-center shadow-[var(--blog-shadow)]">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[var(--blog-link)]">No Results</p>
              <p className="mx-auto max-w-2xl text-xl text-[var(--blog-muted)]">
                No articles match this category yet. Try another filter to explore more insights.
              </p>
            </div>
          )}

          {featuredPost && (
            <div className="mb-10">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--blog-muted)]">
                  Featured Article
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--blog-muted)]">
                  Latest publish
                </p>
              </div>
              <FeaturedPost post={featuredPost} />
            </div>
          )}

          {remainingPosts.length > 0 && (
            <>
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--blog-muted)]">
                  More Articles
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--blog-muted)]">
                  Scroll the archive
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                {remainingPosts.map((post, index) => (
                  <div key={post._id || post.id} className="h-full">
                    <BlogCard
                      {...post}
                      analyticsSource="archive"
                      analyticsPosition={index + 2}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default BlogList;
