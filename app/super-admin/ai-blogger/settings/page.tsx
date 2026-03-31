import { Settings2 } from "lucide-react";

import { AIBloggerSuperAdminScopePage } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-scope-page";
import { getSettingsRouteContent } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-route-content";
import { getAIBloggerSuperAdminContext } from "@/lib/ai-blogger-superadmin";

export default async function SuperAdminAIBloggerSettingsPage() {
    const { agency } = await getAIBloggerSuperAdminContext();
    const content = getSettingsRouteContent(agency?.id);

    return (
        <AIBloggerSuperAdminScopePage
            icon={Settings2}
            eyebrow="Super-admin Settings"
            title={content.title}
            description={content.description}
            statusLabel={content.statusLabel}
            contextNote={content.contextNote}
            actions={content.actions}
            cards={content.cards}
        />
    );
}
