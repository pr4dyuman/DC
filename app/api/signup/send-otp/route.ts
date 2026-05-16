import { NextResponse } from 'next/server';
import { connectDB, UserModel, SuperAdminModel, ClientModel, OtpModel, RateLimitModel } from '@/lib/mongodb';
import { validateEmail, validateCsrfOrigin } from '@/lib/validation';
import { sendOtpEmail } from '@/lib/brevo';
import { randomInt } from 'crypto';
import { getPublicSecuritySettings } from '@/lib/actions/super-admin';

const MAX_OTP_REQUESTS = 5;
const OTP_RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_IP_REQUESTS = 10;

type RateLimitRecord = {
    count?: number;
};

type OtpRecord = {
    expiresAt?: string | Date;
    attempts?: number;
    otp?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

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

        // Check if self-registration is allowed
        const securitySettings = await getPublicSecuritySettings();
        if (!securitySettings.allowSelfRegistration) {
            return NextResponse.json(
                { error: 'Agency registration is currently disabled. Please contact the platform administrator.' },
                { status: 403 }
            );
        }

        // Validate email format
        let validatedEmail: string;
        try {
            validatedEmail = validateEmail(email);
        } catch (error: unknown) {
            return NextResponse.json({ error: getErrorMessage(error, 'Invalid email address') }, { status: 400 });
        }

        await connectDB();
        const now = new Date();

        // ── Rate limit by email (MongoDB-backed) ──
        const emailRateKey = `otp:email:${validatedEmail}`;
        const emailRecord = await RateLimitModel.findOne({ key: emailRateKey, expiresAt: { $gt: now } }).lean();
        if (emailRecord) {
            if (((emailRecord as RateLimitRecord).count ?? 0) >= MAX_OTP_REQUESTS) {
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
            if (((ipRecord as RateLimitRecord).count ?? 0) >= MAX_IP_REQUESTS) {
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
            // Return same success-like response to prevent email enumeration
            return NextResponse.json(
                { message: 'If this email is not already registered, you will receive an OTP shortly.' },
                { status: 200 }
            );
        }

        // ── Generate OTP and store in MongoDB with TTL ──
        const otp = generateOtp();
        await OtpModel.findOneAndUpdate(
            { email: validatedEmail, purpose: 'signup' },
            { otp, attempts: 0, expiresAt: new Date(now.getTime() + 5 * 60 * 1000), purpose: 'signup' },
            { upsert: true }
        );

        // ── Send OTP via Brevo ──
        const result = await sendOtpEmail(validatedEmail, otp);
        if (!result.success) {
            const status = result.error?.includes('disabled') ? 503 : 500;
            return NextResponse.json(
                { error: result.error || 'Failed to send verification email. Please try again.' },
                { status }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your email',
        });

    } catch (error: unknown) {
        console.error('Send OTP error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * Verify an OTP (called internally by the signup or forgot-password routes).
 * Returns true if valid, throws error if invalid/expired.
 */
export async function verifyOtp(email: string, otp: string, purpose: 'signup' | 'password-reset' = 'signup'): Promise<boolean> {
    await connectDB();
    const query = { email, purpose };
    const record = await OtpModel.findOne(query).lean();
    if (!record) {
        throw new Error('No verification code found. Please request a new one.');
    }
    const otpRecord = record as OtpRecord;

    if (!otpRecord.expiresAt || new Date() > new Date(otpRecord.expiresAt)) {
        await OtpModel.deleteOne(query);
        throw new Error('Verification code expired. Please request a new one.');
    }

    // Max 3 wrong attempts
    if ((otpRecord.attempts ?? 0) >= 3) {
        await OtpModel.deleteOne(query);
        throw new Error('Too many wrong attempts. Please request a new code.');
    }

    if (otpRecord.otp !== otp) {
        await OtpModel.updateOne(query, { $inc: { attempts: 1 } });
        const remaining = 3 - ((otpRecord.attempts ?? 0) + 1);
        throw new Error(`Invalid verification code. ${remaining} attempts remaining.`);
    }

    // Valid — clean up
    await OtpModel.deleteOne(query);
    return true;
}
