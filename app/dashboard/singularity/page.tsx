import { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import { SingularityChat } from "@/components/singularity/SingularityChat";
import { SingularitySkeleton } from "@/components/singularity/SingularitySkeleton";

async function SingularityData() {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login");

    if (currentUser.role === "superadmin") {
        redirect("/super-admin");
    }

    return (
        <SingularityChat userId={currentUser.id} />
    );
}

export default function SingularityPage() {
    return (
        <Suspense fallback={<SingularitySkeleton />}>
            <SingularityData />
        </Suspense>
    );
}
