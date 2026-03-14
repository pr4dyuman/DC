import { NextResponse } from 'next/server';
import { connectDB, UserModel, SuperAdminModel, ClientModel, SystemSettingsModel } from '@/lib/mongodb';
import { validateEmail, validatePassword, validateStrongPassword, validateCsrfOrigin } from '@/lib/validation';
import { verifyOtp } from '@/app/api/signup/send-otp/route';
import bcrypt from 'bcryptjs';

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
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // --- Verify OTP ---
        try {
            await verifyOtp(validatedEmail, otp.toString().trim(), 'password-reset');
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        await connectDB();

        // --- Validate new password against system policy ---
        try {
            const sys = await SystemSettingsModel.findOne(
                { key: 'global' },
                { 'security.enforceStrongPasswords': 1 }
            ).lean() as any;
            const enforceStrong = sys?.security?.enforceStrongPasswords ?? true;
            if (enforceStrong) {
                validateStrongPassword(newPassword);
            } else {
                validatePassword(newPassword);
            }
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // --- Find user and update password ---
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Check SuperAdmin first
        const superAdmin = await SuperAdminModel.findOne({ email: validatedEmail }).lean();
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
        const user = await UserModel.findOne({ email: validatedEmail }).lean();
        if (user) {
            if ((user as any).archived) {
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
        const client = await ClientModel.findOne({ email: validatedEmail }).lean();
        if (client) {
            if ((client as any).archived) {
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

    } catch (error: any) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: error.message || 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
