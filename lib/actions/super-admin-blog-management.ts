"use server";

import { connectDB } from "@/lib/mongodb";
import Blog from "@/models/marketing/Blog";
import mongoose from "mongoose";
import { logBlogAuditChange } from "@/lib/blog-audit-log";
import { verifySuperAdmin } from "./super-admin-shared";

/**
 * Client-safe serialized blog document
 */
export interface BlogDocument {
  _id: string;
  title: string;
  slug: string;
  content: string;
  image: string;
  imageAlt?: string;
  shortDescription: string;
  category: string;
  status: "draft" | "published";
  metaKeywords?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  schemaMarkup?: string;
  contentClusterId?: string;
  parentTopicSlug?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  faqItems?: Array<{
    question?: string;
    answer?: string;
  }>;
  internalLinks?: Array<{
    href: string;
    title: string;
    anchorText: string;
    source: "service" | "page" | "blog";
    relationType:
      | "cluster-parent"
      | "cluster-supporting"
      | "pillar-parent"
      | "pillar-supporting"
      | "service-authority"
      | "related-reading"
      | "site-supporting";
    score?: number;
    matchReason?: string;
    clusterAligned?: boolean;
    suggestedSectionHeading?: string;
    targetPostSlug?: string;
    targetClusterId?: string;
    targetParentTopicSlug?: string;
    placement?: "introduction" | "body" | "faq" | "conclusion";
  }>;
}

type StoredBlogDocument = Omit<BlogDocument, "_id" | "publishedAt" | "createdAt" | "updatedAt"> & {
  _id: mongoose.Types.ObjectId | string;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function serializeDate(value?: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function serializeBlogDocument(doc: StoredBlogDocument): BlogDocument {
  return {
    ...doc,
    _id: typeof doc._id === "string" ? doc._id : doc._id.toString(),
    publishedAt: serializeDate(doc.publishedAt),
    createdAt: serializeDate(doc.createdAt) || new Date().toISOString(),
    updatedAt: serializeDate(doc.updatedAt) || new Date().toISOString(),
  };
}

/**
 * Escapes special regex characters to prevent NoSQL injection
 * @param str Raw user input string
 * @returns Safe string for use in MongoDB $regex
 */
function escapeRegexChars(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface PaginatedBlogsResult {
  blogs: BlogDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BlogFilters {
  search?: string;
  category?: string;
  status?: "draft" | "published";
  startDate?: Date;
  endDate?: Date;
}

interface SortOptions {
  field: "publishedAt" | "updatedAt" | "title" | "createdAt";
  order: "asc" | "desc";
}

/**
 * Get paginated list of blogs with filters and search
 */
export async function getBlogsListPaginated(
  page: number = 1,
  pageSize: number = 50,
  filters: BlogFilters = {},
  sort: SortOptions = { field: "publishedAt", order: "desc" }
): Promise<PaginatedBlogsResult> {
  try {
    await verifySuperAdmin();
    await connectDB();

    // Validate pagination parameters to prevent DOS and division by zero
    if (!Number.isFinite(page) || page < 1) {
      throw new Error("Page must be a positive number");
    }
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error("Page size must be between 1 and 100");
    }

    const validPage = Math.floor(page);
    const validPageSize = Math.min(Math.floor(pageSize), 100);

    // Build filter query - properly typed for MongoDB
    const query: Record<string, unknown> = {};

    // SECURITY FIX: Escape user input in regex to prevent NoSQL injection
    if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
      const escapedSearch = escapeRegexChars(filters.search.trim());
      query.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { slug: { $regex: escapedSearch, $options: "i" } },
        { content: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      const dateQuery: Record<string, Date> = {};
      if (filters.startDate) dateQuery.$gte = filters.startDate;
      if (filters.endDate) dateQuery.$lte = filters.endDate;
      query.publishedAt = dateQuery;
    }

    // Build sort object with proper typing
    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sort.field] = sort.order === "asc" ? 1 : -1;

    // Get total count
    const total = await Blog.countDocuments(query);

    // Get paginated results
    const skip = (validPage - 1) * validPageSize;
    const blogs = (await Blog.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(validPageSize)
      .lean()
      .exec()) as StoredBlogDocument[];

    // Safe division - validPageSize is guaranteed to be > 0
    const totalPages = Math.max(1, Math.ceil(total / validPageSize));

    return {
      blogs: blogs.map(serializeBlogDocument),
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  } catch (error) {
    console.error("Error fetching paginated blogs:", error);
    throw new Error("Failed to fetch blogs");
  }
}

/**
 * Get a single blog by ID
 */
export async function getBlogById(id: string): Promise<BlogDocument> {
  try {
    await verifySuperAdmin();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid blog ID");
    }

    const blog = (await Blog.findById(id).lean().exec()) as StoredBlogDocument | null;
    if (!blog) {
      throw new Error("Blog not found");
    }

    return serializeBlogDocument(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    throw error;
  }
}

/**
 * Update a blog
 */
export async function updateBlog(
  id: string,
  updates: Partial<{
    title: string;
    slug: string;
    content: string;
    image: string;
    imageAlt: string;
    shortDescription: string;
    category: string;
    status: "draft" | "published";
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    canonicalUrl: string;
    schemaMarkup: string;
    faqItems: Array<{ question: string; answer: string }>;
    contentClusterId: string;
    parentTopicSlug: string;
    internalLinks: Record<string, unknown>[];
    publishedAt: Date | undefined;
  }>
): Promise<BlogDocument> {
  try {
    await verifySuperAdmin();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid blog ID");
    }

    // Validate slug uniqueness if slug is being updated
    if (updates.slug) {
      const existingBlog = await Blog.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      }).lean().exec();

      if (existingBlog) {
        throw new Error("Slug already exists");
      }
    }

    // Set publishedAt based on status
    if (updates.status === "published") {
      updates.publishedAt = new Date();
    } else if (updates.status === "draft") {
      updates.publishedAt = undefined;
    }

    const blog = (await Blog.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean().exec()) as StoredBlogDocument | null;

    if (!blog) {
      throw new Error("Blog not found");
    }

    // Revalidate cache for public blog page
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/blog/${blog.slug}`);
    revalidatePath("/blog");

    // Log audit change
    const changedFields = Object.keys(updates);
    await logBlogAuditChange(
      id,
      updates.status === "published" ? "publish" : updates.status === "draft" ? "unpublish" : "update",
      `Updated: ${changedFields.join(", ")}`,
      changedFields.map((field) => ({
        field,
        after: updates[field as keyof typeof updates],
      }))
    );

    return serializeBlogDocument(blog);
  } catch (error) {
    console.error("Error updating blog:", error);
    throw error;
  }
}

/**
 * Delete a blog
 */
export async function deleteBlog(id: string): Promise<void> {
  try {
    await verifySuperAdmin();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid blog ID");
    }

    const blog = await Blog.findByIdAndDelete(id).lean().exec();

    if (!blog) {
      throw new Error("Blog not found");
    }

    // Log audit change
    await logBlogAuditChange(
      id,
      "delete",
      `Deleted blog: ${blog.title}`
    );

    // Revalidate cache
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/blog/${blog.slug}`);
    revalidatePath("/blog");
  } catch (error) {
    console.error("Error deleting blog:", error);
    throw error;
  }
}

