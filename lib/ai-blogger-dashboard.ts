import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/actions";
import { getCurrentAgency } from "@/lib/agency-context";
import { getAIBloggerAccessState } from "@/lib/ai-blogger-access";

export const getAIBloggerDashboardContext = cache(async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect("/login");
    }

    if (currentUser.role === "superadmin") {
        redirect("/super-admin");
    }

    if (currentUser.role === "client") {
        redirect("/dashboard");
    }

    const agency = await getCurrentAgency();

    if (!agency) {
        redirect("/dashboard");
    }

    const access = getAIBloggerAccessState({
        role: currentUser.role,
        plan: agency.plan,
        status: agency.status,
        featureEnabled: agency.features?.aiBlogger,
    });

    return {
        currentUser,
        agency,
        access,
    };
});
