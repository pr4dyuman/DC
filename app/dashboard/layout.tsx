
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LayoutSkeleton } from "@/components/layout/LayoutSkeleton";
import { Suspense } from "react";

export default function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<LayoutSkeleton />}>
            <AuthenticatedLayout>
                {children}
            </AuthenticatedLayout>
        </Suspense>
    );
}
