import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import dbConnect from '@/lib/marketing-db';
import Contact from '@/models/marketing/Contact';
import { sendUserThankYouEmail, sendAdminNotificationEmail } from '@/lib/email';
import { sanitizeName, sanitizeString, sanitizePhone, validateEmail, validateCsrfOrigin } from '@/lib/validation';
import { RateLimitModel, connectDB } from '@/lib/mongodb';

const MAX_CONTACT_REQUESTS_PER_DAY = 3;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const CONTACT_DEVICE_COOKIE = 'dc_contact_device';
const CONTACT_DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days
const CONTACT_SUCCESS_MESSAGE = 'Thank you for contacting us! We will get back to you soon.';

function getIstDayStamp(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextIstMidnightUtc(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1) - IST_OFFSET_MS
  );
}

function getRetryAfterSeconds(resetAt, now) {
  return Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
}

function getCookieFromHeader(request, name) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((value) => value.trim());
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) return '';

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return '';
  }
}

function getContactDevice(request) {
  const existingDeviceId =
    request.cookies?.get(CONTACT_DEVICE_COOKIE)?.value ||
    getCookieFromHeader(request, CONTACT_DEVICE_COOKIE);
  const hasValidDeviceId = /^[a-f0-9-]{36}$/i.test(existingDeviceId);

  return {
    deviceId: hasValidDeviceId ? existingDeviceId : randomUUID(),
    shouldSetCookie: !hasValidDeviceId,
  };
}

function createJsonResponse(body, init, device) {
  const response = NextResponse.json(body, init);

  if (device?.shouldSetCookie) {
    response.cookies.set(CONTACT_DEVICE_COOKIE, device.deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CONTACT_DEVICE_COOKIE_MAX_AGE,
    });
  }

  return response;
}

async function checkContactDailyLimit(key, now, resetAt) {
  const record = await RateLimitModel.findOne({ key, expiresAt: { $gt: now } }).lean();

  if (record && record.count >= MAX_CONTACT_REQUESTS_PER_DAY) {
    return {
      limited: true,
      retryAfterSeconds: getRetryAfterSeconds(resetAt, now),
    };
  }

  if (record) {
    await RateLimitModel.updateOne({ key }, { $inc: { count: 1 }, $set: { expiresAt: resetAt } });
  } else {
    await RateLimitModel.findOneAndUpdate(
      { key },
      { count: 1, expiresAt: resetAt },
      { upsert: true }
    );
  }

  return { limited: false, retryAfterSeconds: 0 };
}

async function enforceContactDailyLimit(scope, value, now, resetAt) {
  const dayStamp = getIstDayStamp(now);
  return checkContactDailyLimit(`contact:daily:${scope}:${dayStamp}:${value || 'unknown'}`, now, resetAt);
}

