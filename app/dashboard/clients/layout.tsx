import { getCurrentUser } from "@/lib/actions";
import { isDashboardRouteAllowed } from "@/lib/dashboard-route-access";
import { redirect } from "next/navigation";

export default async function ClientsLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    if (!isDashboardRouteAllowed(user.role, "/dashboard/clients")) {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
