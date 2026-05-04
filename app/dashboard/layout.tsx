
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LayoutSkeleton } from "@/components/layout/LayoutSkeleton";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

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
