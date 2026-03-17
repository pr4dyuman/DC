import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import ClientDetailPageClient from "./ClientDetailPageClient";

export default async function ClientDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [currentUser, resolvedParams] = await Promise.all([
        getCurrentUser(),
        params,
    ]);

    if (!currentUser) redirect('/login');

    const requestedClient = decodeURIComponent(resolvedParams.slug);
    if (currentUser.role === 'client') {
        const ownIdentifiers = new Set([currentUser.id, currentUser.username].filter(Boolean));
        if (!ownIdentifiers.has(requestedClient)) {
            redirect('/dashboard');
        }
    }

    return <ClientDetailPageClient slug={resolvedParams.slug} />;
}
