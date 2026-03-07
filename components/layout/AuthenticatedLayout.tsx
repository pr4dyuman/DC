
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getCurrentUser, getAgencySettings } from "@/lib/actions";
import { redirect } from "next/navigation";
import { DashboardChatProvider } from "@/components/providers/DashboardChatProvider";
import { getCurrentAgency, checkTrialExpired } from "@/lib/agency-context";

export async function AuthenticatedLayout({
    children
}: {
    children: React.ReactNode;
}) {
    // Parallelize independent DB calls — this was the main LCP bottleneck
    const [user, agencySettings, agency] = await Promise.all([
        getCurrentUser(),
        getAgencySettings(),
        getCurrentAgency(),
    ]);

    if (!user) {
        redirect("/login");
    }

    // Redirect Super Admin to their dedicated dashboard
    if (user.role === 'superadmin') {
        redirect("/super-admin");
    }

    // Check if agency trial has expired (sync comparison, no DB call)
    if (await checkTrialExpired(agency)) {
        redirect("/trial-expired");
    }

    const dashboardUser = user as any;

    const agencyName = agencySettings?.name || "Agency OS";
    const agencyLogo = agencySettings?.logo;

    return (
        <DashboardChatProvider currentUserId={dashboardUser.id}>
            <div className="h-full relative">
                <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]" style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
                    <Sidebar
                        currentUserId={dashboardUser.id}
                        currentUserUsername={dashboardUser.username}
                        currentUserRole={dashboardUser.role}
                        agencyName={agencyName}
                        agencyLogo={agencyLogo}
                    />
                </div>
                <main className="md:pl-72 min-h-screen pb-10" style={{ backgroundColor: 'var(--content-bg)', color: 'var(--foreground)' }}>
                    <Topbar
                        currentUser={dashboardUser}
                        agencyName={agencyName}
                        agencyLogo={agencyLogo}
                    />
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </DashboardChatProvider>
    );
}
