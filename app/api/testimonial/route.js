import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Testimonial from '@/models/marketing/Testimonial';
import { checkAuth } from '@/lib/authMiddleware';
import { sanitizeName, sanitizeString } from '@/lib/validation';

// GET - Fetch all testimonials (public or admin)
export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    // If ID is provided, fetch single testimonial
    if (id) {
      const testimonial = await Testimonial.findById(id).lean();
      if (!testimonial) {
        return NextResponse.json(
          { success: false, error: 'Testimonial not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: testimonial });
    }

    // Build query — public requests only see active testimonials
    const query = {};
    if (status) {
      query.status = status;
    } else {
      // Default to active for public access
      query.status = 'active';
    }

    // Fetch testimonials sorted by order and creation date
    const testimonials = await Testimonial.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: testimonials });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

// POST - Create new testimonial (admin only)
export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await checkAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await dbConnect();

    const body = await request.json();
    const { text, name, company, status, order } = body;

    // Validation
    if (!text || !name || !company) {
      return NextResponse.json(
        { success: false, error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    // Create testimonial
    const testimonial = await Testimonial.create({
      text: sanitizeString(text, 5000),
      name: sanitizeName(name, 200),
      company: sanitizeName(company, 200),
      status: status === 'active' || status === 'inactive' ? status : 'active',
      order: typeof order === 'number' ? order : 0,
    });

    return NextResponse.json(
      { success: true, data: testimonial },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}

// PUT - Update testimonial (admin only)
export async function PUT(request) {
  try {
    // Verify authentication
    const authResult = await checkAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await dbConnect();

    const body = await request.json();
    const { id, text, name, company, status, order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Testimonial ID is required' },
        { status: 400 }
      );
    }

    // Find and update testimonial
    const updateData = {};
    if (text) updateData.text = sanitizeString(text, 5000);
    if (name) updateData.name = sanitizeName(name, 200);
    if (company) updateData.company = sanitizeName(company, 200);
    if (status === 'active' || status === 'inactive') updateData.status = status;
    if (typeof order === 'number') updateData.order = order;
    updateData.updatedAt = Date.now();

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: testimonial });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}

// DELETE - Delete testimonial (admin only)
export async function DELETE(request) {
  try {
    // Verify authentication
    const authResult = await checkAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Testimonial ID is required' },
        { status: 400 }
      );
    }

    const testimonial = await Testimonial.findByIdAndDelete(id);

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Testimonial deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}


