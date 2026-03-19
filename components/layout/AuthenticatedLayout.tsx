
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getCurrentUser, getAgencySettings, updateUserTimezone } from "@/lib/actions";
import { redirect } from "next/navigation";
import { DashboardChatProvider } from "@/components/providers/DashboardChatProvider";
import { getCurrentAgency, checkTrialExpired, checkPlanExpired } from "@/lib/agency-context";
import { TimezoneProvider } from "@/context/TimezoneContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { DynamicFavicon } from "@/components/layout/DynamicFavicon";

type DashboardUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & {
    id: string;
    role: string;
    timezone?: string;
    username?: string;
};

type AgencySettingsWithFavicon = Awaited<ReturnType<typeof getAgencySettings>> & {
    favicon?: string;
};

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

    const [agencySettings, agency] = await Promise.all([
        getAgencySettings(),
        getCurrentAgency(),
    ]);

    // Check if agency trial has expired (sync comparison, no DB call)
    if (await checkTrialExpired(agency)) {
        redirect("/trial-expired");
    }

    // Check if paid plan has expired
    if (await checkPlanExpired(agency)) {
        redirect("/plan-expired");
    }

    const dashboardUser = user as DashboardUser;
    const currentAgencySettings = agencySettings as AgencySettingsWithFavicon;

    const agencyName = currentAgencySettings?.name || "Agency OS";
    const agencyLogo = currentAgencySettings?.logo;
    const agencyFavicon = currentAgencySettings?.favicon;

    return (
        <TimezoneProvider userTimezone={dashboardUser.timezone} onDetected={updateUserTimezone}>
        <CurrencyProvider currency={currentAgencySettings?.currency || "USD"}>
        <DashboardChatProvider currentUserId={dashboardUser.id}>
            {agencyFavicon && <DynamicFavicon faviconUrl={agencyFavicon} />}
            <div className="h-full relative">
                <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]" style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
                    <Sidebar
                        currentUserId={dashboardUser.id}
                        currentUserUsername={dashboardUser.username}
                        currentUserRole={dashboardUser.role}
                        agencyName={agencyName}
                        agencyLogo={agencyLogo}
                        agencyPlan={agency?.plan}
                    />
                </div>
                <main className="md:pl-72 min-h-screen pb-10" style={{ backgroundColor: 'var(--content-bg)', color: 'var(--foreground)' }}>
                    <Topbar
                        currentUser={dashboardUser}
                        agencyName={agencyName}
                        agencyLogo={agencyLogo}
                        agencyPlan={agency?.plan}
                    />
                    <div className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </DashboardChatProvider>
        </CurrencyProvider>
        </TimezoneProvider>
    );
}
