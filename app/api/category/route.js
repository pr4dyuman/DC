import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Category from '@/models/marketing/Category';
import { checkAuth } from '@/lib/authMiddleware';

// Cache for 5 minutes - categories change infrequently
export const revalidate = 300;

export async function GET() {
  try {
    await dbConnect();
    
    // Use lean() for faster queries
    const categories = await Category.find({})
      .sort({ name: 1 })
      .lean();
      
    return NextResponse.json({ success: true, data: categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
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
    
    // Check duplicates
    const existing = await Category.findOne({ name: body.name }).lean();
    if (existing) {
      return NextResponse.json({ success: false, error: 'Category already exists' }, { status: 400 });
    }

    const category = await Category.create(body);

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();

    // Use auth middleware
    const auth = await checkAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    }

    const category = await Category.findByIdAndDelete(id).lean();

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}


