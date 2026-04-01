import React from "react";
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import BlogList from '@/components/marketing/BlogList';

// Cache for 60 seconds
export const revalidate = 60;

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

export default async function BlogPage() {
  await dbConnect();

  // Fetch only published blogs with lean queries and field selection
  const blogs = await Blog.find({ status: 'published' })
    .select('title category content shortDescription metaDescription image imageAlt slug publishedAt createdAt')
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

  // Map DB objects to the format expected by BlogCard/BlogList
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

  return <BlogList posts={formattedBlogs} categories={categoryNames} />;
}

