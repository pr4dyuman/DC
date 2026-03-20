import { Suspense } from "react";
import { getCurrentUser, getAgencySettings } from "@/lib/actions";
import { getCurrentAgency } from "@/lib/agency-context";
import { hasExplicitAIAccessSetting } from "@/lib/actions/access";
import { redirect } from "next/navigation";
import { SingularityChat } from "@/components/singularity/SingularityChat";
import { SingularitySkeleton } from "@/components/singularity/SingularitySkeleton";

async function SingularityData() {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login");

    if (currentUser.role === "superadmin") {
        redirect("/super-admin");
    }

    const agency = await getCurrentAgency();
    if (agency?.id) {
        const hasAIAccess = await hasExplicitAIAccessSetting(currentUser, agency.id);
        if (hasAIAccess === false) {
            redirect("/dashboard");
        }
    }

    const agencySettings = await getAgencySettings();

    const agencyName = agencySettings?.name || "Agency OS";

    return (
        <SingularityChat userId={currentUser.id} agencyName={agencyName} role={currentUser.role} />
    );
}

export default function SingularityPage() {
    return (
        <Suspense fallback={<SingularitySkeleton />}>
            <SingularityData />
        </Suspense>
    );
}
