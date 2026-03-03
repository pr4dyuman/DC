"use client";

import { use, useEffect, useState, useMemo } from "react";
import { User, Task, Activity } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Mail, Briefcase, Calendar, IndianRupee,
    CheckCircle2, Clock, Activity as ActivityIcon, ArrowLeft,
    Zap, Pencil, MessageCircle,
    Eye, ListTodo, FolderOpen, Search, ChevronDown, ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getUser, getUserTasks, getUserActivity, getUserByUsername, getUserProjects, getSessionId, getClientProjects, getClientCreatedTasks, getProjectTasks, getLeaveRequests, getUserContributionHistory } from "@/lib/actions";
import { EditUserDialog } from "@/components/team/EditUserDialog";
import { useChat } from "@/context/ChatContext";
import { LeaveRequest } from "@/lib/types";
import { LeaveRequestDialog } from "@/components/leave-request-dialog";
import { LeaveRequestsList } from "@/components/leave-requests-list";
import { ContributionHeatmap, DailyStats } from "@/components/team/ContributionHeatmap";
import { cn } from "@/lib/utils";

export default function EmployeeProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = use(params);

    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [clientCreatedTasks, setClientCreatedTasks] = useState<Task[]>([]);
    const [userProjects, setUserProjects] = useState<any[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [leaveDates, setLeaveDates] = useState<string[]>([]);
    const [contributionHistory, setContributionHistory] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Task filtering
    const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
    const [taskSearch, setTaskSearch] = useState("");
    const [taskSortBy, setTaskSortBy] = useState<string>("default");

    // Activity pagination
    const [activityLimit, setActivityLimit] = useState(15);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        if (contributionHistory) {
            contributionHistory.forEach(act => {
                const y = new Date(act.timestamp).getFullYear();
                years.add(y);
            });
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [contributionHistory]);

    const router = useRouter();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { openChat } = useChat();
    const [isSelf, setIsSelf] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>("");

    const contributionStats = useMemo(() => {
        const stats: Record<string, DailyStats> = {};

        const getDay = (dateStr: string) => {
            if (!stats[dateStr]) {
                stats[dateStr] = { date: dateStr, count: 0 };
            }
            return stats[dateStr];
        };

        if (user?.role === 'client') {
            clientCreatedTasks.forEach(task => {
                if (task.createdAt) {
                    const dateStr = task.createdAt.split('T')[0];
                    const day = getDay(dateStr);
                    day.count++;
                }
            });
        } else {
            const currentDoneTitles = new Set(
                tasks
                    .filter(t => t.status === 'Done')
                    .map(t => t.title.toLowerCase().trim())
            );

            const taskCompletionTimes = new Map<string, string>();

            if (Array.isArray(contributionHistory)) {
                contributionHistory.forEach(activity => {
                    const action = activity.action.toLowerCase();
                    const title = activity.target.toLowerCase().trim();

                    if (currentDoneTitles.has(title)) {
                        if (action.includes('done') || action.includes('completed') || action.includes('fixed') || action.includes('finished')) {
                            const currentStored = taskCompletionTimes.get(title);
                            if (!currentStored || activity.timestamp > currentStored) {
                                taskCompletionTimes.set(title, activity.timestamp);
                            }
                        }
                    }
                });
            }

            taskCompletionTimes.forEach((timestamp) => {
                const dateStr = timestamp.split('T')[0];
                const day = getDay(dateStr);
                day.count++;
            });
        }

        return stats;
    }, [contributionHistory, tasks, clientCreatedTasks, user]);


    const loadData = async () => {
        if (!username) return;
        setLoading(true);
        try {
            const currentSessionId = await getSessionId();
            if (currentSessionId) {
                const currentUser = await getUser(currentSessionId);
                if (currentUser) {
                    setCurrentUserRole(currentUser.role);
                }
            }

            const userData = await getUserByUsername(decodeURIComponent(username));
            if (userData) {
                setUser(userData);
                setIsSelf(currentSessionId === userData.id);

                let userTasks: Task[] = [];
                let projects: any[] = [];

                if (userData.role === 'client') {
                    projects = await getClientProjects(userData.id);
                    const createdTasks = await getClientCreatedTasks(userData.id);
                    setClientCreatedTasks(createdTasks);

                    if (projects.length > 0) {
                        const projectIds = projects.map(p => p.id);
                        const allProjectTasks = await getProjectTasks(projectIds);
                        setTasks(allProjectTasks);
                    } else {
                        setTasks([]);
                    }

                    setLeaveRequests([]);
                    setContributionHistory([]);
                } else {
                    userTasks = await getUserTasks(userData.id);
                    setTasks(userTasks);
                    projects = await getUserProjects(userData.id);

                    const leaves = await getLeaveRequests(userData.id);
                    setLeaveRequests(leaves);

                    const approvedLeaves = leaves.filter(l => l.status === 'Approved');
                    const dates: string[] = [];
                    approvedLeaves.forEach(leave => {
                        let current = new Date(leave.startDate);
                        const end = new Date(leave.endDate);
                        while (current <= end) {
                            dates.push(current.toISOString().split('T')[0]);
                            current.setDate(current.getDate() + 1);
                        }
                    });

                    const history = await getUserContributionHistory(userData.id);
                    setContributionHistory(history);
                    setLeaveDates(dates);
                }

                const userActivities = await getUserActivity(userData.id);
                setActivities(userActivities);
                setUserProjects(projects);
            }
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [username]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">User not found</h1>
                <Link href="/dashboard/team" className="text-primary hover:underline mt-4 inline-block">
                    &larr; Back to Team
                </Link>
            </div>
        );
    }

    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const pendingTasks = tasks.filter(t => t.status !== 'Done').length;
    const efficiency = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 100;

    // Filtered/sorted tasks
    const filteredTasks = tasks
        .filter(t => {
            const matchesStatus = taskStatusFilter === "all" ? true : t.status === taskStatusFilter;
            const matchesSearch = taskSearch.trim()
                ? t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.description?.toLowerCase().includes(taskSearch.toLowerCase())
                : true;
            return matchesStatus && matchesSearch;
        })
        .sort((a, b) => {
            if (taskSortBy === "priority") {
                const order: Record<string, number> = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Normal': 3, 'Low': 4 };
                return (order[a.priority || 'Normal'] ?? 3) - (order[b.priority || 'Normal'] ?? 3);
            }
            if (taskSortBy === "dueDate") {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            if (taskSortBy === "newest") {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            }
            return 0;
        });

    // Paginated activities
    const visibleActivities = activities.slice(0, activityLimit);
    const hasMoreActivities = activities.length > activityLimit;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/team" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold">{user.role === 'client' ? 'Client Profile' : 'Team Member Profile'}</h1>

                <div className="ml-auto flex items-center gap-2">
                    {!isSelf && (
                        <button
                            onClick={() => openChat(user.id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Message
                        </button>
                    )}
                    {(isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                        <button
                            onClick={() => setIsEditDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Profile
                        </button>
                    )}
                    {isSelf && user.role !== 'client' && (
                        <div className="ml-1">
                            <LeaveRequestDialog userId={user.id} />
                        </div>
                    )}
                </div>
            </div>

            <EditUserDialog
                user={user}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={loadData}
                currentUserRole={currentUserRole}
                isSelf={isSelf}
            />

            {/* Profile Header Card */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-secondary to-muted border border-border shadow-2xl">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>

                <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                    <Avatar className="h-32 w-32 border-4 border-border shadow-xl ring-2 ring-primary/20">
                        <AvatarImage src={user.avatar} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-muted text-primary">
                            {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground tracking-tight">{user.name}</h2>
                            {user.username && <p className="text-muted-foreground font-medium text-lg">@{user.username}</p>}
                            <p className="text-primary font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                                <Briefcase className="h-4 w-4" />
                                {user.jobTitle || "Team Member"}
                                <span className="text-muted-foreground">•</span>
                                <span className="capitalize text-muted-foreground">{user.role}</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <Mail className="mr-2 h-3 w-3 text-primary" />
                                {user.email}
                            </Badge>
                            {user.salary && user.salary > 0 && (isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                                <Badge variant="secondary" className="bg-muted text-green-500 hover:bg-accent px-3 py-1">
                                    <IndianRupee className="mr-2 h-3 w-3" />
                                    {user.salary.toLocaleString()}/mo
                                </Badge>
                            )}
                            {user.createdAt && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                    <Calendar className="mr-2 h-3 w-3 text-primary" />
                                    Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="bg-muted/50 border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Done</div>
                            </Card>
                            <Card className="bg-muted/50 border-border p-4 text-center">
                                <div className="text-2xl font-bold text-primary">{efficiency}%</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                    {user.role === 'client' ? 'Progress' : 'Efficiency'}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="w-full h-auto grid grid-cols-2 lg:grid-cols-5 gap-2 bg-secondary border border-border p-2 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm py-2">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm py-2">
                        Tasks ({tasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm py-2">
                        Projects ({userProjects.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm py-2">
                        Activity
                    </TabsTrigger>
                    {user.role !== 'client' && (
                        <TabsTrigger value="leaves" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm py-2">
                            Leaves
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300" >
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                        <Card className="col-span-1 md:col-span-2 bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <ActivityIcon className="h-5 w-5 text-primary" />
                                    Contribution Activity
                                </CardTitle>
                                <Select
                                    value={selectedYear.toString()}
                                    onValueChange={(val) => setSelectedYear(parseInt(val))}
                                >
                                    <SelectTrigger className="w-[100px] h-8 bg-secondary border-border text-xs">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-secondary border-border">
                                        {availableYears.map(y => (
                                            <SelectItem key={y} value={y.toString()} className="text-xs focus:bg-muted focus:text-foreground">
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent>
                                <ContributionHeatmap
                                    data={contributionStats}
                                    leaveDates={leaveDates}
                                    tooltipLabel={user.role === 'client' ? 'assigned' : 'completed'}
                                    year={selectedYear}
                                />
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-primary" />
                                    Quick Stats
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Projects Row */}
                                <div className="bg-muted/40 border border-border p-4 rounded-xl flex items-center justify-between group hover:border-muted-foreground/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg text-foreground group-hover:bg-accent transition-colors">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        <span className="text-muted-foreground font-medium">Active Projects</span>
                                    </div>
                                    <span className="text-2xl font-bold text-foreground">{userProjects.filter(p => p.status === 'Active').length}</span>
                                </div>

                                {/* Task Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-green-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-green-500/20 text-green-500 rounded-lg">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </div>
                                            <span className="text-2xl font-bold text-green-500">{tasks.filter(t => t.status === 'Done').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-green-500/80 uppercase tracking-wider">Done</span>
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-blue-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-blue-500/20 text-blue-500 rounded-lg">
                                                <Clock className="h-4 w-4 animate-pulse" />
                                            </div>
                                            <span className="text-2xl font-bold text-blue-500">{tasks.filter(t => t.status === 'In Progress').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-blue-500/80 uppercase tracking-wider">In Progress</span>
                                    </div>

                                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-purple-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-purple-500/20 text-purple-500 rounded-lg">
                                                <Eye className="h-4 w-4" />
                                            </div>
                                            <span className="text-2xl font-bold text-purple-500">{tasks.filter(t => t.status === 'Review').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-purple-500/80 uppercase tracking-wider">Review</span>
                                    </div>

                                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-amber-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-amber-500/20 text-amber-500 rounded-lg">
                                                <ListTodo className="h-4 w-4" />
                                            </div>
                                            <span className="text-2xl font-bold text-amber-500">{tasks.filter(t => t.status === 'Todo').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-amber-500/80 uppercase tracking-wider">Todo</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TASKS TAB */}
                <TabsContent value="tasks" className="animate-in slide-in-from-bottom-2 duration-300" >
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Assigned Tasks</CardTitle>
                                    <CardDescription>Current workload and status</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search tasks..."
                                            value={taskSearch}
                                            onChange={(e) => setTaskSearch(e.target.value)}
                                            className="bg-secondary border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    <select
                                        value={taskStatusFilter}
                                        onChange={(e) => setTaskStatusFilter(e.target.value)}
                                        className="bg-secondary border border-border rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="Todo">Todo</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Review">Review</option>
                                        <option value="Done">Done</option>
                                    </select>
                                    <select
                                        value={taskSortBy}
                                        onChange={(e) => setTaskSortBy(e.target.value)}
                                        className="bg-secondary border border-border rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                                    >
                                        <option value="default">Sort: Default</option>
                                        <option value="priority">Sort: Priority</option>
                                        <option value="dueDate">Sort: Due Date</option>
                                        <option value="newest">Sort: Newest</option>
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredTasks.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        {taskSearch || taskStatusFilter !== "all"
                                            ? "No tasks match your filters."
                                            : "No tasks assigned yet."
                                        }
                                    </div>
                                ) : (
                                    filteredTasks.map(task => (
                                        <Link href={`/dashboard/projects/${task.projectId}?task=${task.id}`} key={task.id} className="block">
                                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg group hover:bg-muted transition-colors border border-border hover:border-muted-foreground/30">
                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-1 h-3 w-3 rounded-full ${task.status === 'Done' ? 'bg-green-500' :
                                                        task.status === 'In Progress' ? 'bg-blue-500' :
                                                            task.status === 'Review' ? 'bg-purple-500' :
                                                                'bg-muted-foreground/50'
                                                        }`} />
                                                    <div>
                                                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{task.title}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description || "No description provided."}</p>

                                                        <div className="flex gap-2 mt-2">
                                                            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                                                {task.priority || 'Normal'}
                                                            </Badge>
                                                            {task.category && (
                                                                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                                                    {task.category}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-4">
                                                    <span className={cn(
                                                        "text-xs font-semibold px-2 py-1 rounded-full",
                                                        task.status === 'Done' ? 'bg-green-500/10 text-green-500' :
                                                            task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500' :
                                                                task.status === 'Review' ? 'bg-purple-500/10 text-purple-500' :
                                                                    'bg-muted text-muted-foreground'
                                                    )}>
                                                        {task.status}
                                                    </span>
                                                    {task.dueDate && (
                                                        <div className="text-xs text-muted-foreground mt-2">
                                                            Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PROJECTS TAB */}
                <TabsContent value="projects" className="animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>Projects</CardTitle>
                            <CardDescription>Projects {user.role === 'client' ? 'owned by' : 'assigned to'} {user.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {userProjects.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FolderOpen className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p>No projects yet.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {userProjects.map((project: any) => (
                                        <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="block">
                                            <div className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 hover:bg-muted transition-all group cursor-pointer">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h4>
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            "text-[10px] capitalize",
                                                            project.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                                project.status === 'Completed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                    'bg-muted text-muted-foreground border-border'
                                                        )}
                                                    >
                                                        {project.status}
                                                    </Badge>
                                                </div>
                                                {project.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                                    {project.startDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ACTIVITY TAB */}
                <TabsContent value="activity" className="animate-in slide-in-from-bottom-2 duration-300" >
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest actions performed by {user.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {activities.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">No recent activity found.</div>
                                ) : (
                                    <>
                                        {visibleActivities.map((activity, i) => (
                                            <div key={activity.id || i} className="flex gap-4 relative">
                                                {i !== visibleActivities.length - 1 && (
                                                    <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-border"></div>
                                                )}

                                                <div className="h-5 w-5 rounded-full bg-muted border-2 border-primary z-10 flex-shrink-0 mt-1"></div>

                                                <div className="flex-1 pb-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">
                                                                <span className="text-primary">{activity.action}</span> {activity.target}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {new Date(activity.timestamp).toLocaleString('en-IN', {
                                                                    dateStyle: 'medium',
                                                                    timeStyle: 'short'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {hasMoreActivities && (
                                            <button
                                                onClick={() => setActivityLimit(prev => prev + 15)}
                                                className="w-full py-2.5 text-sm font-medium text-primary hover:text-primary/80 bg-muted hover:bg-accent rounded-lg transition flex items-center justify-center gap-2 border border-border"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                                Load More ({activities.length - activityLimit} remaining)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* LEAVES TAB */}
                {user.role !== 'client' && (
                    <TabsContent value="leaves" className="animate-in slide-in-from-bottom-2 duration-300">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle>Leave History</CardTitle>
                                <CardDescription>View your leave requests and status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <LeaveRequestsList requests={leaveRequests} mode="user" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
