"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Search, AlertCircle, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarDays } from "date-fns";
import { CreateProjectWizard } from "@/components/projects/CreateProjectWizard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    Completed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "On Hold": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    Cancelled: "bg-red-500/15 text-red-500",
};

function DaysLabel({ dueDate, status }: { dueDate?: string; status: string }) {
    if (!dueDate || status === 'Completed') return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
    const diff = differenceInCalendarDays(due, today);

    if (diff < 0) return (
        <span className="text-[10px] font-semibold text-red-500 whitespace-nowrap">
            {Math.abs(diff)}d overdue
        </span>
    );
    if (diff === 0) return <span className="text-[10px] font-semibold text-amber-500 whitespace-nowrap">Due today</span>;
    if (diff <= 3) return <span className="text-[10px] font-semibold text-amber-500 whitespace-nowrap">{diff}d left</span>;
    return <span className="text-[10px] text-muted-foreground whitespace-nowrap">{diff}d left</span>;
}

function TaskStatusPills({ todo, inProgress, done }: { todo: number; inProgress: number; done: number }) {
    if (todo + inProgress + done === 0) return <span className="text-[10px] text-muted-foreground">No tasks yet</span>;
    return (
        <div className="flex items-center gap-2 text-[10px] font-medium">
            {todo > 0 && <span className="text-muted-foreground">{todo} Todo</span>}
            {inProgress > 0 && <span className="text-indigo-400">{inProgress} In Progress</span>}
            {done > 0 && <span className="text-emerald-500">{done} Done</span>}
        </div>
    );
}

interface ProjectsContentProps {
    initialProjects: any[];
    initialServices: any[];
    initialTasks: any[];
    initialUsers: any[];
    currentUser: any;
}

