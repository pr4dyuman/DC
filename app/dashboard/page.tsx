
import { Suspense } from 'react';
import { getCurrentUser } from "@/lib/actions";
import { redirect } from 'next/navigation';
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";



async function getDashboardUserSafely() {
    try {
        const currentUser = await getCurrentUser();
        return { currentUser, hasDatabaseIssue: false };
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return { currentUser: null, hasDatabaseIssue: true };
    }
}

export default async function DashboardPage() {
    const { currentUser, hasDatabaseIssue } = await getDashboardUserSafely();

    if (hasDatabaseIssue) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <div className="max-w-lg text-center space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">Database connection issue</h2>
                    <p className="text-muted-foreground">
                        The dashboard could not reach MongoDB for this refresh. Please wait a moment and try again.
                    </p>
                </div>
            </div>
        );
    }

    if (!currentUser) redirect('/login');

    if (currentUser.role === 'superadmin') {
        redirect("/super-admin");
    }

    return (
        <Suspense fallback={<DashboardSkeleton />}>
             <DashboardContent currentUser={currentUser} />
        </Suspense>
    );
}
