import { getCurrentUser } from "@/lib/actions";
import { redirect } from "next/navigation";
import { SingularityChat } from "@/components/singularity/SingularityChat";

export default async function SingularityPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login");

    if (currentUser.role === "superadmin") {
        redirect("/super-admin");
    }

    return (
        <SingularityChat userId={currentUser.id} />
    );
}
