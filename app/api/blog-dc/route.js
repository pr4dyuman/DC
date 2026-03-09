import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import { checkAuth } from '@/lib/authMiddleware';
import DOMPurify from 'isomorphic-dompurify';
import { sanitizeName, sanitizeString, validateCsrfOrigin } from '@/lib/validation';

// Cache for 60 seconds - public blog list doesn't need real-time updates
export const revalidate = 60;

export async function GET() {
  try {
    await dbConnect();
    
    // Use lean() for faster queries and select only needed fields
    const blogs = await Blog.find({})
      .select('title shortDescription category status image slug createdAt')
      .sort({ createdAt: -1 })
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
    const blogData = {
      title: body.title ? sanitizeName(body.title, 500) : undefined,
      shortDescription: body.shortDescription ? sanitizeString(body.shortDescription, 1000) : undefined,
      content: body.content ? DOMPurify.sanitize(body.content) : undefined,
      category: body.category ? sanitizeName(body.category, 200) : undefined,
      status: body.status === 'published' || body.status === 'draft' ? body.status : 'draft',
      image: body.image ? sanitizeString(body.image, 2000) : undefined,
      slug: body.slug ? sanitizeName(body.slug, 500) : undefined,
    };
    // Remove undefined fields
    Object.keys(blogData).forEach(k => blogData[k] === undefined && delete blogData[k]);
    if (!blogData.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    const blog = await Blog.create(blogData);

    return NextResponse.json({ success: true, data: blog }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}


