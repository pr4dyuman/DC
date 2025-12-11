import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getUsers } from "@/lib/actions";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const users = await getUsers();
    const currentUser = users[0];

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
                <Sidebar />
            </div>

            <main className="flex-1 flex flex-col md:pl-64 h-full overflow-hidden">
                <Topbar currentUser={currentUser} />
                <div className="flex-1 overflow-y-auto p-3 md:p-8 scroll-smooth">
                    {children}
                </div>
            </main>
        </div>
    );
}
