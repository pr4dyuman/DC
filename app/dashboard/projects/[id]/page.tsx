import { getTasks, getUsers, getTransactions, getServices, getProject, getProjectAssets, getUser } from "@/lib/actions";
import { ProjectView } from "@/components/projects/ProjectView";
import { getSessionId } from "@/lib/auth";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const project = await getProject(id);
    const tasks = await getTasks(id);
    const users = await getUsers();
    // const transactions = await getTransactions(id); // Removed
    const assets = await getProjectAssets(id);
    const allCategories = await getServices();

    const userId = await getSessionId();
    const currentUser = userId ? await getUser(userId) : undefined;

    if (!project) return <div>Project not found</div>;

    return (
        <ProjectView
            project={project}
            tasks={tasks}
            users={users}
            // transactions={transactions} // Removed
            assets={assets}
            categories={allCategories}
            currentUser={currentUser}
        />
    );
}
