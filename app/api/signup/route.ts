import { NextResponse } from 'next/server';
import { connectDB, AgencyModel, UserModel, SettingsModel } from '@/lib/mongodb';
import { AGENCY_PLANS } from '@/lib/types';
import { generateId } from '@/lib/utils-server';
import { validateEmail, validatePassword, sanitizeName } from '@/lib/validation';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth-utils';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { agencyName, ownerName, email, password, phone, industry, teamSize } = body;

        // --- Validate inputs ---
        if (!agencyName || !ownerName || !email || !password) {
            return NextResponse.json(
                { error: 'Agency name, owner name, email, and password are required' },
                { status: 400 }
            );
        }

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

        // --- Connect to DB ---
        await connectDB();

        // --- Check if email already exists ---
        const existingUser = await UserModel.findOne({ email: validatedEmail });
        if (existingUser) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        // --- Generate IDs ---
        const agencyId = generateId();
        const userId = generateId();

        // --- Trial dates ---
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // --- Use Pro plan defaults for trial ---
        const planDefaults = AGENCY_PLANS['pro'];

        // --- Create slug ---
        const slug = sanitizedAgencyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        // Check slug uniqueness
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
                requireEmailVerification: false,
                enableTwoFactor: false,
                emailNotificationsEnabled: true
            },
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            createdBy: userId // Self-created
        });

        // --- Create Admin User ---
        const hashedPassword = await bcrypt.hash(password, 10);
        await UserModel.create({
            id: userId,
            agencyId,
            name: sanitizedOwnerName,
            email: validatedEmail,
            password: hashedPassword,
            role: 'admin',
            username: validatedEmail.split('@')[0],
            contactNumber: phone || '',
            jobTitle: 'Agency Owner',
            salary: 0,
            createdAt: now.toISOString()
        });

        // --- Create default Settings ---
        await SettingsModel.create({
            agencyId,
            systemName: sanitizedAgencyName,
            logo: ''
        });

        // --- Auto-login: set JWT cookie ---
        const token = await signToken({ userId, role: 'admin', agencyId });
        const cookieStore = await cookies();

        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
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
