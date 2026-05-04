import { getSessionUser } from "@/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SuperAdminShell from "@/components/super-admin/SuperAdminShell";
import { TimezoneProvider } from "@/context/TimezoneContext";
import { updateUserTimezone } from "@/lib/actions";
import { connectDB, SuperAdminModel } from "@/lib/mongodb";
import type { SuperAdmin } from "@/lib/types";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role !== 'superadmin') {
        redirect('/dashboard');
    }

    await connectDB();
    const admin = await SuperAdminModel.findOne({ id: sessionUser.userId }).select('timezone').lean() as Pick<SuperAdmin, "timezone"> | null;
    const userTimezone = admin?.timezone;

    return (
        <TimezoneProvider userTimezone={userTimezone} onDetected={updateUserTimezone}>
            <SuperAdminShell>
                {children}
            </SuperAdminShell>
        </TimezoneProvider>
    );
}
