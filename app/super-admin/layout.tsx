import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SuperAdminShell from "@/components/super-admin/SuperAdminShell";

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.role !== 'superadmin') {
        redirect('/dashboard');
    }

    return (
        <SuperAdminShell>
            {children}
        </SuperAdminShell>
    );
}
