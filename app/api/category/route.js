import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/marketing-db';
import Category from '@/models/marketing/Category';
import { checkAuth } from '@/lib/authMiddleware';
import { sanitizeName, validateCsrfOrigin } from '@/lib/validation';

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
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;

    await dbConnect();

    // Use auth middleware
    const auth = await checkAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    
    // Sanitize + validate
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }
    const sanitizedName = sanitizeName(body.name, 200);
    if (!sanitizedName) {
      return NextResponse.json({ success: false, error: 'Invalid category name' }, { status: 400 });
    }

    // Check duplicates
    const existing = await Category.findOne({ name: sanitizedName }).lean();
    if (existing) {
      return NextResponse.json({ success: false, error: 'Category already exists' }, { status: 400 });
    }

    const category = await Category.create({ name: sanitizedName });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid category ID' }, { status: 400 });
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


