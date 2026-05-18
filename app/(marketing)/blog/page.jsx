import React from "react";
import { unstable_cache } from 'next/cache';
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import BlogList from '@/components/marketing/BlogList';

// This page depends on MongoDB, so render it at request time instead of
// requiring a live database during Vercel's static prerender step.
export const dynamic = 'force-dynamic';

// Cache for 60 seconds
export const revalidate = 60;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://digitalcorvids.com'
).replace(/\/+$/, '');

const BLOG_TITLE = 'Digital Marketing Blog | Digital Corvids';
const BLOG_DESCRIPTION =
  'Read practical SEO, web design, paid media, social media, and digital growth insights from the Digital Corvids team.';

export const metadata = {
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    siteName: 'Digital Corvids',
  },
  twitter: {
    card: 'summary',
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
  },
};

function getRequestedCategory(searchParams) {
  const rawCategory = Array.isArray(searchParams?.category)
    ? searchParams.category[0]
    : searchParams?.category;

  return typeof rawCategory === 'string' ? rawCategory.trim() : '';
}

function resolveActiveCategory(requestedCategory, categories) {
  if (!requestedCategory) {
    return 'ALL';
  }

  const requested = requestedCategory.toLowerCase();
  return categories.find((category) => category.toLowerCase() === requested) || 'ALL';
}

// Helper to truncate text
function truncate(str, length) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
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

function getBlogExcerpt(blog) {
  const summary = stripHtml(blog.shortDescription || blog.metaDescription || '');
  if (summary) {
    return truncate(summary, 180);
  }

  return truncate(stripHtml(blog.content || ''), 180);
}

function getBlogDate(blog) {
  const value = blog.publishedAt || blog.createdAt;
  const parsed = value ? new Date(value) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString("en-US", {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).toUpperCase();
}

const getPublishedBlogList = unstable_cache(
  async () => {
    await dbConnect();

    // Fetch only card/listing fields; full content belongs on detail pages.
    const blogs = await Blog.find({ status: 'published' })
      .select('title category shortDescription metaDescription image imageAlt slug publishedAt createdAt')
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    const categoryNames = [
      'ALL',
      ...Array.from(
        new Set(
          blogs
            .map((blog) => blog.category?.trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right))
    ];

    // Map DB objects to the format expected by BlogCard/BlogList.
    const formattedBlogs = blogs.map(blog => ({
      id: blog._id.toString(),
      _id: blog._id.toString(),
      title: blog.title,
      category: blog.category || "Uncategorized",
      excerpt: getBlogExcerpt(blog),
      image: blog.image,
      imageAlt: blog.imageAlt || blog.title,
      slug: blog.slug,
      date: getBlogDate(blog),
    }));

    return {
      posts: formattedBlogs,
      categories: categoryNames,
    };
  },
  ['marketing-published-blog-list'],
  {
    revalidate: 60,
    tags: ['marketing-published-blog-list'],
  }
);

export default async function BlogPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const { posts, categories } = await getPublishedBlogList();
  const activeCategory = resolveActiveCategory(
    getRequestedCategory(resolvedSearchParams),
    categories,
  );

  return <BlogList posts={posts} categories={categories} activeCategory={activeCategory} />;
}

