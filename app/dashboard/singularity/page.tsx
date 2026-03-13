import { Suspense } from "react";
import { getCurrentUser, getAgencySettings } from "@/lib/actions";
import { redirect } from "next/navigation";
import { SingularityChat } from "@/components/singularity/SingularityChat";
import { SingularitySkeleton } from "@/components/singularity/SingularitySkeleton";

async function SingularityData() {
    const [currentUser, agencySettings] = await Promise.all([
        getCurrentUser(),
        getAgencySettings(),
    ]);
    if (!currentUser) redirect("/login");

    if (currentUser.role === "superadmin") {
        redirect("/super-admin");
    }

    const agencyName = agencySettings?.name || "Agency OS";

    return (
        <SingularityChat userId={currentUser.id} agencyName={agencyName} />
    );
}

export default function SingularityPage() {
    return (
        <Suspense fallback={<SingularitySkeleton />}>
            <SingularityData />
        </Suspense>
    );
}
