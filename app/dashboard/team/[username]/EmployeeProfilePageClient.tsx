"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { User, Task, Activity, Project } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Pencil, MessageCircle,
    Download
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser, getUserTasks, getUserActivity, getUserByUsername, getUserProjects, getSessionId, getClientProjects, getClientCreatedTasks, getProjectTasks, getLeaveRequests, getUserContributionHistory } from "@/lib/actions";
import { EditUserDialog } from "@/components/team/EditUserDialog";
import { useChat } from "@/context/ChatContext";
import { LeaveRequest } from "@/lib/types";
import { LeaveRequestDialog } from "@/components/leave-request-dialog";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { useDateFormat } from "@/context/TimezoneContext";
import { toast } from "sonner";
import { EmployeeProfileActivityTab } from "./_components/EmployeeProfileActivityTab";
import { EmployeeProfileHeaderCard } from "./_components/EmployeeProfileHeaderCard";
import { EmployeeProfileLeavesTab } from "./_components/EmployeeProfileLeavesTab";
import { EmployeeProfileOverviewTab } from "./_components/EmployeeProfileOverviewTab";
import { EmployeeProfileProjectsTab } from "./_components/EmployeeProfileProjectsTab";
import { EmployeeProfileSkeleton } from "./_components/EmployeeProfileSkeleton";
import { EmployeeProfileTasksTab } from "./_components/EmployeeProfileTasksTab";
import {
    buildContributionStats,
    calculateStreak,
    downloadVCard,
    getAvailableYears,
    getFilteredTasks,
    groupActivitiesByDate,
    isOverdue,
    summarizeEmployeeProfile,
} from "./_components/employee-profile-utils";

