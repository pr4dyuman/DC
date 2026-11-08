import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import { checkAuth } from '@/lib/authMiddleware';
import { sanitizeName, validateCsrfOrigin } from '@/lib/validation';
import { logBlogAuditChange } from '@/lib/blog-audit-log';
import { revalidateBlogPublicPaths } from '@/lib/marketing-blog-maintenance';
import { describeBlogSaveError, missingBlogFields, readBlogInput } from '@/lib/marketing-blog-input';
import { normalizeMarketingCanonicalUrl } from '@/lib/marketing-blog-utils';
import { LEGACY_REDIRECTED_BLOG_SLUGS, REMOVED_BLOG_SLUGS } from '@/lib/marketing-blog-cleanup';

// Cache for 60 seconds - public blog list doesn't need real-time updates
export const revalidate = 60;

export async function GET(request) {
  try {
    await dbConnect();
    const auth = await checkAuth();
    const isAdmin = auth.authorized === true;
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 50, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset')) || 0, 0);
    const requestedStatus = searchParams.get('status');
    const query = {};

    if (isAdmin) {
      if (requestedStatus === 'published' || requestedStatus === 'draft') {
        query.status = requestedStatus;
      }
    } else {
      query.status = 'published';
      query.slug = { $nin: [...REMOVED_BLOG_SLUGS, ...LEGACY_REDIRECTED_BLOG_SLUGS] };
    }

    const selectFields = isAdmin
      ? 'title shortDescription category status image slug createdAt'
      : 'title shortDescription category image slug createdAt';

    // Use lean() for faster queries and select only needed fields
    const blogs = await Blog.find(query)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
      
    return NextResponse.json({ success: true, data: blogs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;

    await dbConnect();
    
    // Use auth middleware
    const auth = await checkAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    // Whitelist fields and sanitize
    const normalizedCanonicalUrl = body.canonicalUrl
      ? normalizeMarketingCanonicalUrl(String(body.canonicalUrl), body.slug ? sanitizeName(body.slug, 500) : undefined)
      : '';
    const blogData = {
      ...readBlogInput(body),
      slug: body.slug ? sanitizeName(body.slug, 500) : undefined,
      canonicalUrl: normalizedCanonicalUrl || undefined,
    };
    blogData.status = blogData.status || 'draft';
    if (blogData.status === 'published') {
      blogData.publishedAt = new Date();
    }
    // Remove undefined fields
    Object.keys(blogData).forEach(k => blogData[k] === undefined && delete blogData[k]);

    const missing = missingBlogFields(blogData);
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Please add the ${missing.join(', ')}.` }, { status: 400 });
    }

    if (blogData.canonicalUrl) {
      const canonicalConflict = await Blog.findOne({ canonicalUrl: blogData.canonicalUrl }).select('slug').lean();
      if (canonicalConflict) {
        return NextResponse.json(
          { success: false, error: `Canonical URL already exists on blog "${canonicalConflict.slug}"` },
          { status: 409 }
        );
      }
    }

    const blog = await Blog.create(blogData);
    await logBlogAuditChange(blog._id.toString(), 'create', `Created blog: ${blog.title}`);
    await revalidateBlogPublicPaths([blog.slug]);

    return NextResponse.json({ success: true, data: blog }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog:', error);
    const { status, message } = describeBlogSaveError(error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
