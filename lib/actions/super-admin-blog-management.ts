"use server";

import dbConnect from "@/lib/marketing-db";
import Blog from "@/models/marketing/Blog";
import mongoose from "mongoose";
import { logBlogAuditChange } from "@/lib/blog-audit-log";
import {
  buildDeletedBlogHrefCandidates,
  stripDeletedBlogLinksFromContent,
} from "@/lib/marketing-blog-delete-cleanup";
import { normalizeMarketingCanonicalUrl } from "@/lib/marketing-blog-utils";
import { BlogStudioPostModel, connectDB as connectPrimaryDb } from "@/lib/mongodb";
import { verifySuperAdmin } from "./super-admin-shared";

/**
 * Client-safe serialized blog document
 */
export interface BlogDocument {
  _id: string;
  title: string;
  slug: string;
  sourcePostId?: string;
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

function serializeFaqItems(doc: StoredBlogDocument): BlogDocument["faqItems"] {
  if (!Array.isArray(doc.faqItems)) {
    return undefined;
  }

  return doc.faqItems.map((item) => ({
    question: typeof item?.question === "string" ? item.question : undefined,
    answer: typeof item?.answer === "string" ? item.answer : undefined,
  }));
}

function serializeInternalLinks(doc: StoredBlogDocument): BlogDocument["internalLinks"] {
  if (!Array.isArray(doc.internalLinks)) {
    return undefined;
  }

  return doc.internalLinks.map((link) => ({
    href: typeof link?.href === "string" ? link.href : "",
    title: typeof link?.title === "string" ? link.title : "",
    anchorText: typeof link?.anchorText === "string" ? link.anchorText : "",
    source:
      link?.source === "service" || link?.source === "page" || link?.source === "blog"
        ? link.source
        : "page",
    relationType:
      link?.relationType === "cluster-parent" ||
      link?.relationType === "cluster-supporting" ||
      link?.relationType === "pillar-parent" ||
      link?.relationType === "pillar-supporting" ||
      link?.relationType === "service-authority" ||
      link?.relationType === "related-reading" ||
      link?.relationType === "site-supporting"
        ? link.relationType
        : "related-reading",
    score: typeof link?.score === "number" ? link.score : undefined,
    matchReason: typeof link?.matchReason === "string" ? link.matchReason : undefined,
    clusterAligned: typeof link?.clusterAligned === "boolean" ? link.clusterAligned : undefined,
    suggestedSectionHeading:
      typeof link?.suggestedSectionHeading === "string" ? link.suggestedSectionHeading : undefined,
    targetPostSlug: typeof link?.targetPostSlug === "string" ? link.targetPostSlug : undefined,
    targetClusterId: typeof link?.targetClusterId === "string" ? link.targetClusterId : undefined,
    targetParentTopicSlug:
      typeof link?.targetParentTopicSlug === "string" ? link.targetParentTopicSlug : undefined,
    placement:
      link?.placement === "introduction" ||
      link?.placement === "body" ||
      link?.placement === "faq" ||
      link?.placement === "conclusion"
        ? link.placement
        : undefined,
  }));
}

function serializeBlogDocument(doc: StoredBlogDocument): BlogDocument {
  return {
    _id: typeof doc._id === "string" ? doc._id : doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    sourcePostId: doc.sourcePostId,
    content: doc.content,
    image: doc.image,
    imageAlt: doc.imageAlt,
    shortDescription: doc.shortDescription,
    category: doc.category,
    status: doc.status,
    metaKeywords: doc.metaKeywords,
    metaTitle: doc.metaTitle,
    metaDescription: doc.metaDescription,
    canonicalUrl: doc.canonicalUrl,
    schemaMarkup: doc.schemaMarkup,
    contentClusterId: doc.contentClusterId,
    parentTopicSlug: doc.parentTopicSlug,
    publishedAt: serializeDate(doc.publishedAt),
    createdAt: serializeDate(doc.createdAt) || new Date().toISOString(),
    updatedAt: serializeDate(doc.updatedAt) || new Date().toISOString(),
    faqItems: serializeFaqItems(doc),
    internalLinks: serializeInternalLinks(doc),
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

type DeletedBlogCleanupDocument = Pick<
  StoredBlogDocument,
  "_id" | "title" | "slug" | "sourcePostId" | "canonicalUrl" | "content" | "internalLinks"
>;

function toObjectIdString(value: mongoose.Types.ObjectId | string) {
  return typeof value === "string" ? value : value.toString();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function revalidateBlogPublicPaths(slugs: Iterable<string> = []) {
  const { revalidatePath } = await import("next/cache");
  const uniqueSlugs = new Set<string>();

  for (const slug of slugs) {
    const normalizedSlug = slug?.trim();
    if (normalizedSlug) {
      uniqueSlugs.add(normalizedSlug);
    }
  }

  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  for (const slug of uniqueSlugs) {
    revalidatePath(`/blog/${slug}`);
  }
}

async function cleanupDeletedBlogReferences(deletedBlogs: DeletedBlogCleanupDocument[]) {
  const deletedSlugs = Array.from(
    new Set(deletedBlogs.map((blog) => blog.slug).filter(isNonEmptyString)),
  );
  const hrefCandidates = Array.from(
    new Set(
      deletedBlogs.flatMap((blog) =>
        buildDeletedBlogHrefCandidates({
          slug: blog.slug,
          canonicalUrl: blog.canonicalUrl,
        }),
      ),
    ),
  );
  const changedSlugs = new Set<string>();
  const referenceConditions: Record<string, unknown>[] = [];

  if (hrefCandidates.length > 0) {
    referenceConditions.push({ "internalLinks.href": { $in: hrefCandidates } });
  }

  if (deletedSlugs.length > 0) {
    referenceConditions.push({ "internalLinks.targetPostSlug": { $in: deletedSlugs } });
  }

  if (referenceConditions.length > 0) {
    const referencedBlogs = (await Blog.find({ $or: referenceConditions })
      .select("slug")
      .lean()
      .exec()) as Array<{ slug?: string }>;

    for (const blog of referencedBlogs) {
      if (blog.slug) {
        changedSlugs.add(blog.slug);
      }
    }

    if (hrefCandidates.length > 0) {
      await Blog.updateMany(
        {},
        { $pull: { internalLinks: { href: { $in: hrefCandidates } } } },
      ).exec();
    }

    if (deletedSlugs.length > 0) {
      await Blog.updateMany(
        {},
        { $pull: { internalLinks: { targetPostSlug: { $in: deletedSlugs } } } },
      ).exec();
    }
  }

  if (hrefCandidates.length === 0) {
    return Array.from(changedSlugs);
  }

  const remainingBlogs = (await Blog.find()
    .select("_id slug content")
    .lean()
    .exec()) as Array<{
    _id: mongoose.Types.ObjectId | string;
    slug?: string;
    content?: string;
  }>;

  const contentUpdates = [];
  for (const blog of remainingBlogs) {
    const currentContent = typeof blog.content === "string" ? blog.content : "";
    const cleanedContent = stripDeletedBlogLinksFromContent(currentContent, hrefCandidates);

    if (cleanedContent !== currentContent) {
      contentUpdates.push({
        updateOne: {
          filter: { _id: blog._id },
          update: { $set: { content: cleanedContent, updatedAt: new Date() } },
        },
      });

      if (blog.slug) {
        changedSlugs.add(blog.slug);
      }
    }
  }

  if (contentUpdates.length > 0) {
    await Blog.bulkWrite(contentUpdates);
  }

  return Array.from(changedSlugs);
}

async function markDeletedPublicBlogsInAiBlogger(deletedBlogs: DeletedBlogCleanupDocument[]) {
  const sourcePostIds = Array.from(
    new Set(deletedBlogs.map((blog) => blog.sourcePostId).filter(isNonEmptyString)),
  );
  const deletedSlugs = Array.from(
    new Set(deletedBlogs.map((blog) => blog.slug).filter(isNonEmptyString)),
  );
  const deletedEntryIds = Array.from(
    new Set(deletedBlogs.map((blog) => toObjectIdString(blog._id)).filter(Boolean)),
  );
  const sourceObjectIds = sourcePostIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const filters: Record<string, unknown>[] = [];

  if (sourcePostIds.length > 0) {
    filters.push({ id: { $in: sourcePostIds } });
  }

  if (sourceObjectIds.length > 0) {
    filters.push({ _id: { $in: sourceObjectIds } });
  }

  if (deletedSlugs.length > 0) {
    filters.push({ publishedEntrySlug: { $in: deletedSlugs } });
  }

  if (deletedEntryIds.length > 0) {
    filters.push({ publishedEntryId: { $in: deletedEntryIds } });
  }

  if (filters.length === 0) {
    return;
  }

  try {
    await connectPrimaryDb();
    await BlogStudioPostModel.updateMany(
      { $or: filters },
      {
        $set: {
          status: "SEO Review",
          deliveryStatus: "failed",
          deliveryError: "Public marketing blog was deleted in super-admin blog management.",
          updatedAt: new Date().toISOString(),
          updatedBy: "super-admin-blog-delete",
        },
        $unset: {
          publishedEntryId: 1,
          publishedEntrySlug: 1,
          publishedTargetUrl: 1,
          publishedAt: 1,
          publishedMetadataValidatedAt: 1,
        },
      },
    ).exec();
  } catch (error) {
    console.warn("Failed to sync deleted public blog state back to AI Blogger:", error);
  }
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
    await dbConnect();

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
    await dbConnect();

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
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid blog ID");
    }

    const currentBlog = (await Blog.findById(id)
      .select("slug canonicalUrl status")
      .lean()
      .exec()) as Pick<StoredBlogDocument, "slug" | "canonicalUrl" | "status"> | null;
    if (!currentBlog) {
      throw new Error("Blog not found");
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

    if (updates.canonicalUrl !== undefined) {
      const normalizedCanonicalUrl = normalizeMarketingCanonicalUrl(
        updates.canonicalUrl,
        updates.slug || currentBlog.slug,
      );
      if (normalizedCanonicalUrl) {
        const existingCanonicalBlog = await Blog.findOne({
          canonicalUrl: normalizedCanonicalUrl,
          _id: { $ne: id },
        }).select("slug").lean().exec();

        if (existingCanonicalBlog) {
          throw new Error("Canonical URL already exists");
        }
      }

      updates.canonicalUrl = normalizedCanonicalUrl || undefined;
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
      { returnDocument: 'after', runValidators: true }
    ).lean().exec()) as StoredBlogDocument | null;

    if (!blog) {
      throw new Error("Blog not found");
    }

    await revalidateBlogPublicPaths([currentBlog.slug, blog.slug]);

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
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      const duplicateField =
        typeof (error as { keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> }).keyPattern === "object"
          ? Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern || {})[0]
          : Object.keys((error as { keyValue?: Record<string, unknown> }).keyValue || {})[0];
      throw new Error(duplicateField === "canonicalUrl" ? "Canonical URL already exists" : "Slug already exists");
    }
    throw error;
  }
}

