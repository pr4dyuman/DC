"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import BlogCard from "./BlogCard";
import {
  isRemoteMarketingImageSrc,
  isSvgMarketingImageSrc,
  normalizeMarketingImageSrc,
} from "@/lib/marketing-blog-utils";

function FeaturedPost({ post }) {
  const normalizedImageSrc = normalizeMarketingImageSrc(post.image);
  const useNativeImage = isRemoteMarketingImageSrc(normalizedImageSrc);
  const isSvgImage = isSvgMarketingImageSrc(normalizedImageSrc);

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="grid overflow-hidden rounded-[32px] border border-white/10 bg-[#070707] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[320px] border-b border-white/10 lg:min-h-[520px] lg:border-b-0 lg:border-r">
          {useNativeImage ? (
            <img
              src={normalizedImageSrc}
              alt={post.imageAlt || post.title}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <Image
              src={normalizedImageSrc}
              alt={post.imageAlt || post.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              unoptimized={isSvgImage}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
          <div className="absolute left-6 top-6">
            <span className="inline-flex items-center rounded-full bg-[#F5EE30] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-black">
              Featured
            </span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between p-7 md:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,_rgba(245,238,48,0.18),_transparent_50%)]" />
          <div className="relative">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
              {post.date || "LATEST INSIGHT"} | {post.category}
            </p>
            <h2 className="mb-6 text-4xl text-white font-etna leading-[0.95] transition-colors duration-300 group-hover:text-[#F5EE30] md:text-5xl">
              {post.title}
            </h2>
            <p className="max-w-xl text-base leading-8 text-gray-300 md:text-lg">
              {post.excerpt}
            </p>
          </div>

          <div className="relative mt-10 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#F5EE30]">
            Read Full Article
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
        </div>
      </article>
    </Link>
  );
}

const BlogList = ({ posts, categories }) => {
  const [activeCategory, setActiveCategory] = useState("ALL");

  const filteredPosts = useMemo(
    () => (
      activeCategory === "ALL"
        ? posts
        : posts.filter((post) => post.category === activeCategory)
    ),
    [activeCategory, posts]
  );

  const categoryCounts = useMemo(() => {
    const counts = posts.reduce((acc, post) => {
      const key = post.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    counts.ALL = posts.length;
    return counts;
  }, [posts]);

  const featuredPost = filteredPosts[0] || null;
  const remainingPosts = featuredPost ? filteredPosts.slice(1) : [];

  return (
    <div className="flex min-h-screen flex-col bg-black font-glacial">
      <section className="relative overflow-hidden px-4 pb-12 pt-32 sm:px-6 md:px-10 lg:px-16">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-[#F5EE30] opacity-5 blur-[150px]" />
        <div className="pointer-events-none absolute left-0 top-24 h-[420px] w-[420px] rounded-full bg-white opacity-[0.03] blur-[160px]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#F5EE30]">
            Digital Corvids Journal
          </p>
          <h1 className="mb-6 text-[clamp(3.5rem,9vw,8rem)] font-etna leading-[0.85] tracking-tight text-white">
            LATEST <span className="bg-gradient-to-r from-[#F5EE30] to-white bg-clip-text text-transparent">INSIGHTS</span>
          </h1>
          <p className="mb-10 max-w-3xl text-lg leading-relaxed text-gray-400 md:text-xl">
            SEO-ready articles, brand strategy thinking, and practical digital growth ideas from the Digital Corvids team.
          </p>

          <div className="mb-10 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            <span className="rounded-full border border-white/10 px-4 py-2">
              {filteredPosts.length} Articles
            </span>
            <span className="rounded-full border border-white/10 px-4 py-2">
              {activeCategory === "ALL" ? "All Categories" : activeCategory}
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`inline-flex items-center gap-3 rounded-full border px-6 py-3 text-sm font-bold tracking-[0.16em] transition-all duration-300 ${
                  activeCategory === cat
                    ? "border-[#F5EE30] bg-[#F5EE30] text-black"
                    : "border-white/10 bg-transparent text-gray-300 hover:border-[#F5EE30] hover:text-white"
                }`}
              >
                <span>{cat}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeCategory === cat ? "bg-black/10" : "bg-white/5"}`}>
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-32 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          {filteredPosts.length === 0 && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[#F5EE30]">No Results</p>
              <p className="mx-auto max-w-2xl text-xl text-gray-400">
                No articles match this category yet. Try another filter to explore more insights.
              </p>
            </div>
          )}

          {featuredPost && (
            <div className="mb-10">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">
                  Featured Article
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500">
                  Latest publish
                </p>
              </div>
              <FeaturedPost post={featuredPost} />
            </div>
          )}

          {remainingPosts.length > 0 && (
            <>
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">
                  More Articles
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500">
                  Scroll the archive
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                {remainingPosts.map((post) => (
                  <div key={post._id || post.id} className="h-full">
                    <BlogCard {...post} />
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
