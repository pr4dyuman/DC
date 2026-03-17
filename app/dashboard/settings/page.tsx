import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import SettingsPageClient from "./SettingsPageClient";

export default async function SettingsPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser) redirect('/login');
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        redirect('/dashboard');
    }

    return <SettingsPageClient />;
}
