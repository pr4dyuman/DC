"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import { User, Task, Activity, Project } from "@/lib/types";
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
    Mail, Briefcase, Calendar, Banknote,
    CheckCircle2, Clock, Activity as ActivityIcon, ArrowLeft,
    Zap, Pencil, MessageCircle,
    Eye, ListTodo, FolderOpen, Search, ChevronDown, Phone, AlertCircle, Flame, Share2, Download, Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser, getUserTasks, getUserActivity, getUserByUsername, getUserProjects, getSessionId, getClientProjects, getClientCreatedTasks, getProjectTasks, getLeaveRequests, getUserContributionHistory } from "@/lib/actions";
import { EditUserDialog } from "@/components/team/EditUserDialog";
import { useChat } from "@/context/ChatContext";
import { LeaveRequest } from "@/lib/types";
import { LeaveRequestDialog } from "@/components/leave-request-dialog";
import { LeaveRequestsList } from "@/components/leave-requests-list";
import { ContributionHeatmap, DailyStats } from "@/components/team/ContributionHeatmap";
import { cn } from "@/lib/utils";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { useDateFormat } from "@/context/TimezoneContext";

// Helper: check if a task is overdue
function isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === "Done") return false;
    return new Date(task.dueDate) < new Date();
}

// Helper: calculate task completion streak (consecutive days with completions)
function calculateStreak(contributionStats: Record<string, DailyStats>): number {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    // Start from today and go backwards
    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (contributionStats[dateStr] && contributionStats[dateStr].count > 0) {
            streak++;
        } else if (i > 0) {
            // Allow today to be empty (day isn't over yet), but break on any past gap
            break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
}

// Helper: download vCard
function downloadVCard(user: User) {
    const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${user.name}`,
        `EMAIL:${user.email}`,
    ];
    if (user.contactNumber) lines.push(`TEL:${user.contactNumber}`);
    if (user.jobTitle) lines.push(`TITLE:${user.jobTitle}`);
    lines.push('END:VCARD');

    const blob = new Blob([lines.join('\n')], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
}

// Skeleton loading component
function ProfileSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-10">
            {/* Header skeleton */}
            <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                <div className="h-7 w-52 rounded-md bg-muted animate-pulse" />
            </div>

            {/* Profile card skeleton */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-secondary to-muted border border-border shadow-2xl">
                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Avatar */}
                    <div className="h-32 w-32 rounded-full bg-muted-foreground/10 animate-pulse" />

                    <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-3">
                            <div className="h-8 w-48 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                            <div className="h-5 w-32 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                            <div className="h-5 w-64 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="h-7 w-40 rounded-full bg-muted-foreground/10 animate-pulse" />
                            <div className="h-7 w-32 rounded-full bg-muted-foreground/10 animate-pulse" />
                            <div className="h-7 w-36 rounded-full bg-muted-foreground/10 animate-pulse" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                            <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs skeleton */}
            <div className="h-12 w-full rounded-lg bg-muted animate-pulse" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-1 md:col-span-2 h-64 rounded-xl bg-muted/50 border border-border animate-pulse" />
                <div className="h-64 rounded-xl bg-muted/50 border border-border animate-pulse" />
            </div>
        </div>
    );
}

export default function EmployeeProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = use(params);
    const fmt = useDateFormat();
    // Tab state — read initial tab from URL, then manage locally
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            return url.searchParams.get('tab') || 'overview';
        }
        return 'overview';
    });

    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [clientCreatedTasks, setClientCreatedTasks] = useState<Task[]>([]);
    const [userProjects, setUserProjects] = useState<Project[]>([]);
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
    const { visibleCount: activityLimit, sentinelRef: activitySentinelRef, hasMore: hasMoreActivities } = useProgressiveList(activities.length, 15, [user?.id]);

    // Task pagination
    // filteredTasks must be computed before hooks (which can't be after early returns)
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
                const order: Record<string, number> = { 'High': 0, 'Medium': 1, 'Low': 2 };
                return (order[a.priority || 'Medium'] ?? 1) - (order[b.priority || 'Medium'] ?? 1);
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
    const { visibleCount: taskVisibleCount, sentinelRef: taskSentinelRef, hasMore: hasMoreTasks } = useProgressiveList(filteredTasks.length, 20, [taskStatusFilter, taskSearch, taskSortBy]);

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const joinYear = user?.createdAt
            ? new Date(user.createdAt).getFullYear()
            : currentYear;
        const years: number[] = [];
        for (let y = currentYear; y >= joinYear; y--) {
            years.push(y);
        }
        return years;
    }, [user?.createdAt]);

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
            // Track which task titles we've already counted via activity logs
            const countedTitles = new Set<string>();

            // Approach 1: Use activity logs to find exact completion timestamps
            const doneTitles = new Set(
                tasks
                    .filter(t => t.status === 'Done')
                    .map(t => t.title.toLowerCase().trim())
            );

            const taskCompletionTimes = new Map<string, string>();

            if (Array.isArray(contributionHistory)) {
                contributionHistory.forEach(activity => {
                    const action = activity.action.toLowerCase();
                    const title = activity.target.toLowerCase().trim();

                    if (doneTitles.has(title)) {
                        if (action.includes('done') || action.includes('completed') || action.includes('fixed') || action.includes('finished')) {
                            const currentStored = taskCompletionTimes.get(title);
                            if (!currentStored || activity.timestamp > currentStored) {
                                taskCompletionTimes.set(title, activity.timestamp);
                            }
                        }
                    }
                });
            }

            taskCompletionTimes.forEach((timestamp, title) => {
                const dateStr = timestamp.split('T')[0];
                const day = getDay(dateStr);
                day.count++;
                countedTitles.add(title);
            });

            // Approach 2: Fallback — for Done tasks not captured by activity logs,
            // use the task's updatedAt as the completion date
            tasks
                .filter(t => t.status === 'Done')
                .forEach(task => {
                    const titleKey = task.title.toLowerCase().trim();
                    if (!countedTitles.has(titleKey)) {
                        const timestamp = (task as any).updatedAt || task.createdAt;
                        if (timestamp) {
                            const dateStr = typeof timestamp === 'string'
                                ? timestamp.split('T')[0]
                                : new Date(timestamp).toISOString().split('T')[0];
                            const day = getDay(dateStr);
                            day.count++;
                            countedTitles.add(titleKey);
                        }
                    }
                });
        }

        return stats;
    }, [contributionHistory, tasks, clientCreatedTasks, user]);


    const loadData = useCallback(async () => {
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
                let projects: Project[] = [];

                if (userData.role === 'client') {
                    projects = await getClientProjects(userData.id) as Project[];
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
                    projects = await getUserProjects(userData.id) as Project[];

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
    }, [username]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Paginated activities (must be before early returns to keep hook order stable)
    const visibleActivities = activities.slice(0, activityLimit);

    // Group activities by date for display
    const groupedActivities = useMemo(() => {
        const groups: { label: string; items: typeof visibleActivities }[] = [];
        let currentLabel = "";
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        visibleActivities.forEach(activity => {
            const dateStr = new Date(activity.timestamp).toDateString();
            let label: string;
            if (dateStr === today) label = "Today";
            else if (dateStr === yesterday) label = "Yesterday";
            else label = fmt.dateLong(activity.timestamp);

            if (label !== currentLabel) {
                currentLabel = label;
                groups.push({ label, items: [] });
            }
            groups[groups.length - 1].items.push(activity);
        });
        return groups;
    }, [visibleActivities]);

    // Task completion streak (must be before early returns)
    const streak = useMemo(() => calculateStreak(contributionStats), [contributionStats]);

    // Tab URL sync handler (must be before early returns)
    const handleTabChange = useCallback((value: string) => {
        setActiveTab(value);
        const url = new URL(window.location.href);
        if (value === 'overview') {
            url.searchParams.delete('tab');
        } else {
            url.searchParams.set('tab', value);
        }
        window.history.replaceState({}, '', url.pathname + url.search);
    }, []);

    if (loading) {
        return <ProfileSkeleton />;
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
    const overdueTasks = tasks.filter(t => isOverdue(t)).length;
    const efficiency = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : null;

    // Hours calculations
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const completedHours = tasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const inProgressHours = totalHours - completedHours;

    // Project-wise hours breakdown
    const projectHoursMap = new Map<string, { total: number; completed: number; projectName: string }>();
    tasks.forEach(t => {
        if (!t.estimatedHours || t.estimatedHours <= 0) return;
        const key = t.projectId;
        if (!projectHoursMap.has(key)) {
            const project = userProjects.find((p: Project) => p.id === key);
            projectHoursMap.set(key, { total: 0, completed: 0, projectName: project?.name || 'Unknown Project' });
        }
        const entry = projectHoursMap.get(key)!;
        entry.total += t.estimatedHours;
        if (t.status === 'Done') entry.completed += t.estimatedHours;
    });
    const projectHoursArray = Array.from(projectHoursMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.total - a.total);

    // Last active status
    const lastActiveText = fmt.presence(user.lastActiveAt);
    const isOnline = lastActiveText === "Online";

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/team" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold">{user.role === 'client' ? 'Client Profile' : 'Team Member Profile'}</h1>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => downloadVCard(user)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                        title="Download contact card"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">vCard</span>
                    </button>
                    {!isSelf && (
                        <button
                            onClick={() => openChat(user.id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Message</span>
                        </button>
                    )}
                    {(isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                        <button
                            onClick={() => setIsEditDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit Profile</span>
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
                    {/* Avatar with online indicator */}
                    <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-border shadow-xl ring-2 ring-primary/20">
                            <AvatarImage src={user.avatar} className="object-cover" />
                            <AvatarFallback className="text-3xl bg-muted text-primary">
                                {user.name ? user.name.substring(0, 2).toUpperCase() : "?"}
                            </AvatarFallback>
                        </Avatar>
                        {/* Online/Offline indicator dot */}
                        {lastActiveText && (
                            <div className={cn(
                                "absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-background",
                                isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                            )} title={isOnline ? "Online now" : `Last active ${lastActiveText}`} />
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-3">
                                <h2 className="text-3xl font-bold text-foreground tracking-tight">{user.name}</h2>
                                {lastActiveText && !isOnline && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {lastActiveText}
                                    </span>
                                )}
                                {isOnline && (
                                    <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full font-medium">
                                        Online
                                    </span>
                                )}
                            </div>
                            {user.username && <p className="text-muted-foreground font-medium text-lg">@{user.username}</p>}
                            <p className="text-primary font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                                <Briefcase className="h-4 w-4" />
                                {user.jobTitle || "Team Member"}
                                <span className="text-muted-foreground">•</span>
                                <span className="capitalize text-muted-foreground">{user.role}</span>
                                {user.employmentType && (
                                    <>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-muted-foreground text-sm">{user.employmentType}</span>
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <Mail className="mr-2 h-3 w-3 text-primary" />
                                {user.email}
                            </Badge>
                            {user.contactNumber && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                    <Phone className="mr-2 h-3 w-3 text-primary" />
                                    {user.contactNumber}
                                </Badge>
                            )}
                            {user.salary && user.salary > 0 && (isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                                <Badge variant="secondary" className="bg-muted text-green-500 hover:bg-accent px-3 py-1">
                                    <Banknote className="mr-2 h-3 w-3" />
                                    {user.salary.toLocaleString()}/mo
                                </Badge>
                            )}
                            {user.createdAt && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                    <Calendar className="mr-2 h-3 w-3 text-primary" />
                                    Joined {fmt.monthYear(user.createdAt)}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[160px] sm:min-w-[200px]">
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="bg-muted/50 border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Done</div>
                            </Card>
                            <Card className="bg-muted/50 border-border p-4 text-center">
                                <div className="text-2xl font-bold text-primary">
                                    {efficiency !== null ? `${efficiency}%` : "—"}
                                </div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                    {user.role === 'client' ? 'Progress' : 'Efficiency'}
                                </div>
                            </Card>
                        </div>
                        {/* Hours stat */}
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="bg-cyan-500/10 border-cyan-500/20 p-4 text-center">
                                <div className="text-2xl font-bold text-cyan-500">{completedHours}h</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Completed</div>
                            </Card>
                            <Card className="bg-muted/50 border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{totalHours}h</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Hours</div>
                            </Card>
                        </div>
                        {streak > 1 && (
                            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
                                <Flame className="h-3 w-3" />
                                {streak}-day streak
                            </div>
                        )}
                        {overdueTasks > 0 && (
                            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                                <AlertCircle className="h-3 w-3" />
                                {overdueTasks} overdue
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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

                                {/* Overdue indicator */}
                                {overdueTasks > 0 && (
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between hover:bg-red-500/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-red-500/20 text-red-500 rounded-lg">
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                            <span className="text-red-500 font-medium">Overdue</span>
                                        </div>
                                        <span className="text-2xl font-bold text-red-500">{overdueTasks}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Hours Overview Card */}
                        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-cyan-500" />
                                    Hours Overview
                                </CardTitle>
                                <CardDescription>
                                    {user.role === 'client' ? 'Total hours across all projects' : 'Estimated working hours across assigned tasks'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Left: Circular Ring + Stats */}
                                    <div className="flex items-center gap-8">
                                        {/* SVG Circular Progress */}
                                        <div className="relative w-28 h-28 shrink-0">
                                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                <circle cx="50" cy="50" r="42" strokeWidth="8" className="fill-none stroke-muted" />
                                                <circle
                                                    cx="50" cy="50" r="42" strokeWidth="8"
                                                    className="fill-none stroke-cyan-500"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${totalHours > 0 ? (completedHours / totalHours) * 263.89 : 0} 263.89`}
                                                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-2xl font-bold text-foreground">
                                                    {totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* 3-column stats */}
                                        <div className="grid grid-cols-3 gap-4 min-w-[240px]">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-cyan-500">{completedHours}h</div>
                                                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Completed</div>
                                            </div>
                                            <div className="text-center border-x border-border px-3">
                                                <div className="text-2xl font-bold text-blue-500">{inProgressHours}h</div>
                                                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Remaining</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-foreground">{totalHours}h</div>
                                                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Total</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Project Breakdown Table */}
                                    {projectHoursArray.length > 0 && (
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">By Project</h4>
                                            <div className="space-y-3">
                                                {projectHoursArray.map(p => {
                                                    const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
                                                    return (
                                                        <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="block group">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">{p.projectName}</span>
                                                                <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-2">
                                                                    <span className="text-cyan-500">{p.completed}h</span> / {p.total}h
                                                                </span>
                                                            </div>
                                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-cyan-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
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
                                    <CardTitle>
                                        {user.role === 'client' ? 'Project Tasks' : 'Assigned Tasks'}
                                    </CardTitle>
                                    <CardDescription>
                                        {user.role === 'client' ? 'Tasks across all projects' : 'Current workload and status'}
                                    </CardDescription>
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
                                    filteredTasks.slice(0, taskVisibleCount).map(task => {
                                        const taskOverdue = isOverdue(task);
                                        return (
                                            <Link href={`/dashboard/projects/${task.projectId}?task=${task.id}`} key={task.id} className="block">
                                                <div className={cn(
                                                    "flex items-center justify-between p-4 bg-muted/50 rounded-lg group hover:bg-muted transition-colors border hover:border-muted-foreground/30",
                                                    taskOverdue ? "border-red-500/30 bg-red-500/5" : "border-border"
                                                )}>
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
                                                                    {task.priority || 'Medium'}
                                                                </Badge>
                                                                {task.category && (
                                                                    <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                                                        {task.category}
                                                                    </Badge>
                                                                )}
                                                                {taskOverdue && (
                                                                    <Badge variant="outline" className="text-xs border-red-500/30 text-red-500 bg-red-500/10">
                                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                                        Overdue
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
                                                            <div className={cn(
                                                                "text-xs mt-2",
                                                                taskOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                                                            )}>
                                                                Due {fmt.date(task.dueDate)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                                {hasMoreTasks && (
                                    <div ref={taskSentinelRef} className="flex justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
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
                                    {userProjects.map((project) => {
                                        const projectTaskCount = tasks.filter(t => t.projectId === project.id).length;
                                        const projectDoneCount = tasks.filter(t => t.projectId === project.id && t.status === 'Done').length;
                                        const projectTotalHours = tasks.filter(t => t.projectId === project.id).reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                                        const projectCompletedHours = tasks.filter(t => t.projectId === project.id && t.status === 'Done').reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                                        return (
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
                                                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                                        {project.dueDate && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                Due {fmt.date(project.dueDate)}
                                                            </span>
                                                        )}
                                                        {projectTaskCount > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <ListTodo className="w-3 h-3" />
                                                                {projectDoneCount}/{projectTaskCount} tasks done
                                                            </span>
                                                        )}
                                                        {projectTotalHours > 0 && (
                                                            <span className="flex items-center gap-1 text-cyan-500">
                                                                <Clock className="w-3 h-3" />
                                                                {projectCompletedHours}/{projectTotalHours}h
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
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
                                        {groupedActivities.map((group, gi) => (
                                            <div key={gi}>
                                                {/* Date group label */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                                                    <div className="flex-1 h-px bg-border" />
                                                </div>
                                                <div className="space-y-6 mb-6">
                                                    {group.items.map((activity, i) => (
                                                        <div key={activity.id || `${gi}-${i}`} className="flex gap-4 relative">
                                                            {i !== group.items.length - 1 && (
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
                                                                            {fmt.time12(activity.timestamp)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {hasMoreActivities && (
                                            <div ref={activitySentinelRef} className="flex justify-center py-4">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
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
                                <CardDescription>
                                    {isSelf ? 'View your leave requests and status' : `Leave requests for ${user.name}`}
                                </CardDescription>
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
