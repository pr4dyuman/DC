import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  isRemoteMarketingImageSrc,
  isSvgMarketingImageSrc,
  normalizeMarketingImageSrc,
} from "@/lib/marketing-blog-utils";

const BlogCard = ({ title, category, excerpt, image, imageAlt, slug, date }) => {
  const normalizedImageSrc = normalizeMarketingImageSrc(image, "");
  const isDefaultImage = normalizedImageSrc?.includes("ai-blogger.svg");
  const hasImage = Boolean(normalizedImageSrc) && !isDefaultImage;
  const useNativeImage = hasImage && isRemoteMarketingImageSrc(normalizedImageSrc);
  const isSvgImage = hasImage && isSvgMarketingImageSrc(normalizedImageSrc);

  return (
    <Link href={`/blog/${slug}`} className="group block h-full w-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#080808] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,_rgba(245,238,48,0.15),_transparent_55%)] pointer-events-none" />

        {hasImage ? (
          <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10">
            {useNativeImage ? (
              <img
                src={normalizedImageSrc}
                alt={imageAlt || title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <Image
                src={normalizedImageSrc}
                alt={imageAlt || title}
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                unoptimized={isSvgImage}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <div className="absolute left-5 top-5 z-10">
              <span className="inline-flex items-center rounded-full bg-[#F5EE30] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-black shadow-lg">
                {category}
              </span>
            </div>
          </div>
        ) : null}

        <div className="relative flex flex-1 flex-col p-6 md:p-7">
          {!hasImage ? (
            <span className="mb-5 inline-flex w-fit items-center rounded-full bg-[#F5EE30] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-black">
              {category}
            </span>
          ) : null}
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
            {date || "LATEST INSIGHT"}
          </p>

          <h3 className="mb-4 text-2xl text-white font-etna leading-tight transition-colors duration-300 group-hover:text-[#F5EE30] md:text-[2rem]">
            {title}
          </h3>

          <p className="mb-8 text-sm leading-7 text-gray-300 md:text-base">
            {excerpt}
          </p>

          <div className="mt-auto inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#F5EE30]">
            Read Article
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
        </div>
      </article>
    </Link>
  );
};

export default BlogCard;
