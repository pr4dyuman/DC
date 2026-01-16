
import { Suspense } from 'react';
import { getCurrentUser } from "@/lib/actions";
import { redirect } from 'next/navigation';
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";



export default async function DashboardPage() {
    const currentUser = await getCurrentUser();
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
