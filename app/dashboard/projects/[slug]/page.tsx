import { getTasks, getUsers, getTransactions, getServices, getProjectBySlug, getProjectAssets, getUser, getClients, getUserPermissions } from "@/lib/actions";
import { ProjectView } from "@/components/projects/ProjectView";
import { getSessionId } from "@/lib/auth";
import { User } from "@/lib/types";

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    // Fetch by Slug instead of ID
    console.log("DEBUG: Page Slug Params:", slug);
    const project = await getProjectBySlug(slug);
    console.log("DEBUG: Project Found:", project?.name, project?.id);

    if (!project) {
        console.log("DEBUG: Project NOT found for slug:", slug);
        return <div>Project not found: {slug}</div>;
    }

    // We still need to fetch tasks/transactions using the PROJECT ID, not the slug.
    // The project object (fetched by slug) contains the ID.
    const projectId = project.id;

    const tasks = await getTasks(projectId);
    const users = await getUsers();
    const clients = await getClients();

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
    const transactions = await getTransactions(projectId);
    const assets = await getProjectAssets(projectId);
    const allCategories = await getServices();

    const userId = await getSessionId();
    const currentUser = userId ? await getUser(userId) : undefined;

    // Fetch Permissions
    const permissions = userId ? await getUserPermissions(userId) : undefined;

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
