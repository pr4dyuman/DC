import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";
import SuperAdminTopbar from "@/components/super-admin/SuperAdminTopbar";

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
        <div className="flex h-screen text-foreground bg-background">
            <SuperAdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <SuperAdminTopbar />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