export default function EmployeeProfilePage({ username }: { username: string }) {
    const fmt = useDateFormat();
    // Tab state: read initial tab from URL, then manage locally
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
    const filteredTasks = useMemo(
        () => getFilteredTasks(tasks, taskStatusFilter, taskSearch, taskSortBy),
        [tasks, taskStatusFilter, taskSearch, taskSortBy],
    );
    const { visibleCount: taskVisibleCount, sentinelRef: taskSentinelRef, hasMore: hasMoreTasks } = useProgressiveList(filteredTasks.length, 20, [taskStatusFilter, taskSearch, taskSortBy]);

    const availableYears = useMemo(() => getAvailableYears(user?.createdAt), [user?.createdAt]);

    const router = useRouter();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { openChat } = useChat();
    const [isSelf, setIsSelf] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>("");

    const contributionStats = useMemo(
        () => buildContributionStats(user?.role, tasks, clientCreatedTasks, contributionHistory),
        [contributionHistory, tasks, clientCreatedTasks, user?.role],
    );


    const loadData = useCallback(async () => {
        if (!username) return;
        setLoading(true);
        try {
            const requestedUsername = decodeURIComponent(username);
            const currentSessionId = await getSessionId();
            let currentUser: User | undefined;
            if (currentSessionId) {
                currentUser = await getUser(currentSessionId);
                if (currentUser) {
                    setCurrentUserRole(currentUser.role);

                    if (currentUser.role === 'client') {
                        const ownIdentifiers = new Set([currentUser.id, currentUser.username].filter(Boolean));
                        if (!ownIdentifiers.has(requestedUsername)) {
                            router.replace('/dashboard');
                            return;
                        }
                    }
                }
            }

            const userData = await getUserByUsername(requestedUsername);
            if (userData) {
                setUser(userData);
                setIsSelf(currentSessionId === userData.id);

                let userTasks: Task[] = [];
                let projects: Project[] = [];
                let userActivities: Activity[] = [];

                if (userData.role === 'client') {
                    const canViewClientOperationalData =
                        currentSessionId === userData.id ||
                        currentUser?.role === 'admin' ||
                        currentUser?.role === 'manager';

                    if (canViewClientOperationalData) {
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

                        userActivities = await getUserActivity(userData.id);
                    } else {
                        setClientCreatedTasks([]);
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
                        const current = new Date(leave.startDate);
                        const end = new Date(leave.endDate);
                        while (current <= end) {
                            dates.push(current.toISOString().split('T')[0]);
                            current.setDate(current.getDate() + 1);
                        }
                    });

                    const history = await getUserContributionHistory(userData.id);
                    setContributionHistory(history);
                    setLeaveDates(dates);

                    userActivities = await getUserActivity(userData.id);
                }

                setActivities(userActivities);
                setUserProjects(projects);
            }
        } catch (error) {
            console.error("Failed to load profile", error);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    }, [router, username]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Paginated activities (must be before early returns to keep hook order stable)
    const visibleActivities = activities.slice(0, activityLimit);

    // Group activities by date for display
    const groupedActivities = useMemo(
        () => groupActivitiesByDate(visibleActivities, fmt.dateLong),
        [fmt, visibleActivities],
    );

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
        return <EmployeeProfileSkeleton />;
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

    const {
        completedTasks,
        overdueTasks,
        efficiency,
        activeProjectsCount,
        inProgressTaskCount,
        reviewTaskCount,
        todoTaskCount,
        totalHours,
        completedHours,
        inProgressHours,
        projectHoursArray,
    } = summarizeEmployeeProfile(tasks, userProjects);

    // Last active status
    const lastActiveText = fmt.presence(user.lastActiveAt);
    const isOnline = lastActiveText === "Online";
    const joinedText = user.createdAt ? fmt.monthYear(user.createdAt) : null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header / Nav */}
            <div className="flex items-center gap-2">
                <Link href="/dashboard/team" className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="hidden sm:block text-2xl font-bold truncate min-w-0">{user.role === 'client' ? 'Client Profile' : 'Team Member Profile'}</h1>

                <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={() => downloadVCard(user)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                        title="Download contact card"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">vCard</span>
                    </button>
                    {!isSelf && (
                        <button
                            onClick={() => openChat(user.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Message</span>
                        </button>
                    )}
                    {(isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                        <button
                            onClick={() => setIsEditDialogOpen(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit Profile</span>
                        </button>
                    )}
                    {isSelf && user.role !== 'client' && (
                        <div>
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

            <EmployeeProfileHeaderCard
                user={user}
                currentUserRole={currentUserRole}
                isSelf={isSelf}
                lastActiveText={lastActiveText}
                isOnline={isOnline}
                completedTasks={completedTasks}
                efficiency={efficiency}
                completedHours={completedHours}
                totalHours={totalHours}
                streak={streak}
                overdueTasks={overdueTasks}
                joinedText={joinedText}
            />

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
                <EmployeeProfileOverviewTab
                    userRole={user.role}
                    availableYears={availableYears}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    contributionStats={contributionStats}
                    leaveDates={leaveDates}
                    activeProjectsCount={activeProjectsCount}
                    doneTaskCount={completedTasks}
                    inProgressTaskCount={inProgressTaskCount}
                    reviewTaskCount={reviewTaskCount}
                    todoTaskCount={todoTaskCount}
                    overdueTasks={overdueTasks}
                    completedHours={completedHours}
                    inProgressHours={inProgressHours}
                    totalHours={totalHours}
                    projectHours={projectHoursArray}
                />

                <EmployeeProfileTasksTab
                    userRole={user.role}
                    filteredTasks={filteredTasks}
                    taskSearch={taskSearch}
                    onTaskSearchChange={setTaskSearch}
                    taskStatusFilter={taskStatusFilter}
                    onTaskStatusFilterChange={setTaskStatusFilter}
                    taskSortBy={taskSortBy}
                    onTaskSortByChange={setTaskSortBy}
                    taskVisibleCount={taskVisibleCount}
                    hasMoreTasks={hasMoreTasks}
                    taskSentinelRef={taskSentinelRef}
                    formatDate={fmt.date}
                    isTaskOverdue={isOverdue}
                />

                <EmployeeProfileProjectsTab
                    userName={user.name}
                    userRole={user.role}
                    userProjects={userProjects}
                    tasks={tasks}
                    formatDate={fmt.date}
                />

                <EmployeeProfileActivityTab
                    userName={user.name}
                    groupedActivities={groupedActivities}
                    formatTime={fmt.time12}
                    hasMoreActivities={hasMoreActivities}
                    activitySentinelRef={activitySentinelRef}
                />

                {user.role !== 'client' && (
                    <EmployeeProfileLeavesTab
                        isSelf={isSelf}
                        userName={user.name}
                        leaveRequests={leaveRequests}
                    />
                )}
            </Tabs>
        </div>
    );
}
