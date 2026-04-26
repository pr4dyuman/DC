
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getCurrentUser, getAgencySettings, getUserPermissions, updateUserTimezone } from "@/lib/actions";
import { redirect } from "next/navigation";
import { DashboardChatProvider } from "@/components/providers/DashboardChatProvider";
import { getCurrentAgency, checkTrialExpired, checkPlanExpired } from "@/lib/agency-context";
import { TimezoneProvider } from "@/context/TimezoneContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { DynamicFavicon } from "@/components/layout/DynamicFavicon";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";
import Link from "next/link";

type DashboardUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> & {
    id: string;
    role: string;
    timezone?: string;
    username?: string;
};

type AgencySettingsWithFavicon = Awaited<ReturnType<typeof getAgencySettings>> & {
    favicon?: string;
};

type AuthenticatedLayoutData =
    | {
        ok: true;
        dashboardUser: DashboardUser;
        agencySettings: AgencySettingsWithFavicon;
        agency: Awaited<ReturnType<typeof getCurrentAgency>>;
        currentUserCanUseAI: boolean;
    }
    | { ok: false };

async function loadAuthenticatedLayoutData(): Promise<AuthenticatedLayoutData> {
    try {
        const user = await getCurrentUser();

        if (!user) {
            redirect("/login");
        }

        // Redirect Super Admin to their dedicated dashboard
        if (user.role === 'superadmin') {
            redirect("/super-admin");
        }

        const [agencySettings, agency, permissions] = await Promise.all([
            getAgencySettings(),
            getCurrentAgency(),
            getUserPermissions(user.id),
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

        return {
            ok: true,
            dashboardUser,
            agencySettings: currentAgencySettings,
            agency,
            currentUserCanUseAI: permissions.canUseAI !== false,
        };
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return { ok: false };
    }
}

function DatabaseConnectionIssue() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: 'var(--content-bg)', color: 'var(--foreground)' }}>
            <div className="max-w-lg text-center space-y-4">
                <h1 className="text-2xl font-bold">Database connection issue</h1>
                <p className="text-muted-foreground">
                    The dashboard could not reach MongoDB right now. This usually clears once the Atlas DNS or network timeout settles.
                </p>
                <div className="flex items-center justify-center gap-2">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Try Dashboard Again
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export async function AuthenticatedLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const data = await loadAuthenticatedLayoutData();

    if (!data.ok) {
        return <DatabaseConnectionIssue />;
    }

    const { dashboardUser, agencySettings, agency, currentUserCanUseAI } = data;
    const agencyName = agencySettings?.name || "Agency OS";
    const agencyLogo = agencySettings?.logo;
    const agencyFavicon = agencySettings?.favicon;

    return (
        <TimezoneProvider userTimezone={dashboardUser.timezone} onDetected={updateUserTimezone}>
        <CurrencyProvider currency={agencySettings?.currency || "USD"}>
        <DashboardChatProvider currentUserId={dashboardUser.id}>
            {agencyFavicon && <DynamicFavicon faviconUrl={agencyFavicon} />}
            <div className="h-full relative">
                <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]" style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
                    <Sidebar
                        currentUserId={dashboardUser.id}
                        currentUserUsername={dashboardUser.username}
                        currentUserRole={dashboardUser.role}
                        currentUserCanUseAI={currentUserCanUseAI}
                        agencyName={agencyName}
                        agencyLogo={agencyLogo}
                        agencyPlan={agency?.plan}
                        agencyStatus={agency?.status}
                        agencyHasAIBlogger={agency?.features?.aiBlogger}
                    />
                </div>
                <main className="md:pl-72 min-h-screen pb-10" style={{ backgroundColor: 'var(--content-bg)', color: 'var(--foreground)' }}>
                    <Topbar
                        currentUser={dashboardUser}
                        currentUserCanUseAI={currentUserCanUseAI}
                        agencyName={agencyName}
                        agencyLogo={agencyLogo}
                        agencyPlan={agency?.plan}
                        agencyStatus={agency?.status}
                        agencyHasAIBlogger={agency?.features?.aiBlogger}
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
