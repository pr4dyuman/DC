import { Suspense } from 'react';
import { getTasks, getUsers, getTransactions, getServices, getProjectBySlug, getProjectAssets, getUser, getClients, getUserPermissions } from "@/lib/actions";
import { ProjectView } from "@/components/projects/ProjectView";
import { ProjectDetailSkeleton } from "@/components/projects/ProjectDetailSkeleton";
import { getSessionId } from "@/lib/auth";
import { User } from "@/lib/types";

async function ProjectData({ slug }: { slug: string }) {
    const project = await getProjectBySlug(slug);

    if (!project) {
        return <div>Project not found: {slug}</div>;
    }

    const projectId = project.id;

    // Parallelize independent fetches
    const [tasks, users, clients, transactions, assets, allCategories, userId] = await Promise.all([
        getTasks(projectId),
        getUsers(),
        getClients(),
        getTransactions(projectId),
        getProjectAssets(projectId),
        getServices(),
        getSessionId(),
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

    // These depend on userId
    const [currentUser, permissions] = await Promise.all([
        userId ? getUser(userId) : Promise.resolve(undefined),
        userId ? getUserPermissions(userId) : Promise.resolve(undefined),
    ]);

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
