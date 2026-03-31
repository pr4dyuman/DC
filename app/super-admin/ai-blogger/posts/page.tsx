import { FileText } from "lucide-react";

import { AIBloggerSuperAdminScopePage } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-scope-page";
import { getPostsRouteContent } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-route-content";
import { getAIBloggerSuperAdminContext } from "@/lib/ai-blogger-superadmin";

export default async function SuperAdminAIBloggerPostsPage() {
    const { agency } = await getAIBloggerSuperAdminContext();
    const content = getPostsRouteContent(agency?.id);

    return (
        <AIBloggerSuperAdminScopePage
            icon={FileText}
            eyebrow="Super-admin Posts"
            title={content.title}
            description={content.description}
            statusLabel={content.statusLabel}
            contextNote={content.contextNote}
            actions={content.actions}
            cards={content.cards}
        />
    );
}
