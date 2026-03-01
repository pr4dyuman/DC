import { getCurrentUser } from "@/lib/actions";
import { MessagesPageClient } from "./MessagesPageClient";

export const metadata = {
    title: "Messages",
    description: "Team messaging",
};

export default async function MessagesPage() {
    const user = await getCurrentUser();
    return <MessagesPageClient currentUserId={user?.id || ""} />;
}
