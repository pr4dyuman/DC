import { NextResponse } from 'next/server';
import dbConnect from '@/lib/marketing-db';
import Admin from '@/models/marketing/Admin';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { validateCsrfOrigin } from '@/lib/validation';

const JWT_SECRET = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(JWT_SECRET);

// In-memory rate limiting
const loginAttempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase().trim();
  const record = loginAttempts.get(key);
  if (record && now < record.resetAt) {
    if (record.count >= MAX_ATTEMPTS) return false;
    record.count++;
  } else {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }
  return true;
}

export async function POST(req) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;

    if (!JWT_SECRET) {
      return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    if (!checkRateLimit(email)) {
      return NextResponse.json({ success: false, error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await admin.comparePassword(password);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Issue JWT
    const token = await new SignJWT({ adminId: admin._id.toString(), email: admin.email, role: 'marketing-admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(encodedKey);

    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    // Clear rate limit on success
    loginAttempts.delete(email.toLowerCase().trim());

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
