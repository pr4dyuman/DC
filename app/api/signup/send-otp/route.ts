import { NextResponse } from 'next/server';
import { connectDB, UserModel, SuperAdminModel, ClientModel } from '@/lib/mongodb';
import { validateEmail } from '@/lib/validation';
import { sendOtpEmail } from '@/lib/brevo';

// ── In-memory OTP store (per-process) ──
// Key: email, Value: { otp, expiresAt, attempts }
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

// ── Rate limiting: max 5 OTP requests per email per hour ──
const otpRateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_OTP_REQUESTS = 5;
const OTP_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

// ── IP rate limiting: max 10 OTP requests per IP per hour ──
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_IP_REQUESTS = 10;

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate email format
        let validatedEmail: string;
        try {
            validatedEmail = validateEmail(email);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // ── Rate limit by email ──
        const now = Date.now();
        const emailRecord = otpRateLimit.get(validatedEmail);
        if (emailRecord && now < emailRecord.resetAt) {
            if (emailRecord.count >= MAX_OTP_REQUESTS) {
                return NextResponse.json(
                    { error: 'Too many OTP requests. Please try again later.' },
                    { status: 429 }
                );
            }
            emailRecord.count++;
        } else {
            otpRateLimit.set(validatedEmail, { count: 1, resetAt: now + OTP_RATE_WINDOW });
        }

        // ── Rate limit by IP ──
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';
        const ipRecord = ipRateLimit.get(ip);
        if (ipRecord && now < ipRecord.resetAt) {
            if (ipRecord.count >= MAX_IP_REQUESTS) {
                return NextResponse.json(
                    { error: 'Too many requests from this device. Please try again later.' },
                    { status: 429 }
                );
            }
            ipRecord.count++;
        } else {
            ipRateLimit.set(ip, { count: 1, resetAt: now + OTP_RATE_WINDOW });
        }

        // ── Check if email already exists (across all collections) ──
        await connectDB();
        const [existingUser, existingSuperAdmin, existingClient] = await Promise.all([
            UserModel.findOne({ email: validatedEmail }).lean(),
            SuperAdminModel.findOne({ email: validatedEmail }).lean(),
            ClientModel.findOne({ email: validatedEmail }).lean(),
        ]);

        if (existingUser || existingSuperAdmin || existingClient) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        // ── Generate OTP ──
        const otp = generateOtp();
        otpStore.set(validatedEmail, {
            otp,
            expiresAt: now + 5 * 60 * 1000, // 5 minutes
            attempts: 0,
        });

        // ── Send OTP via Brevo ──
        const result = await sendOtpEmail(validatedEmail, otp);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Failed to send verification email. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your email',
        });

    } catch (error: any) {
        console.error('Send OTP error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * Verify an OTP (called internally by the signup route).
 * Returns true if valid, throws error if invalid/expired.
 */
export function verifyOtp(email: string, otp: string): boolean {
    const record = otpStore.get(email);
    if (!record) {
        throw new Error('No verification code found. Please request a new one.');
    }

    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        throw new Error('Verification code expired. Please request a new one.');
    }

    // Max 3 wrong attempts
    if (record.attempts >= 3) {
        otpStore.delete(email);
        throw new Error('Too many wrong attempts. Please request a new code.');
    }

    if (record.otp !== otp) {
        record.attempts++;
        throw new Error(`Invalid verification code. ${3 - record.attempts} attempts remaining.`);
    }

    // Valid — clean up
    otpStore.delete(email);
    return true;
}