/**
 * Delete a blog
 */
export async function deleteBlog(id: string): Promise<void> {
  try {
    await verifySuperAdmin();
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid blog ID");
    }

    const blog = (await Blog.findById(id).lean().exec()) as DeletedBlogCleanupDocument | null;

    if (!blog) {
      throw new Error("Blog not found");
    }

    await Blog.deleteOne({ _id: id }).exec();

    // Log audit change
    await logBlogAuditChange(
      id,
      "delete",
      `Deleted blog: ${blog.title}`
    );

    const changedSlugs = await cleanupDeletedBlogReferences([blog]);
    await markDeletedPublicBlogsInAiBlogger([blog]);
    await revalidateBlogPublicPaths([blog.slug, ...changedSlugs]);
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
    await dbConnect();

    const categories = await Blog.distinct("category").exec() as string[];
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
    await dbConnect();

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
    await dbConnect();

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      throw new Error("No valid blog IDs provided");
    }

    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
    const blogs = (await Blog.find({
      _id: { $in: objectIds },
    })
      .lean()
      .exec()) as DeletedBlogCleanupDocument[];

    if (blogs.length === 0) {
      throw new Error("No blogs found for deletion");
    }

    const result = await Blog.deleteMany({
      _id: { $in: objectIds },
    }).exec();

    // Log audit changes for each deleted blog
    for (const blog of blogs) {
      const blogId = toObjectIdString(blog._id);
      await logBlogAuditChange(
        blogId,
        "delete",
        `Bulk deleted blog: ${blog.title}`
      );
    }

    const changedSlugs = await cleanupDeletedBlogReferences(blogs);
    await markDeletedPublicBlogsInAiBlogger(blogs);
    await revalidateBlogPublicPaths([...blogs.map((blog) => blog.slug), ...changedSlugs]);

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
    await dbConnect();

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      throw new Error("No valid blog IDs provided");
    }

    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
    const blogs = (await Blog.find({ _id: { $in: objectIds } })
      .select("slug")
      .lean()
      .exec()) as Array<{ slug?: string }>;

    const update: Record<string, unknown> = { status };
    if (status === "published") {
      update.publishedAt = new Date();
    } else {
      update.publishedAt = null;
    }

    const result = await Blog.updateMany(
      { _id: { $in: objectIds } },
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

    await revalidateBlogPublicPaths(blogs.map((blog) => blog.slug || ""));

    return { modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error("Error bulk updating blog status:", error);
    throw error;
  }
}
