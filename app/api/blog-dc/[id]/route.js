import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

import { checkAuth } from '@/lib/authMiddleware';
import { logBlogAuditChange } from '@/lib/blog-audit-log';
import { describeBlogSaveError, missingBlogFields, readBlogInput } from '@/lib/marketing-blog-input';
import {
  cleanupDeletedBlogReferences,
  markDeletedPublicBlogsInAiBlogger,
  revalidateBlogPublicPaths,
} from '@/lib/marketing-blog-maintenance';
import dbConnect from '@/lib/marketing-db';
import { validateCsrfOrigin } from '@/lib/validation';
import Blog from '@/models/marketing/Blog';

export const dynamic = 'force-dynamic';

// One blog post for the content admin at /admin: read it for editing, save
// changes, or delete it. Deleting also removes links to it from other posts.

const EDITABLE_FIELDS = 'title shortDescription content category status image metaKeywords slug publishedAt createdAt updatedAt';

async function authorise(req, { write = false } = {}) {
  if (write) {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;
  }
  const auth = await checkAuth();
  return auth.authorized ? null : auth.response;
}

function notFound() {
  return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
}

export async function GET(req, { params }) {
  try {
    const blocked = await authorise(req);
    if (blocked) return blocked;

    const { id } = await params;
    if (!mongoose.isObjectIdOrHexString(id)) return notFound();

    await dbConnect();
    const blog = await Blog.findById(id).select(EDITABLE_FIELDS).lean();
    if (!blog) return notFound();

    return NextResponse.json({ success: true, data: blog }, { status: 200 });
  } catch (error) {
    console.error('Error loading blog:', error);
    return NextResponse.json({ success: false, error: 'Server error. Try again in a moment.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const blocked = await authorise(req, { write: true });
    if (blocked) return blocked;

    const { id } = await params;
    if (!mongoose.isObjectIdOrHexString(id)) return notFound();

    await dbConnect();
    const current = await Blog.findById(id).select('slug status publishedAt title shortDescription content category image').lean();
    if (!current) return notFound();

    const updates = readBlogInput(await req.json());
    const missing = missingBlogFields({ ...current, ...updates });
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Please add the ${missing.join(', ')}.` }, { status: 400 });
    }

    const set = { ...updates };
    const unset = {};
    if (updates.status === 'published' && (current.status !== 'published' || !current.publishedAt)) {
      set.publishedAt = new Date();
    } else if (updates.status === 'draft') {
      unset.publishedAt = '';
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: 'after', runValidators: true }
    )
      .select(EDITABLE_FIELDS)
      .lean();
    if (!blog) return notFound();

    const action =
      updates.status === 'published' && current.status !== 'published'
        ? 'publish'
        : updates.status === 'draft' && current.status === 'published'
          ? 'unpublish'
          : 'update';
    await logBlogAuditChange(id, action, `Updated in /admin: ${Object.keys(updates).join(', ')}`);
    await revalidateBlogPublicPaths([current.slug, blog.slug]);

    return NextResponse.json({ success: true, data: blog }, { status: 200 });
  } catch (error) {
    console.error('Error updating blog:', error);
    const { status, message } = describeBlogSaveError(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(req, { params }) {
  try {
    const blocked = await authorise(req, { write: true });
    if (blocked) return blocked;

    const { id } = await params;
    if (!mongoose.isObjectIdOrHexString(id)) return notFound();

    await dbConnect();
    const blog = await Blog.findById(id).lean();
    if (!blog) return notFound();

    await Blog.deleteOne({ _id: id });
    await logBlogAuditChange(id, 'delete', `Deleted blog in /admin: ${blog.title}`);
    const changedSlugs = await cleanupDeletedBlogReferences([blog]);
    await markDeletedPublicBlogsInAiBlogger([blog]);
    await revalidateBlogPublicPaths([blog.slug, ...changedSlugs]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json({ success: false, error: 'Could not delete the post. Try again in a moment.' }, { status: 500 });
  }
}
