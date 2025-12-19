import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getUsers, getUser } from "@/lib/actions";
import { ChatProvider } from "@/context/ChatContext";
import { getSessionId } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userId = await getSessionId();
    if (!userId) {
        redirect("/login");
    }

    const currentUser = await getUser(userId);
    if (!currentUser) {
        // Fallback or cleanup if user deleted
        redirect("/login");
    }

    return (
        <ChatProvider>
            <div className="flex h-screen bg-background text-foreground overflow-hidden">
                <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
                    <Sidebar currentUserId={currentUser?.id} currentUserRole={currentUser?.role} />
                </div>

                <main className="flex-1 flex flex-col md:pl-64 h-full overflow-hidden">
                    <Topbar currentUser={currentUser} />
                    <div className="flex-1 overflow-y-auto p-3 md:p-8 scroll-smooth">
                        {children}
                    </div>
                </main>
            </div>
        </ChatProvider>
    );
}
