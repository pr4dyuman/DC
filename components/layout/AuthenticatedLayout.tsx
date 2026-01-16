
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import { DashboardChatProvider } from "@/components/providers/DashboardChatProvider";

export async function AuthenticatedLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    
    if (!user) {
        redirect("/login");
    }

    // Redirect Super Admin to their dedicated dashboard
    if (user.role === 'superadmin') {
        redirect("/super-admin");
    }

    const dashboardUser = user as any; // Cast for now to satisfy component props until stricter types

    return (
        <DashboardChatProvider currentUserId={dashboardUser.id}>
            <div className="h-full relative">
                <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                    <Sidebar 
                        currentUserId={dashboardUser.id} 
                        currentUserUsername={dashboardUser.username} 
                        currentUserRole={dashboardUser.role} 
                    />
                </div>
                <main className="md:pl-72 min-h-screen bg-[#111827] text-gray-100 pb-10">
                    <Topbar currentUser={dashboardUser} />
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </DashboardChatProvider>
    );
}
