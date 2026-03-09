import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Blog from '@/models/marketing/Blog';
import { checkAuth } from '@/lib/authMiddleware';
import DOMPurify from 'isomorphic-dompurify';

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
    await dbConnect();
    
    // Use auth middleware
    const auth = await checkAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    if (body.content) {
      body.content = DOMPurify.sanitize(body.content);
    }
    const blog = await Blog.create(body);

    return NextResponse.json({ success: true, data: blog }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}


