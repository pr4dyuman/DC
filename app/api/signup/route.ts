import { NextResponse } from 'next/server';
import { connectDB, AgencyModel, UserModel, SettingsModel, SuperAdminModel, ClientModel } from '@/lib/mongodb';
import { AGENCY_PLANS } from '@/lib/types';
import { generateId } from '@/lib/utils-server';
import { validateEmail, validatePassword, sanitizeName, sanitizePhone } from '@/lib/validation';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth-utils';
import { verifyOtp } from './send-otp/route';

// ── Rate limiting for signup: max 5 accounts per IP per hour ──
const signupRateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_SIGNUPS = 5;
const SIGNUP_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
    try {
        // ── Rate limit by IP ──
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';
        const now = Date.now();
        const ipRecord = signupRateLimit.get(ip);
        if (ipRecord && now < ipRecord.resetAt) {
            if (ipRecord.count >= MAX_SIGNUPS) {
                return NextResponse.json(
                    { error: 'Too many signup attempts. Please try again later.' },
                    { status: 429 }
                );
            }
            ipRecord.count++;
        } else {
            signupRateLimit.set(ip, { count: 1, resetAt: now + SIGNUP_WINDOW });
        }

        const body = await request.json();
        const { agencyName, ownerName, email, password, phone, otp, logo } = body;

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
            validatePassword(password);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // Sanitize phone
        const sanitizedPhone = phone ? sanitizePhone(phone) : '';

        // Validate logo (if provided, must be a data URI or empty)
        let sanitizedLogo = '';
        if (logo && typeof logo === 'string') {
            // Max 2MB base64 (~2.7M chars)
            if (logo.length > 3_000_000) {
                return NextResponse.json({ error: 'Logo file is too large. Max 2MB.' }, { status: 400 });
            }
            if (logo.startsWith('data:image/')) {
                sanitizedLogo = logo;
            }
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
                currency: 'INR',
                dateFormat: 'DD/MM/YYYY',
                allowClientRegistration: false,
                requireEmailVerification: true,
                enableTwoFactor: false,
                emailNotificationsEnabled: true
            },
            createdAt: nowDate.toISOString(),
            updatedAt: nowDate.toISOString(),
            createdBy: userId
        });

        // --- Create Admin User ---
        const hashedPassword = await bcrypt.hash(password, 12); // Increased from 10 to 12 rounds
        await UserModel.create({
            id: userId,
            agencyId,
            name: sanitizedOwnerName,
            email: validatedEmail,
            password: hashedPassword,
            role: 'admin',
            username: validatedEmail.split('@')[0],
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
        const cookieStore = await cookies();

        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24
        });
        cookieStore.set('userId', userId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        cookieStore.set('userRole', 'admin', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
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
