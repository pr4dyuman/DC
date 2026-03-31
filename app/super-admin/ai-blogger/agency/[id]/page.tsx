import AIBloggerAgencyConfigClient from "@/components/super-admin/AIBloggerAgencyConfigClient";

export default async function SuperAdminAIBloggerAgencyPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return <AIBloggerAgencyConfigClient agencyId={id} />;
}
