import { NextResponse } from 'next/server';
import { connectDB, AgencyModel, UserModel, SettingsModel, SuperAdminModel, ClientModel, RateLimitModel } from '@/lib/mongodb';
import { AGENCY_PLANS } from '@/lib/types';
import { generateId } from '@/lib/utils-server';
import { validateEmail, validatePassword, validateStrongPassword, sanitizeName, sanitizePhone, validateCsrfOrigin } from '@/lib/validation';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken, verifyToken } from '@/lib/auth-utils';
import { verifyOtp } from './send-otp/route';
import { getPublicSecuritySettings } from '@/lib/actions/super-admin';

// Safe image MIME types — SVG is intentionally excluded (can contain embedded scripts)
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

// ── Rate limiting for signup: max 5 accounts per IP per hour ──
const MAX_SIGNUPS = 5;
const SIGNUP_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
    try {
        const csrf = validateCsrfOrigin(request);
        if (!csrf.valid) return csrf.response;

        // ── Block signup if user is already authenticated ──
        const cookieStore = await cookies();
        const existingToken = cookieStore.get('auth_token')?.value;
        if (existingToken) {
            const existingSession = await verifyToken(existingToken);
            if (existingSession) {
                return NextResponse.json(
                    { error: 'You are already logged in. Please log out first to register a new agency.' },
                    { status: 403 }
                );
            }
        }

        // ── Rate limit by IP (MongoDB-backed) ──
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';
        await connectDB();
        const now = new Date();
        const rateKey = `signup:ip:${ip}`;
        const ipRecord = await RateLimitModel.findOne({ key: rateKey, expiresAt: { $gt: now } }).lean();
        if (ipRecord) {
            if ((ipRecord as any).count >= MAX_SIGNUPS) {
                return NextResponse.json(
                    { error: 'Too many signup attempts. Please try again later.' },
                    { status: 429 }
                );
            }
            await RateLimitModel.updateOne({ key: rateKey }, { $inc: { count: 1 } });
        } else {
            await RateLimitModel.findOneAndUpdate(
                { key: rateKey },
                { count: 1, expiresAt: new Date(now.getTime() + SIGNUP_WINDOW) },
                { upsert: true }
            );
        }

        const body = await request.json();
        const { agencyName, ownerName, email, password, phone, otp, logo } = body;

        // --- Check if self-registration is allowed ---
        const securitySettings = await getPublicSecuritySettings();
        if (!securitySettings.allowSelfRegistration) {
            return NextResponse.json(
                { error: 'Agency registration is currently disabled. Please contact the platform administrator.' },
                { status: 403 }
            );
        }

        // --- Validate required inputs ---
        if (!agencyName || !ownerName || !email || !password) {
            return NextResponse.json(
                { error: 'Agency name, owner name, email, and password are required' },
                { status: 400 }
            );
        }

        if (!otp) {
            return NextResponse.json(
                { error: 'Email verification code is required' },
                { status: 400 }
            );
        }

        // --- Sanitize & validate ---
        const sanitizedAgencyName = sanitizeName(agencyName, 200);
        if (!sanitizedAgencyName) {
            return NextResponse.json({ error: 'Invalid agency name' }, { status: 400 });
        }

        const sanitizedOwnerName = sanitizeName(ownerName, 200);
        if (!sanitizedOwnerName) {
            return NextResponse.json({ error: 'Invalid owner name' }, { status: 400 });
        }

        let validatedEmail: string;
        try {
            validatedEmail = validateEmail(email);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        try {
            if (securitySettings.enforceStrongPasswords) {
                validateStrongPassword(password);
            } else {
                validatePassword(password);
            }
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // Sanitize phone
        const sanitizedPhone = phone ? sanitizePhone(phone) : '';

        // Validate logo (if provided, must be a data URI with safe image MIME type)
        let sanitizedLogo = '';
        if (logo && typeof logo === 'string') {
            // Max 2MB base64 (~2.7M chars)
            if (logo.length > 3_000_000) {
                return NextResponse.json({ error: 'Logo file is too large. Max 2MB.' }, { status: 400 });
            }
            // Extract MIME type from data URI and validate against allowlist
            const mimeMatch = logo.match(/^data:(image\/[a-zA-Z+]+);base64,/);
            if (mimeMatch) {
                const mimeType = mimeMatch[1].toLowerCase();
                if (!ALLOWED_LOGO_MIME_TYPES.includes(mimeType)) {
                    return NextResponse.json(
                        { error: 'Unsupported logo format. Please use PNG, JPG, GIF, or WebP.' },
                        { status: 400 }
                    );
                }
                sanitizedLogo = logo;
            } else if (logo.startsWith('data:')) {
                // data: URI but not a valid base64 image — reject
                return NextResponse.json(
                    { error: 'Invalid logo format. Please upload a valid image file.' },
                    { status: 400 }
                );
            }
            // If it doesn't match any data: pattern, sanitizedLogo stays empty (ignored)
        }

        // --- Verify OTP ---
        try {
            await verifyOtp(validatedEmail, otp.toString().trim());
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // --- Connect to DB ---
        await connectDB();

        // --- Check if email already exists (ALL collections) ---
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

        // --- Generate IDs ---
        const agencyId = generateId();
        const userId = generateId();

        // --- Trial dates ---
        const nowDate = new Date();
        const trialEnd = new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // --- Use Pro plan defaults for trial ---
        const planDefaults = AGENCY_PLANS['pro'];

        // --- Create slug ---
        const slug = sanitizedAgencyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const existingAgency = await AgencyModel.findOne({ slug });
        const finalSlug = existingAgency ? `${slug}-${agencyId.slice(0, 6)}` : slug;

        // --- Create Agency ---
        // Get default AI config for trial agencies (if configured by super-admin)
        const { getDefaultAiConfigForSignup } = await import('@/lib/actions/super-admin');
        const defaultAiConfig = await getDefaultAiConfigForSignup();

        await AgencyModel.create({
            id: agencyId,
            name: sanitizedAgencyName,
            slug: finalSlug,
            plan: 'pro',
            status: 'trial',
            trialEndsAt: trialEnd.toISOString(),
            limits: planDefaults.limits,
            usage: {
                users: 1,
                projects: 0,
                clients: 0,
                storage: 0,
                monthlyInvoices: 0
            },
            features: planDefaults.features,
            billing: {
                billingEmail: validatedEmail,
                subscriptionStatus: 'trialing'
            },
            settings: {
                systemName: sanitizedAgencyName,
                timezone: 'Asia/Kolkata',
                currency: 'USD',
                dateFormat: 'DD/MM/YYYY',
                allowClientRegistration: false,
                requireEmailVerification: true,
                enableTwoFactor: false,
                emailNotificationsEnabled: true
            },
            // Apply default AI config if configured by super-admin
            ...(defaultAiConfig ? { aiConfig: defaultAiConfig } : {}),
            createdAt: nowDate.toISOString(),
            updatedAt: nowDate.toISOString(),
            createdBy: userId
        });

        // --- Create Admin User ---
        const hashedPassword = await bcrypt.hash(password, 12); // Increased from 10 to 12 rounds

        // Generate unique username from email prefix
        let baseUsername = validatedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        let username = baseUsername;
        let counter = 1;
        while (await UserModel.exists({ username, agencyId }) || await ClientModel.exists({ username, agencyId })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        await UserModel.create({
            id: userId,
            agencyId,
            name: sanitizedOwnerName,
            email: validatedEmail,
            password: hashedPassword,
            role: 'admin',
            username,
            contactNumber: sanitizedPhone,
            jobTitle: 'Agency Owner',
            salary: 0,
            createdAt: nowDate.toISOString()
        });

        // --- Create default Settings (with logo if provided) ---
        await SettingsModel.create({
            agencyId,
            systemName: sanitizedAgencyName,
            logo: sanitizedLogo
        });

        // --- Auto-login: set JWT cookie ---
        const token = await signToken({ userId, role: 'admin', agencyId });

        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24
        });
        // S1 fix: Removed legacy userId/userRole cookies — JWT is the single source of truth
        cookieStore.set('logged_in', '1', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24
        });

        return NextResponse.json({
            success: true,
            redirectTo: '/dashboard',
            agencyId,
            trialEndsAt: trialEnd.toISOString()
        });

    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: error.message || 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
