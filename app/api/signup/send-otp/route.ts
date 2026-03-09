import { NextResponse } from 'next/server';
import { connectDB, UserModel, SuperAdminModel, ClientModel, OtpModel, RateLimitModel } from '@/lib/mongodb';
import { validateEmail, validateCsrfOrigin } from '@/lib/validation';
import { sendOtpEmail } from '@/lib/brevo';
import { randomInt } from 'crypto';

const MAX_OTP_REQUESTS = 5;
const OTP_RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_IP_REQUESTS = 10;

function generateOtp(): string {
    return randomInt(100000, 999999).toString();
}

export async function POST(request: Request) {
    try {
        const csrf = validateCsrfOrigin(request);
        if (!csrf.valid) return csrf.response;

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

        await connectDB();
        const now = new Date();

        // ── Rate limit by email (MongoDB-backed) ──
        const emailRateKey = `otp:email:${validatedEmail}`;
        const emailRecord = await RateLimitModel.findOne({ key: emailRateKey, expiresAt: { $gt: now } }).lean();
        if (emailRecord) {
            if ((emailRecord as any).count >= MAX_OTP_REQUESTS) {
                return NextResponse.json(
                    { error: 'Too many OTP requests. Please try again later.' },
                    { status: 429 }
                );
            }
            await RateLimitModel.updateOne({ key: emailRateKey }, { $inc: { count: 1 } });
        } else {
            await RateLimitModel.findOneAndUpdate(
                { key: emailRateKey },
                { count: 1, expiresAt: new Date(now.getTime() + OTP_RATE_WINDOW) },
                { upsert: true }
            );
        }

        // ── Rate limit by IP (MongoDB-backed) ──
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';
        const ipRateKey = `otp:ip:${ip}`;
        const ipRecord = await RateLimitModel.findOne({ key: ipRateKey, expiresAt: { $gt: now } }).lean();
        if (ipRecord) {
            if ((ipRecord as any).count >= MAX_IP_REQUESTS) {
                return NextResponse.json(
                    { error: 'Too many requests from this device. Please try again later.' },
                    { status: 429 }
                );
            }
            await RateLimitModel.updateOne({ key: ipRateKey }, { $inc: { count: 1 } });
        } else {
            await RateLimitModel.findOneAndUpdate(
                { key: ipRateKey },
                { count: 1, expiresAt: new Date(now.getTime() + OTP_RATE_WINDOW) },
                { upsert: true }
            );
        }

        // ── Check if email already exists (across all collections) ──
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

        // ── Generate OTP and store in MongoDB with TTL ──
        const otp = generateOtp();
        await OtpModel.findOneAndUpdate(
            { email: validatedEmail },
            { otp, attempts: 0, expiresAt: new Date(now.getTime() + 5 * 60 * 1000) },
            { upsert: true }
        );

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
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
    await connectDB();
    const record = await OtpModel.findOne({ email }).lean();
    if (!record) {
        throw new Error('No verification code found. Please request a new one.');
    }

    if (new Date() > new Date((record as any).expiresAt)) {
        await OtpModel.deleteOne({ email });
        throw new Error('Verification code expired. Please request a new one.');
    }

    // Max 3 wrong attempts
    if ((record as any).attempts >= 3) {
        await OtpModel.deleteOne({ email });
        throw new Error('Too many wrong attempts. Please request a new code.');
    }

    if ((record as any).otp !== otp) {
        await OtpModel.updateOne({ email }, { $inc: { attempts: 1 } });
        const remaining = 3 - ((record as any).attempts + 1);
        throw new Error(`Invalid verification code. ${remaining} attempts remaining.`);
    }

    // Valid — clean up
    await OtpModel.deleteOne({ email });
    return true;
}
