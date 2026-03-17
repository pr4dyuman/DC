import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import TeamPageClient from "./TeamPageClient";

export default async function TeamPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser) redirect('/login');
    if (currentUser.role === 'client') {
        redirect('/dashboard');
    }

    return <TeamPageClient />;
}
