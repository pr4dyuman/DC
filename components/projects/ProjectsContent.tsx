"use client";

import { useState, useMemo } from "react";
import { Plus, Search, LayoutGrid, List, Loader2 } from "lucide-react";
import { CreateProjectWizard } from "@/components/projects/CreateProjectWizard";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { toLocalCalendarDay } from "@/lib/date-utils";
import { Project, Task, UserPermissions, getDefaultUserPermissionsForRole } from "@/lib/types";
import { getTaskAssigneeIds } from "@/lib/task-assignees";
import type { CurrentUserResult } from "@/lib/actions";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { ProjectSummaryRow } from "./ProjectSummaryRow";
import {
    type ProjectAssignee,
    type ProjectServiceSummary,
    type ProjectSummary,
    type SortOption,
} from "./projects-content-shared";

interface ProjectsContentProps {
    initialProjects: Project[];
    initialServices: ProjectServiceSummary[];
    initialTasks: Task[];
    initialUsers: ProjectAssignee[];
    currentUser: Pick<CurrentUserResult, "id" | "name" | "role">;
    permissions?: UserPermissions;
}

export function ProjectsContent({
    initialProjects,
    initialServices,
    initialTasks,
    initialUsers,
    currentUser,
    permissions,
}: ProjectsContentProps) {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [services] = useState<ProjectServiceSummary[]>(initialServices);
    const [allTasks] = useState<Task[]>(initialTasks);
    const [allUsers] = useState<ProjectAssignee[]>(initialUsers);
    const [showWizard, setShowWizard] = useState(false);

    const [search, setSearch] = useState("");
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortBy, setSortBy] = useState<SortOption>("dueDate");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const effectivePermissions = permissions ?? getDefaultUserPermissionsForRole(currentUser?.role);
    const canCreateProject = effectivePermissions.canCreateProject;
    const today = useMemo(() => toLocalCalendarDay(new Date()) ?? new Date(), []);

    const projectData = useMemo(() => {
        return projects.map((project) => {
            const projectTasks = allTasks.filter((task) => task.projectId === project.id);
            const done = projectTasks.filter((task) => task.status === "Done").length;
            const inProgress = projectTasks.filter((task) => task.status === "In Progress").length;
            const todo = projectTasks.filter((task) => task.status === "Todo").length;
            const total = projectTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const due = toLocalCalendarDay(project.dueDate);
            const isOverdue = !!due && due < today && project.status !== "Completed";
            const assigneeIds = [...new Set(projectTasks.flatMap((task) => getTaskAssigneeIds(task)))];
            const totalAssignees = assigneeIds.length;
            const assignees = assigneeIds
                .slice(0, 3)
                .map((id) => allUsers.find((user) => user.id === id))
                .filter((user): user is ProjectAssignee => Boolean(user));

            return {
                ...project,
                pct,
                done,
                inProgress,
                todo,
                total,
                isOverdue,
                assignees,
                totalAssignees,
            } satisfies ProjectSummary;
        });
    }, [projects, allTasks, allUsers, today]);

    const filtered = useMemo(() => {
        let list = projectData;

        if (statusFilter !== "All") {
            list = list.filter((project) => project.status === statusFilter);
        }

        if (search.trim()) {
            list = list.filter((project) =>
                project.name.toLowerCase().includes(search.toLowerCase()) ||
                (project.client || "").toLowerCase().includes(search.toLowerCase())
            );
        }

        return [...list].sort((first, second) => {
            if (sortBy === "name") return first.name.localeCompare(second.name);
            if (sortBy === "budget") return (second.budget || 0) - (first.budget || 0);
            if (sortBy === "progress") return second.pct - first.pct;
            const firstDue = toLocalCalendarDay(first.dueDate)?.getTime() ?? Infinity;
            const secondDue = toLocalCalendarDay(second.dueDate)?.getTime() ?? Infinity;
            return firstDue - secondDue;
        });
    }, [projectData, statusFilter, search, sortBy]);

    const statuses = ["All", ...Array.from(new Set(projects.map((project) => project.status)))];
    const {
        visibleCount,
        sentinelRef,
        hasMore,
    } = useProgressiveList(filtered.length, 12, [statusFilter, search, sortBy]);

    const handleProjectCreated = async () => {
        const { getProjects } = await import("@/lib/actions");
        const freshProjects = await getProjects() as Project[];
        setProjects(freshProjects);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {filtered.length} of {projects.length} project{projects.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex items-center transition-all duration-200 border border-input rounded-md bg-background overflow-hidden ${searchExpanded ? "w-52" : "w-9"} h-9`}>
                        <button aria-label="Search projects" className="p-2 shrink-0" onClick={() => setSearchExpanded((previous) => !previous)}>
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {searchExpanded && (
                            <input
                                autoFocus
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search..."
                                className="flex-1 bg-transparent text-sm outline-none pr-2"
                            />
                        )}
                    </div>

                    <select
                        aria-label="Sort projects"
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value as SortOption)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground cursor-pointer"
                    >
                        <option value="dueDate">Sort: Due Date</option>
                        <option value="progress">Sort: Progress</option>
                        <option value="budget">Sort: Budget</option>
                        <option value="name">Sort: Name</option>
                    </select>

                    <div className="flex items-center border border-input rounded-md overflow-hidden h-9">
                        <button aria-label="Grid view" onClick={() => setViewMode("grid")} className={`px-2.5 h-full flex items-center transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button aria-label="List view" onClick={() => setViewMode("list")} className={`px-2.5 h-full flex items-center transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    {canCreateProject && (
                        <button
                            onClick={() => setShowWizard(true)}
                            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> New Project
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${statusFilter === status
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-background hover:bg-muted text-muted-foreground"
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            <CreateProjectWizard
                open={showWizard}
                onOpenChange={setShowWizard}
                onProjectCreated={handleProjectCreated}
                currentUser={currentUser}
            />

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg font-medium">No projects found</p>
                    <p className="text-sm mt-1">Try a different filter or search term</p>
                </div>
            ) : viewMode === "grid" ? (
                <>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.slice(0, visibleCount).map((project) => (
                            <ProjectSummaryCard
                                key={project.id}
                                project={project}
                                services={services}
                            />
                        ))}
                    </div>
                    {hasMore && (
                        <div ref={sentinelRef} className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="flex flex-col gap-2">
                        <div className="hidden sm:grid grid-cols-[1fr_140px_80px_100px_80px] gap-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <span>Project</span>
                            <span>Progress</span>
                            <span>Team</span>
                            <span>Status</span>
                            <span className="text-right">Due</span>
                        </div>
                        {filtered.slice(0, visibleCount).map((project) => (
                            <ProjectSummaryRow key={project.id} project={project} />
                        ))}
                    </div>
                    {hasMore && (
                        <div ref={sentinelRef} className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