export function ProjectsContent({
    initialProjects,
    initialServices,
    initialTasks,
    initialUsers,
    currentUser,
}: ProjectsContentProps) {
    const [projects, setProjects] = useState(initialProjects);
    const [services] = useState(initialServices);
    const [allTasks] = useState(initialTasks);
    const [allUsers] = useState(initialUsers);
    const [showWizard, setShowWizard] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortBy, setSortBy] = useState<"dueDate" | "budget" | "name" | "progress">("dueDate");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

    // Per-project computed data
    const projectData = useMemo(() => {
        return projects.map(p => {
            const pTasks = allTasks.filter((t: any) => t.projectId === p.id);
            const done = pTasks.filter((t: any) => t.status === 'Done').length;
            const inProgress = pTasks.filter((t: any) => t.status === 'In Progress').length;
            const todo = pTasks.filter((t: any) => t.status === 'Todo').length;
            const total = pTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isOverdue = p.dueDate && new Date(p.dueDate) < today && p.status !== 'Completed';
            const assigneeIds = [...new Set(pTasks.map((t: any) => t.assigneeId).filter(Boolean))] as string[];
            const totalAssignees = assigneeIds.length;
            const assignees = assigneeIds.slice(0, 3).map(id => allUsers.find((u: any) => u.id === id)).filter(Boolean);
            return { ...p, pct, done, inProgress, todo, total, isOverdue, assignees, totalAssignees };
        });
    }, [projects, allTasks, allUsers, today]);

    // Filtered + sorted
    const filtered = useMemo(() => {
        let list = projectData;
        if (statusFilter !== 'All') list = list.filter(p => p.status === statusFilter);
        if (search.trim()) list = list.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.client || '').toLowerCase().includes(search.toLowerCase())
        );
        list = [...list].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'budget') return (b.budget || 0) - (a.budget || 0);
            if (sortBy === 'progress') return b.pct - a.pct;
            const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return da - db;
        });
        return list;
    }, [projectData, statusFilter, search, sortBy]);

    const statuses = ['All', ...Array.from(new Set(projects.map(p => p.status)))];

    const handleProjectCreated = async () => {
        // Re-fetch projects from the server after creation
        const { getProjects } = await import("@/lib/actions");
        const freshProjects = await getProjects();
        setProjects(freshProjects);
    };

    const ProjectCard = ({ project }: { project: any }) => (
        <Link href={`/dashboard/projects/${project.slug || project.id}`} className="block group">
            <Card className={`h-full transition-all border-border hover:border-primary/50 hover:shadow-lg ${project.isOverdue ? 'border-red-500/30' : ''}`}>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                {project.isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                                <h2 className="font-semibold leading-none tracking-tight text-base truncate group-hover:text-primary transition-colors">{project.name}</h2>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {project.client && project.client !== project.name && (
                                    <Badge variant="outline" className="font-normal text-xs">{project.client}</Badge>
                                )}
                                {project.services?.slice(0, 2).map((svcId: string) => {
                                    const svc = services.find((s: any) => s.id === svcId || s.name === svcId);
                                    return (
                                        <Badge key={svcId} variant="secondary" className="font-normal text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                            {svc?.name || svcId}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[project.status] || 'bg-muted text-muted-foreground'}`}>
                            {project.status}
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {/* Task status breakdown */}
                    <TaskStatusPills todo={project.todo} inProgress={project.inProgress} done={project.done} />

                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{project.done}/{project.total} tasks</span>
                            <span className="font-semibold">{project.pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${project.pct === 100 ? 'bg-emerald-500' : project.pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                style={{ width: `${project.pct}%` }}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-0.5">
                        {/* Assignee Avatars */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-2">
                                {project.assignees.length > 0 ? project.assignees.map((u: any) => (
                                    <Avatar key={u.id} className="h-6 w-6 border-2 border-background" title={u.name}>
                                        <AvatarImage src={u.avatar} alt={u.name || 'Team member'} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                                            {u.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                )) : (
                                    <span className="text-[10px] text-muted-foreground">No assigned</span>
                                )}
                                {project.totalAssignees > 3 && (
                                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold text-muted-foreground" title={`${project.totalAssignees - 3} more`}>
                                        +{project.totalAssignees - 3}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {project.budget > 0 && (
                                <span className="text-xs text-muted-foreground font-medium">₹{project.budget.toLocaleString()}</span>
                            )}
                            <DaysLabel dueDate={project.dueDate} status={project.status} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );

    const ProjectRow = ({ project }: { project: any }) => (
        <Link href={`/dashboard/projects/${project.slug || project.id}`} className="block group">
            <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 bg-card transition-all hover:border-primary/50 hover:shadow-md ${project.isOverdue ? 'border-red-500/30' : 'border-border'}`}>
                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        {project.isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {project.client && project.client !== project.name && (
                            <span className="text-[10px] text-muted-foreground">{project.client}</span>
                        )}
                        <TaskStatusPills todo={project.todo} inProgress={project.inProgress} done={project.done} />
                    </div>
                </div>

                {/* Progress pill */}
                <div className="hidden sm:flex items-center gap-2 w-32">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${project.pct === 100 ? 'bg-emerald-500' : project.pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${project.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground w-7 shrink-0">{project.pct}%</span>
                </div>

                {/* Avatars */}
                <div className="hidden md:flex -space-x-1.5">
                    {project.assignees.map((u: any) => (
                        <Avatar key={u.id} className="h-5 w-5 border border-background" title={u.name}>
                            <AvatarImage src={u.avatar} alt={u.name || 'Team member'} />
                            <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">{u.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ))}
                    {project.totalAssignees > 3 && (
                        <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[7px] font-bold text-muted-foreground" title={`${project.totalAssignees - 3} more`}>
                            +{project.totalAssignees - 3}
                        </div>
                    )}
                </div>

                {/* Status */}
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[project.status] || 'bg-muted text-muted-foreground'}`}>{project.status}</span>

                {/* Days left */}
                <div className="w-16 text-right">
                    <DaysLabel dueDate={project.dueDate} status={project.status} />
                </div>
            </div>
        </Link>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <div className={`flex items-center transition-all duration-200 border border-input rounded-md bg-background overflow-hidden ${searchExpanded ? 'w-52' : 'w-9'} h-9`}>
                        <button aria-label="Search projects" className="p-2 shrink-0" onClick={() => setSearchExpanded(v => !v)}>
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {searchExpanded && (
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="flex-1 bg-transparent text-sm outline-none pr-2"
                            />
                        )}
                    </div>

                    {/* Sort */}
                    <select
                        aria-label="Sort projects"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground cursor-pointer"
                    >
                        <option value="dueDate">Sort: Due Date</option>
                        <option value="progress">Sort: Progress</option>
                        <option value="budget">Sort: Budget</option>
                        <option value="name">Sort: Name</option>
                    </select>

                    {/* View toggle */}
                    <div className="flex items-center border border-input rounded-md overflow-hidden h-9">
                        <button aria-label="Grid view" onClick={() => setViewMode('grid')} className={`px-2.5 h-full flex items-center transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button aria-label="List view" onClick={() => setViewMode('list')} className={`px-2.5 h-full flex items-center transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => setShowWizard(true)}
                            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> New Project
                        </button>
                    )}
                </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-2">
                {statuses.map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${statusFilter === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-background hover:bg-muted text-muted-foreground'
                            }`}
                    >{s}</button>
                ))}
            </div>

            <CreateProjectWizard open={showWizard} onOpenChange={setShowWizard} onProjectCreated={handleProjectCreated} />

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg font-medium">No projects found</p>
                    <p className="text-sm mt-1">Try a different filter or search term</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(project => <ProjectCard key={project.id} project={project} />)}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {/* List header */}
                    <div className="hidden sm:grid grid-cols-[1fr_140px_80px_100px_80px] gap-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <span>Project</span>
                        <span>Progress</span>
                        <span>Team</span>
                        <span>Status</span>
                        <span className="text-right">Due</span>
                    </div>
                    {filtered.map(project => <ProjectRow key={project.id} project={project} />)}
                </div>
            )}
        </div>
    );
}
