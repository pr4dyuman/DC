import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Contact from '@/models/marketing/Contact';
import { sendUserThankYouEmail, sendAdminNotificationEmail } from '@/lib/email';
import { sanitizeName, sanitizeString, sanitizePhone, validateEmail, validateCsrfOrigin } from '@/lib/validation';
import { RateLimitModel, connectDB } from '@/lib/mongodb';

const MAX_CONTACT_REQUESTS = 5;
const CONTACT_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(request) {
  try {
    const csrf = validateCsrfOrigin(request);
    if (!csrf.valid) return csrf.response;

    // Rate limit by IP
    await connectDB();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
    const now = new Date();
    const rateKey = `contact:ip:${ip}`;
    const ipRecord = await RateLimitModel.findOne({ key: rateKey, expiresAt: { $gt: now } }).lean();
    if (ipRecord && ipRecord.count >= MAX_CONTACT_REQUESTS) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    if (ipRecord) {
      await RateLimitModel.updateOne({ key: rateKey }, { $inc: { count: 1 } });
    } else {
      await RateLimitModel.findOneAndUpdate(
        { key: rateKey },
        { count: 1, expiresAt: new Date(now.getTime() + CONTACT_WINDOW) },
        { upsert: true }
      );
    }

    // Parse request body
    const body = await request.json();
    let { fullName, email, phone, companyName, message } = body;

    // Validate required fields
    if (!fullName || !email || !phone || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    try {
      email = validateEmail(email);
    } catch {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    fullName = sanitizeName(fullName, 200);
    phone = sanitizePhone(phone);
    companyName = companyName ? sanitizeName(companyName, 200) : '';
    message = sanitizeString(message, 5000);

    if (!fullName || !message) {
      return NextResponse.json(
        { error: 'Name and message are required' },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: 'A valid phone number is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Save contact to database
    const contact = await Contact.create({
      fullName,
      email,
      phone,
      companyName: companyName || '',
      message,
    });

    // Send emails concurrently
    try {
      const [userEmailResult, adminEmailResult] = await Promise.allSettled([
        sendUserThankYouEmail({ fullName, email }),
        sendAdminNotificationEmail({ fullName, email, phone, companyName, message })
      ]);

      // Log email results
      if (userEmailResult.status === 'fulfilled') {
        console.log('User email sent successfully:', userEmailResult.value);
      } else {
        console.error('Failed to send user email:', userEmailResult.reason);
      }

      if (adminEmailResult.status === 'fulfilled') {
        console.log('Admin email sent successfully:', adminEmailResult.value);
      } else {
        console.error('Failed to send admin email:', adminEmailResult.reason);
      }

      // Check if at least one email was sent successfully
      const atLeastOneEmailSent = 
        userEmailResult.status === 'fulfilled' || 
        adminEmailResult.status === 'fulfilled';

      if (!atLeastOneEmailSent) {
        // Both emails failed, but contact was saved
        console.error('Both emails failed to send');
        return NextResponse.json(
          {
            success: true,
            message: 'Contact saved but email notifications failed. We will respond soon.',
            contactId: contact._id,
            emailStatus: 'failed'
          },
          { status: 200 }
        );
      }

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: 'Thank you for contacting us! We will get back to you soon.',
          contactId: contact._id,
          emailStatus: {
            userEmail: userEmailResult.status === 'fulfilled' ? 'sent' : 'failed',
            adminEmail: adminEmailResult.status === 'fulfilled' ? 'sent' : 'failed'
          }
        },
        { status: 201 }
      );

    } catch (emailError) {
      // Email sending failed, but contact was saved
      console.error('Email error:', emailError);
      return NextResponse.json(
        {
          success: true,
          message: 'Contact saved but email notifications failed. We will respond soon.',
          contactId: contact._id,
          emailStatus: 'error'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Failed to process contact form. Please try again later.' },
      { status: 500 }
    );
  }
}


