import { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import { MessagesPageClient } from "./MessagesPageClient";
import { MessagesPageSkeleton } from "@/components/chat/MessagesPageSkeleton";

export const metadata = {
    title: "Messages",
    description: "Team messaging",
};

async function MessagesData() {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    return <MessagesPageClient currentUserId={user.id} />;
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<MessagesPageSkeleton />}>
            <MessagesData />
        </Suspense>
    );
}
