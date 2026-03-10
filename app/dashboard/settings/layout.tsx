import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function SettingsLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    // Only admin and manager can access /dashboard/settings
    if (user.role !== 'admin' && user.role !== 'manager') {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
