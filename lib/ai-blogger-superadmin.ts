import "server-only";

import { cache } from "react";

import { requireRole } from "@/lib/actions/access";
import { getCurrentAgency } from "@/lib/agency-context";

export const getAIBloggerSuperAdminContext = cache(async () => {
    const currentUser = await requireRole("superadmin");
    const agency = await getCurrentAgency();

    return {
        currentUser,
        agency,
    };
});
