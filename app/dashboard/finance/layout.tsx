import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function FinanceLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    // Admin, manager, and client can view finance
    // Employees are blocked
    if (user.role === 'employee') {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
