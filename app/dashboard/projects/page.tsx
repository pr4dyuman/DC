
import { Suspense } from 'react';
import { getCurrentUser, getProjects, getServices, getAllProjectTasks, getUsers } from "@/lib/actions";
import { redirect } from 'next/navigation';
import { ProjectsContent } from "@/components/projects/ProjectsContent";
import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";

async function ProjectsData() {
    const currentUser = await getCurrentUser();

    if (!currentUser) redirect('/login');

    const [projects, services, tasks, users] = await Promise.all([
        getProjects(),
        getServices(),
        getAllProjectTasks(),
        getUsers(),
    ]);

    return (
        <ProjectsContent
            initialProjects={projects}
            initialServices={services}
            initialTasks={tasks}
            initialUsers={users}
            currentUser={currentUser}
        />
    );
}

export default function ProjectsPage() {
    return (
        <Suspense fallback={<ProjectsSkeleton />}>
            <ProjectsData />
        </Suspense>
    );
}
