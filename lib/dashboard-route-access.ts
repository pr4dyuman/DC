export const DASHBOARD_ROUTE_ACCESS: Record<string, string[]> = {
    admin: ["*"],
    manager: [
        "/dashboard",
        "/dashboard/projects",
        "/dashboard/messages",
        "/dashboard/singularity",
        "/dashboard/team",
        "/dashboard/finance",
        "/dashboard/clients",
        "/dashboard/settings",
    ],
    employee: [
        "/dashboard",
        "/dashboard/projects",
        "/dashboard/messages",
        "/dashboard/singularity",
        "/dashboard/team",
    ],
    client: [
        "/dashboard",
        "/dashboard/projects",
        "/dashboard/messages",
        "/dashboard/singularity",
        "/dashboard/finance",
    ],
};

function normalizePathname(pathname: string) {
    if (pathname.length > 1 && pathname.endsWith("/")) {
        return pathname.slice(0, -1);
    }
    return pathname;
}

export function isDashboardRouteAllowed(role: string | null | undefined, pathname: string): boolean {
    if (!role) return false;

    const normalizedPathname = normalizePathname(pathname);
    if (role === "client" && normalizedPathname.startsWith("/dashboard/clients/")) {
        return true;
    }

    const allowedRoutes = DASHBOARD_ROUTE_ACCESS[role];
    if (!allowedRoutes) return false;
    if (allowedRoutes.includes("*")) return true;

    return allowedRoutes.some((route) => {
        if (route === "/dashboard") {
            return normalizedPathname === route;
        }
        return normalizedPathname === route || normalizedPathname.startsWith(`${route}/`);
    });
}

export function isDashboardNavRouteVisible(
    role: string | null | undefined,
    href: string,
    options: { canUseAI?: boolean } = {},
) {
    if (href === "/dashboard/singularity" && options.canUseAI === false) {
        return false;
    }
    return isDashboardRouteAllowed(role, href);
}
