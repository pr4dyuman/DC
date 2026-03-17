import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import ClientsPageClient from "./ClientsPageClient";

export default async function ClientsPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser) redirect('/login');
    if (currentUser.role === 'client') {
        redirect('/dashboard');
    }

    return <ClientsPageClient />;
}
