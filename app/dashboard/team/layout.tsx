import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function TeamLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    // Admin, manager, and employee can access /dashboard/team
    // Clients are blocked
    if (user.role === 'client') {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
