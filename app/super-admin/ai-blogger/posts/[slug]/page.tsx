import { FileText } from "lucide-react";

import { AIBloggerSuperAdminScopePage } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-scope-page";
import { getPostDetailRouteContent } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-route-content";
import { getAIBloggerSuperAdminContext } from "@/lib/ai-blogger-superadmin";

export default async function SuperAdminAIBloggerPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [{ slug }, { agency }] = await Promise.all([
        params,
        getAIBloggerSuperAdminContext(),
    ]);
    const content = getPostDetailRouteContent(slug, agency?.id);

    return (
        <AIBloggerSuperAdminScopePage
            icon={FileText}
            eyebrow="Super-admin Post Detail"
            title={content.title}
            description={content.description}
            statusLabel={content.statusLabel}
            contextNote={content.contextNote}
            actions={content.actions}
            cards={content.cards}
            backHref="/super-admin/ai-blogger/posts"
            backLabel="Back to Posts Scope"
        />
    );
}
