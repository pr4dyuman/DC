import { NextResponse } from 'next/server';
import { connectDB, UserModel, SuperAdminModel, ClientModel, OtpModel, RateLimitModel } from '@/lib/mongodb';
import { validateEmail, validateCsrfOrigin } from '@/lib/validation';
import { sendPasswordResetOtpEmail } from '@/lib/brevo';
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
        const emailRateKey = `pwd-reset-otp:email:${validatedEmail}`;
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
        const ipRateKey = `pwd-reset-otp:ip:${ip}`;
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

        // ── Check if email exists in any collection ──
        const [existingUser, existingSuperAdmin, existingClient] = await Promise.all([
            UserModel.findOne({ email: validatedEmail }).lean(),
            SuperAdminModel.findOne({ email: validatedEmail }).lean(),
            ClientModel.findOne({ email: validatedEmail }).lean(),
        ]);

        if (!existingUser && !existingSuperAdmin && !existingClient) {
            // Return same success-like response to prevent email enumeration
            return NextResponse.json({
                success: true,
                message: 'If an account with this email exists, you will receive a reset code shortly.',
            });
        }

        // Check if account is archived/deactivated
        if ((existingUser && (existingUser as any).archived) || (existingClient && (existingClient as any).archived)) {
            return NextResponse.json({
                success: true,
                message: 'If an account with this email exists, you will receive a reset code shortly.',
            });
        }

        // ── Generate OTP and store in MongoDB with TTL ──
        const otp = generateOtp();
        await OtpModel.findOneAndUpdate(
            { email: validatedEmail, purpose: 'password-reset' },
            { otp, attempts: 0, expiresAt: new Date(now.getTime() + 5 * 60 * 1000), purpose: 'password-reset' },
            { upsert: true }
        );

        // ── Send OTP via Brevo ──
        const result = await sendPasswordResetOtpEmail(validatedEmail, otp);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Failed to send verification email. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'If an account with this email exists, you will receive a reset code shortly.',
        });

    } catch (error: any) {
        console.error('Forgot password send OTP error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
