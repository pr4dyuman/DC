import "server-only";

import mongoose from "mongoose";

import {
  buildDeletedBlogHrefCandidates,
  stripDeletedBlogLinksFromContent,
} from "@/lib/marketing-blog-delete-cleanup";
import { BlogStudioPostModel, connectDB as connectPrimaryDb } from "@/lib/mongodb";
import Blog from "@/models/marketing/Blog";

/**
 * Upkeep shared by the two places that edit public blog posts: Super Admin →
 * Blog Management and the content admin at /admin. Deleting a post removes
 * links to it from other posts and tells AI Blogger; any change refreshes the
 * public blog pages.
 */

/** The parts of a deleted blog the cleanup needs. */
export type DeletedBlogCleanupDocument = {
  _id: mongoose.Types.ObjectId | string;
  title: string;
  slug: string;
  sourcePostId?: string;
  canonicalUrl?: string;
  content: string;
  internalLinks?: Array<{ href?: string; targetPostSlug?: string }>;
};

export function toObjectIdString(value: mongoose.Types.ObjectId | string) {
  return typeof value === "string" ? value : value.toString();
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function revalidateBlogPublicPaths(slugs: Iterable<string> = []) {
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

export async function cleanupDeletedBlogReferences(deletedBlogs: DeletedBlogCleanupDocument[]) {
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

export async function markDeletedPublicBlogsInAiBlogger(deletedBlogs: DeletedBlogCleanupDocument[]) {
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
