import { WandSparkles } from "lucide-react";

import { AIBloggerSuperAdminScopePage } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-scope-page";
import { getGenerateRouteContent } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-route-content";
import { getAIBloggerSuperAdminContext } from "@/lib/ai-blogger-superadmin";

export default async function SuperAdminAIBloggerGeneratePage() {
    const { agency } = await getAIBloggerSuperAdminContext();
    const content = getGenerateRouteContent(agency?.id);

    return (
        <AIBloggerSuperAdminScopePage
            icon={WandSparkles}
            eyebrow="Super-admin Generate"
            title={content.title}
            description={content.description}
            statusLabel={content.statusLabel}
            contextNote={content.contextNote}
            actions={content.actions}
            cards={content.cards}
        />
    );
}
