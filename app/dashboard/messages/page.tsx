import { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions";
import { MessagesPageClient } from "./MessagesPageClient";
import { MessagesPageSkeleton } from "@/components/chat/MessagesPageSkeleton";

export const metadata = {
    title: "Messages",
    description: "Team messaging",
};

async function MessagesData() {
    const user = await getCurrentUser();
    return <MessagesPageClient currentUserId={user?.id || ""} />;
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<MessagesPageSkeleton />}>
            <MessagesData />
        </Suspense>
    );
}
