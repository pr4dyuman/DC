import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Share2, Clock } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import { notFound } from 'next/navigation';

// Cache for 60 seconds
export const revalidate = 60;

async function getBlog(slug) {
  await dbConnect();

  // Try finding by slug first, then ID
  let blog = await Blog.findOne({ slug }).lean();

  if (!blog && /^[0-9a-fA-F]{24}$/.test(slug)) {
    blog = await Blog.findById(slug).lean();
  }

  if (!blog) return null;

  // Convert _id to string and createdAt to ISO string for serialization
  return {
    ...blog,
    _id: blog._id.toString(),
    createdAt: blog.createdAt.toISOString(),
  };
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const blog = await getBlog(resolvedParams.slug);

  if (!blog) return { title: 'Not Found' };

  return {
    title: `${blog.title} | Digital Corvids`,
    description: blog.content.substring(0, 150) + '...',
  };
}

export default async function BlogPost({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const post = await getBlog(slug);

  if (!post) {
    notFound();
  }

  // Deriving missing existing UI fields
  const category = post.category || "INSIGHTS";
  const author = "Digital Corvids";
  const dateStr = new Date(post.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
  // Rough read time estimate
  const readTime = Math.ceil(post.content.split(' ').length / 200) + " MIN READ";

  return (
    <div className="bg-black min-h-screen flex flex-col font-glacial text-white selection:bg-[#F5EE30] selection:text-black">

      <article className="flex-grow">
        {/* Immersive Hero Section */}
        <div className="relative w-full h-[70vh] min-h-[500px]">
          {post.image && (
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

          <div className="absolute bottom-0 left-0 w-full px-4 sm:px-6 md:px-10 lg:px-16 pb-12 md:pb-16">
            <div className="max-w-5xl mx-auto">
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

            {/* Share Section */}
            <div className="mt-20 pt-10 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
              <span className="font-etna text-2xl text-gray-400">SHARE THIS ARTICLE</span>
              <div className="flex gap-4">
                {(() => {
                  const url = encodeURIComponent(`https://digitalcorvids.com/blog/${slug}`);
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
