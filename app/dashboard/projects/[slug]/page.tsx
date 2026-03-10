import { Suspense } from 'react';
import { getCurrentUser, getTasks, getUsers, getTransactions, getServices, getProjectBySlug, getProjectAssets, getClients, getUserPermissions } from "@/lib/actions";
import { redirect } from 'next/navigation';
import { ProjectView } from "@/components/projects/ProjectView";
import { ProjectDetailSkeleton } from "@/components/projects/ProjectDetailSkeleton";
import { User } from "@/lib/types";

async function ProjectData({ slug }: { slug: string }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    const project = await getProjectBySlug(slug);

    if (!project) {
        return <div>Project not found: {slug}</div>;
    }

    // Clients can only view projects they own
    if (currentUser.role === 'client' && project.clientId !== currentUser.id) {
        redirect('/dashboard/projects');
    }

    const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';

    const projectId = project.id;

    // Parallelize independent fetches — skip financial data for non-admin roles
    const [tasks, users, clients, transactions, assets, allCategories, permissions] = await Promise.all([
        getTasks(projectId),
        getUsers(),
        isAdminOrManager ? getClients() : Promise.resolve([]),
        isAdminOrManager ? getTransactions(projectId) : Promise.resolve([]),
        getProjectAssets(projectId),
        getServices(),
        getUserPermissions(currentUser.id),
    ]);

    // Merge clients into users list for lookup
    const clientUsers: User[] = clients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: 'client',
        username: c.username || c.id,
        avatar: c.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${c.companyName}`,
        jobTitle: c.companyName,
        agencyId: c.agencyId
    }));

    const allUsers = [...users, ...clientUsers];

    return (
        <ProjectView
            project={project}
            tasks={tasks}
            users={allUsers}
            transactions={transactions}
            assets={assets}
            categories={allCategories}
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
