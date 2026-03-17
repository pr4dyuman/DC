import React from "react";
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import Category from '@/models/marketing/Category';
import BlogList from '@/components/marketing/BlogList';

// Cache for 60 seconds
export const revalidate = 60;

// Helper to truncate text
function truncate(str, length) {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export default async function BlogPage() {
  await dbConnect();

  // Fetch only published blogs with lean queries and field selection
  const blogs = await Blog.find({ status: 'published' })
    .select('title category content image slug createdAt')
    .sort({ createdAt: -1 })
    .lean();

  // Fetch categories with lean query
  const categories = await Category.find({})
    .select('name')
    .sort({ name: 1 })
    .lean();

  const categoryNames = ['ALL', ...categories.map(c => c.name)];

  // Map DB objects to the format expected by BlogCard/BlogList
  const formattedBlogs = blogs.map(blog => ({
    id: blog._id.toString(),
    _id: blog._id.toString(),
    title: blog.title,
    category: blog.category || "Uncategorized",
    excerpt: truncate(blog.content, 150),
    image: blog.image,
    slug: blog.slug,
    date: new Date(blog.createdAt).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase(),
  }));

  return <BlogList posts={formattedBlogs} categories={categoryNames} />;
}

