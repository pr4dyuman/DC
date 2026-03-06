import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Contact from '@/models/marketing/Contact';
import { sendUserThankYouEmail, sendAdminNotificationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { fullName, email, phone, companyName, message } = body;

    // Validate required fields
    if (!fullName || !email || !phone || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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


