import { Suspense } from 'react';
import { getCurrentUser, getTasks, getTransactions, getProjectBySlug, getProjectAssets, getUserPermissions, getProjectDirectoryUsers, getProjectServices } from "@/lib/actions";
import { redirect } from 'next/navigation';
import { ProjectView } from "@/components/projects/ProjectView";
import { ProjectDetailSkeleton } from "@/components/projects/ProjectDetailSkeleton";

async function ProjectData({ slug }: { slug: string }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const project = await getProjectBySlug(slug);

    if (!project) {
        return <div>Project not found: {slug}</div>;
    }

    // Clients can only view projects they are linked to (single or multi-client)
    if (currentUser.role === 'client') {
        const linkedIds: string[] = [
            ...(project.clientId ? [project.clientId] : []),
            ...(project.clientIds || []),
        ];
        if (!linkedIds.includes(currentUser.id)) {
            redirect('/dashboard/projects');
        }
    }

    const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';

    const projectId = project.id;

    // Parallelize independent fetches — skip financial data for non-admin roles
    const [tasks, users, transactions, assets, projectServices, permissions] = await Promise.all([
        getTasks(projectId),
        getProjectDirectoryUsers(projectId),
        isAdminOrManager ? getTransactions(projectId) : Promise.resolve([]),
        getProjectAssets(projectId),
        getProjectServices(projectId),
        getUserPermissions(currentUser.id),
    ]);

    return (
        <ProjectView
            project={project}
            tasks={tasks}
            users={users}
            transactions={transactions}
            assets={assets}
            categories={projectServices}
            currentUser={currentUser}
            permissions={permissions}
        />
    );
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return (
        <Suspense fallback={<ProjectDetailSkeleton />}>
            <ProjectData slug={slug} />
        </Suspense>
    );
}
