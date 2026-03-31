import { AIBloggerSuperAdminNav } from "@/app/super-admin/ai-blogger/_components/ai-blogger-super-admin-nav";
import { getAIBloggerSuperAdminContext } from "@/lib/ai-blogger-superadmin";

export default async function SuperAdminAIBloggerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { agency } = await getAIBloggerSuperAdminContext();

    return (
        <div className="space-y-6">
            <AIBloggerSuperAdminNav selectedAgencyId={agency?.id} />
            {children}
        </div>
    );
}