/**
 * Publish a blog (set status to published and publishedAt)
 */
export async function publishBlog(id: string): Promise<BlogDocument> {
  return updateBlog(id, {
    status: "published",
    publishedAt: new Date(),
  });
}

/**
 * Save blog as draft (set status to draft and clear publishedAt)
 */
export async function saveBlogDraft(id: string): Promise<BlogDocument> {
  return updateBlog(id, {
    status: "draft",
    publishedAt: undefined,
  });
}

/**
 * Validate blog SEO metadata
 */
export async function validateBlogSEOMetadata(blog: {
  metaTitle?: string;
  metaDescription?: string;
  status?: string;
}): Promise<{ valid: boolean; errors: string[] }> {
  await verifySuperAdmin();
  const errors: string[] = [];

  // Only validate if publishing
  if (blog.status === "published") {
    if (!blog.metaTitle || blog.metaTitle.trim().length === 0) {
      errors.push("Meta title is required for published blogs");
    }

    if (!blog.metaDescription || blog.metaDescription.trim().length === 0) {
      errors.push("Meta description is required for published blogs");
    }

    if (blog.metaTitle && blog.metaTitle.length > 60) {
      errors.push("Meta title should be less than 60 characters");
    }

    if (blog.metaDescription && blog.metaDescription.length > 160) {
      errors.push("Meta description should be less than 160 characters");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get blog categories (unique)
 */
export async function getBlogCategories(): Promise<string[]> {
  try {
    await verifySuperAdmin();
    await connectDB();

    const categories = await Blog.distinct("category").exec();
    return categories.filter((cat) => cat).sort();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

/**
 * Get blog stats
 */
export async function getBlogStats(): Promise<{
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  recentlyUpdated: BlogDocument[];
}> {
  try {
    await verifySuperAdmin();
    await connectDB();

    const totalBlogs = await Blog.countDocuments().exec();
    const publishedBlogs = await Blog.countDocuments({ status: "published" }).exec();
    const draftBlogs = await Blog.countDocuments({ status: "draft" }).exec();

    const recentlyUpdated = (await Blog.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()
      .exec()) as StoredBlogDocument[];

    return {
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      recentlyUpdated: recentlyUpdated.map(serializeBlogDocument),
    };
  } catch (error) {
    console.error("Error fetching blog stats:", error);
    throw error;
  }
}

/**
 * Bulk delete blogs
 */
export async function bulkDeleteBlogs(ids: string[]): Promise<{ deletedCount: number }> {
  try {
    await verifySuperAdmin();
    await connectDB();

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      throw new Error("No valid blog IDs provided");
    }

    const result = await Blog.deleteMany({
      _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).exec();

    // Log audit changes for each deleted blog
    for (const id of validIds) {
      await logBlogAuditChange(
        id,
        "delete",
        "Bulk deleted"
      );
    }

    // Revalidate cache
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/blog");

    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error("Error bulk deleting blogs:", error);
    throw error;
  }
}

/**
 * Change blog status for multiple blogs
 */
export async function bulkUpdateBlogStatus(
  ids: string[],
  status: "draft" | "published"
): Promise<{ modifiedCount: number }> {
  try {
    await verifySuperAdmin();
    await connectDB();

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      throw new Error("No valid blog IDs provided");
    }

    const update: Record<string, unknown> = { status };
    if (status === "published") {
      update.publishedAt = new Date();
    } else {
      update.publishedAt = null;
    }

    const result = await Blog.updateMany(
      { _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: update }
    ).exec();

    // Log audit changes for each updated blog
    for (const id of validIds) {
      await logBlogAuditChange(
        id,
        status === "published" ? "publish" : "unpublish",
        `Status changed to: ${status}`
      );
    }

    // Revalidate cache
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/blog");

    return { modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error("Error bulk updating blog status:", error);
    throw error;
  }
}
