import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import EmployeeProfilePageClient from "./EmployeeProfilePageClient";

export default async function EmployeeProfilePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const [currentUser, resolvedParams] = await Promise.all([
        getCurrentUser(),
        params,
    ]);

    if (!currentUser) redirect('/login');

    const requestedUsername = decodeURIComponent(resolvedParams.username);
    if (currentUser.role === 'client') {
        const ownIdentifiers = new Set([currentUser.id, currentUser.username].filter(Boolean));
        if (!ownIdentifiers.has(requestedUsername)) {
            redirect('/dashboard');
        }
    }

    return <EmployeeProfilePageClient username={resolvedParams.username} />;
}
