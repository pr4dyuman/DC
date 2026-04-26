import { NextResponse } from 'next/server';
import { connectDB, UserModel, SuperAdminModel, ClientModel, SystemSettingsModel } from '@/lib/mongodb';
import { validateEmail, validatePassword, validateStrongPassword, validateCsrfOrigin } from '@/lib/validation';
import { verifyOtp } from '@/app/api/signup/send-otp/route';
import bcrypt from 'bcryptjs';

type SecuritySettingsRecord = {
    security?: {
        enforceStrongPasswords?: boolean;
    };
};

type ArchivedAccountRecord = {
    archived?: boolean;
};

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
    try {
        const csrf = validateCsrfOrigin(request);
        if (!csrf.valid) return csrf.response;

        const body = await request.json();
        const { email, otp, newPassword } = body;

        // --- Validate required inputs ---
        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { error: 'Email, verification code, and new password are required' },
                { status: 400 }
            );
        }

        // --- Validate email format ---
        let validatedEmail: string;
        try {
            validatedEmail = validateEmail(email);
        } catch (error: unknown) {
            return NextResponse.json({ error: getErrorMessage(error, 'Invalid email address') }, { status: 400 });
        }

        await connectDB();

        // --- Validate new password against system policy ---
        try {
            const sys = await SystemSettingsModel.findOne(
                { key: 'global' },
                { 'security.enforceStrongPasswords': 1 }
            ).lean() as SecuritySettingsRecord | null;
            const enforceStrong = sys?.security?.enforceStrongPasswords ?? true;
            if (enforceStrong) {
                validateStrongPassword(newPassword);
            } else {
                validatePassword(newPassword);
            }
        } catch (error: unknown) {
            return NextResponse.json({ error: getErrorMessage(error, 'Invalid password') }, { status: 400 });
        }

        // --- Verify OTP only after password passes validation ---
        try {
            await verifyOtp(validatedEmail, otp.toString().trim(), 'password-reset');
        } catch (error: unknown) {
            return NextResponse.json({ error: getErrorMessage(error, 'Invalid verification code') }, { status: 400 });
        }

        // --- Find exactly one account and update password ---
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const [superAdmins, users, clients] = await Promise.all([
            SuperAdminModel.find({ email: validatedEmail }).limit(2).lean(),
            UserModel.find({ email: validatedEmail }).limit(2).lean(),
            ClientModel.find({ email: validatedEmail }).limit(2).lean(),
        ]);
        const matchingAccountCount = superAdmins.length + users.length + clients.length;
        if (matchingAccountCount === 0) {
            return NextResponse.json(
                { error: 'No account found with this email address.' },
                { status: 404 }
            );
        }
        if (matchingAccountCount > 1) {
            return NextResponse.json(
                { error: 'Multiple accounts found for this email. Please contact support.' },
                { status: 409 }
            );
        }

        // Check SuperAdmin first
        const superAdmin = superAdmins[0];
        if (superAdmin) {
            await SuperAdminModel.updateOne(
                { email: validatedEmail },
                { $set: { password: hashedPassword } }
            );
            return NextResponse.json({
                success: true,
                message: 'Password reset successful. You can now log in with your new password.',
            });
        }

        // Check User
        const user = users[0];
        if (user) {
            if ((user as ArchivedAccountRecord).archived) {
                return NextResponse.json(
                    { error: 'This account has been deactivated. Please contact your agency.' },
                    { status: 403 }
                );
            }
            await UserModel.updateOne(
                { email: validatedEmail },
                { $set: { password: hashedPassword } }
            );
            return NextResponse.json({
                success: true,
                message: 'Password reset successful. You can now log in with your new password.',
            });
        }

        // Check Client
        const client = clients[0];
        if (client) {
            if ((client as ArchivedAccountRecord).archived) {
                return NextResponse.json(
                    { error: 'This account has been deactivated. Please contact your agency.' },
                    { status: 403 }
                );
            }
            await ClientModel.updateOne(
                { email: validatedEmail },
                { $set: { password: hashedPassword } }
            );
            return NextResponse.json({
                success: true,
                message: 'Password reset successful. You can now log in with your new password.',
            });
        }

        // Email not found (shouldn't reach here if OTP was valid, but just in case)
        return NextResponse.json(
            { error: 'No account found with this email address.' },
            { status: 404 }
        );

    } catch (error: unknown) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error, 'Something went wrong. Please try again.') },
            { status: 500 }
        );
    }
}