function getReadableWordCount(value) {
  return String(value || '').match(/[A-Za-z0-9][A-Za-z0-9'-]{1,}/g)?.length || 0;
}

function looksLikeRandomToken(value) {
  const text = String(value || '').trim();
  return text.length >= 12 && /^[A-Za-z]+$/.test(text) && /[a-z]/.test(text) && /[A-Z]/.test(text);
}

function hasValidPhoneLength(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

function looksLikeBotSubmission({ fullName, companyName, message }) {
  if (getReadableWordCount(message) < 2) return true;

  const randomTokenCount = [fullName, companyName, message].filter(looksLikeRandomToken).length;
  return randomTokenCount >= 2;
}

function getEmailDeliveryStatus(result) {
  if (result.status !== 'fulfilled') return 'failed';
  return result.value?.skipped ? 'skipped' : 'sent';
}

function getEmailFailureMessage(...results) {
  const messages = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message || String(result.reason || 'Email delivery failed'))
    .filter(Boolean);

  return messages.join(' | ').slice(0, 1000);
}

async function updateContactEmailMetadata(contactId, metadata) {
  try {
    await Contact.updateOne(
      { _id: contactId },
      { $set: metadata }
    );
  } catch (metadataError) {
    console.error('Failed to update contact email metadata:', metadataError);
  }
}

export async function POST(request) {
  let json = (body, init) => NextResponse.json(body, init);

  try {
    const csrf = validateCsrfOrigin(request);
    if (!csrf.valid) return csrf.response;

    const device = getContactDevice(request);
    json = (body, init) => createJsonResponse(body, init, device);

    // Daily rate limit by IP and browser/device cookie.
    await connectDB();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
    const now = new Date();
    const resetAt = getNextIstMidnightUtc(now);
    const ipLimit = await enforceContactDailyLimit('ip', ip, now, resetAt);
    if (ipLimit.limited) {
      return json(
        { error: 'Too many contact form submissions today. Please try again tomorrow.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const deviceLimit = await enforceContactDailyLimit('device', device.deviceId, now, resetAt);
    if (deviceLimit.limited) {
      return json(
        { error: 'Too many contact form submissions from this device today. Please try again tomorrow.' },
        { status: 429, headers: { 'Retry-After': String(deviceLimit.retryAfterSeconds) } }
      );
    }

    // Parse request body
    const body = await request.json();
    let { fullName, email, phone, companyName, message, website } = body;

    // Honeypot field: real users never see or fill this.
    if (typeof website === 'string' && website.trim()) {
      return json(
        { success: true, message: CONTACT_SUCCESS_MESSAGE },
        { status: 200 }
      );
    }

    // Validate required fields
    if (!fullName || !email || !phone || !message) {
      return json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    try {
      email = validateEmail(email);
    } catch {
      return json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const emailLimit = await enforceContactDailyLimit('email', email, now, resetAt);
    if (emailLimit.limited) {
      return json(
        { error: 'Too many contact form submissions for this email today. Please try again tomorrow.' },
        { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfterSeconds) } }
      );
    }

    // Sanitize inputs
    fullName = sanitizeName(fullName, 200);
    phone = sanitizePhone(phone);
    companyName = companyName ? sanitizeName(companyName, 200) : '';
    message = sanitizeString(message, 5000);

    if (!fullName || !message) {
      return json(
        { error: 'Name and message are required' },
        { status: 400 }
      );
    }
    if (!phone || !hasValidPhoneLength(phone)) {
      return json(
        { error: 'A valid phone number is required' },
        { status: 400 }
      );
    }
    const phoneLimit = await enforceContactDailyLimit('phone', phone.replace(/\D/g, ''), now, resetAt);
    if (phoneLimit.limited) {
      return json(
        { error: 'Too many contact form submissions for this phone number today. Please try again tomorrow.' },
        { status: 429, headers: { 'Retry-After': String(phoneLimit.retryAfterSeconds) } }
      );
    }
    if (looksLikeBotSubmission({ fullName, companyName, message })) {
      return json(
        { error: 'Please enter a clear message with a few words.' },
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
      source: 'contact_page',
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

      const userEmailStatus = getEmailDeliveryStatus(userEmailResult);
      const adminEmailStatus = getEmailDeliveryStatus(adminEmailResult);
      const everyEmailFailed = userEmailStatus === 'failed' && adminEmailStatus === 'failed';
      await updateContactEmailMetadata(contact._id, {
        userEmailStatus,
        adminEmailStatus,
        emailError: getEmailFailureMessage(userEmailResult, adminEmailResult),
      });

      if (everyEmailFailed) {
        // Both emails failed, but contact was saved
        console.error('Both emails failed to send');
        return json(
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
      return json(
        {
          success: true,
          message: CONTACT_SUCCESS_MESSAGE,
          contactId: contact._id,
          emailStatus: {
            userEmail: userEmailStatus,
            adminEmail: adminEmailStatus
          }
        },
        { status: 201 }
      );

    } catch (emailError) {
      // Email sending failed, but contact was saved
      console.error('Email error:', emailError);
      await updateContactEmailMetadata(contact._id, {
        userEmailStatus: 'failed',
        adminEmailStatus: 'failed',
        emailError: (emailError?.message || String(emailError || 'Email delivery failed')).slice(0, 1000),
      });
      return json(
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
      return json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Handle other errors
    return json(
      { error: 'Failed to process contact form. Please try again later.' },
      { status: 500 }
    );
  }
}


