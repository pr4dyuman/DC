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
    Mail, Briefcase, Phone, MapPin, Calendar, IndianRupee,
    CheckCircle2, Clock, Activity as ActivityIcon, ArrowLeft,
    PieChart as PieChartIcon, Zap, Trash2, Pencil, MessageCircle,
    Eye, ListTodo
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getUser, getUserTasks, getUserActivity, getUserByUsername, getUserProjects, getSessionId, getClientProjects, getClientCreatedTasks, getProjectTasks, getLeaveRequests, getUserContributionHistory } from "@/lib/actions";
import { EditUserDialog } from "@/components/team/EditUserDialog";
import { useChat } from "@/context/ChatContext";
import { LeaveRequest } from "@/lib/types";
import { LeaveRequestDialog } from "@/components/leave-request-dialog";
import { LeaveRequestsList } from "@/components/leave-requests-list";
import { ContributionHeatmap, DailyStats } from "@/components/team/ContributionHeatmap";

export default function EmployeeProfilePage({ params }: { params: Promise<{ username: string }> }) {
    // Correctly unwrap params using React.use()
    const { username } = use(params);

    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]); // Tasks list assigned TO user
    const [clientCreatedTasks, setClientCreatedTasks] = useState<Task[]>([]); // Tasks created BY user (Client)
    const [userProjects, setUserProjects] = useState<any[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [leaveDates, setLeaveDates] = useState<string[]>([]);
    const [contributionHistory, setContributionHistory] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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
            // Client View: Heatmap based on TASKS CREATED (Assigned)
            clientCreatedTasks.forEach(task => {
                if (task.createdAt) {
                    const dateStr = task.createdAt.split('T')[0];
                    const day = getDay(dateStr);
                    day.count++;
                }
            });
        } else {
            // Employee View: Heatmap based on COMPLETED TASKS
            // 1. Identify Valid Done Tasks (Current State)
            const currentDoneTitles = new Set(
                tasks
                    .filter(t => t.status === 'Done')
                    .map(t => t.title.toLowerCase().trim())
            );

            // 2. Map Tasks to LATEST Done Timestamp
            const taskCompletionTimes = new Map<string, string>();

            if (Array.isArray(contributionHistory)) {
                contributionHistory.forEach(activity => {
                    const action = activity.action.toLowerCase();
                    const title = activity.target.toLowerCase().trim();

                    // Only consider if task is CURRENTLY Done
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

            // 3. Populate Heatmap with UNIQUE completions
            taskCompletionTimes.forEach((timestamp) => {
                const dateStr = timestamp.split('T')[0];
                const day = getDay(dateStr);
                day.count++;
            });
        }

        return stats;
    }, [contributionHistory, tasks, clientCreatedTasks, user]);


    // Function to re-fetch data after edit
    const loadData = async () => {
        if (!username) return;
        setLoading(true);
        try {
            // Who is looking?
            const currentSessionId = await getSessionId();
            if (currentSessionId) {
                const currentUser = await getUser(currentSessionId);
                if (currentUser) {
                    setCurrentUserRole(currentUser.role);
                }
            }

            // Who are we looking at?
            const userData = await getUserByUsername(decodeURIComponent(username));
            if (userData) {
                setUser(userData);

                // Check self AFTER we have the user object
                setIsSelf(currentSessionId === userData.id);

                let userTasks: Task[] = [];
                let projects: any[] = [];

                if (userData.role === 'client') {
                    // Fetch Client specific data
                    projects = await getClientProjects(userData.id);
                    const createdTasks = await getClientCreatedTasks(userData.id);
                    setClientCreatedTasks(createdTasks);

                    // NEW: Fetch all tasks for these projects to populate stats
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
                    // Standard Employee Data
                    userTasks = await getUserTasks(userData.id);
                    setTasks(userTasks);
                    projects = await getUserProjects(userData.id);

                    const leaves = await getLeaveRequests(userData.id);
                    setLeaveRequests(leaves);

                    // Calculate approved leave dates for heatmap
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



    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/team" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold">{user.role === 'client' ? 'Client Profile' : 'Team Member Profile'}</h1>

                <div className="ml-auto">
                    {(isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                        <button
                            onClick={() => setIsEditDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-yellow-500 hover:bg-yellow-400 rounded-lg shadow-lg hover:shadow-yellow-500/20 transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Profile
                        </button>
                    )}
                    {isSelf && user.role !== 'client' && (
                        <div className="ml-2 inline-block">
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
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent"></div>

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
                            <p className="text-yellow-500 font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                                <Briefcase className="h-4 w-4" />
                                {user.jobTitle || "Team Member"}
                                <span className="text-neutral-500">•</span>
                                <span className="capitalize text-muted-foreground">{user.role}</span>

                                {!isSelf && (
                                    <button
                                        onClick={() => openChat(user.id)}
                                        className="ml-2 bg-yellow-500 hover:bg-yellow-400 text-black p-1.5 rounded-full shadow-lg hover:shadow-yellow-500/20 transition-all flex items-center justify-center group"
                                        title="Send Message"
                                    >
                                        <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <Mail className="mr-2 h-3 w-3 text-yellow-500" />
                                {user.email}
                            </Badge>
                            {/* Salary Logic: Only Show if Self or Admin/Manager */}
                            {user.salary && user.salary > 0 && (isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                                <Badge variant="secondary" className="bg-muted text-green-400 hover:bg-accent px-3 py-1">
                                    <IndianRupee className="mr-2 h-3 w-3" />
                                    {user.salary.toLocaleString()}/mo
                                </Badge>
                            )}
                            {user.createdAt && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                    <Calendar className="mr-2 h-3 w-3 text-yellow-500" />
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
                                <div className="text-2xl font-bold text-yellow-500">{efficiency}%</div>
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
                <TabsList className="w-full h-auto grid grid-cols-2 lg:grid-cols-4 gap-2 bg-secondary border border-border p-2 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Tasks ({tasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Activity
                    </TabsTrigger>
                    {user.role !== 'client' && (
                        <TabsTrigger value="leaves" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
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
                                    <ActivityIcon className="h-5 w-5 text-yellow-500" />
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
                                    <Zap className="h-5 w-5 text-yellow-500" />
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
                                    {/* Done */}
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-green-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-green-500/20 text-green-500 rounded-lg">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </div>
                                            <span className="text-2xl font-bold text-green-500">{tasks.filter(t => t.status === 'Done').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-green-400/80 uppercase tracking-wider">Done</span>
                                    </div>

                                    {/* In Progress */}
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-blue-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-blue-500/20 text-blue-500 rounded-lg">
                                                <Clock className="h-4 w-4 animate-pulse" />
                                            </div>
                                            <span className="text-2xl font-bold text-blue-500">{tasks.filter(t => t.status === 'In Progress').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-blue-400/80 uppercase tracking-wider">In Progress</span>
                                    </div>

                                    {/* Review */}
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-purple-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-purple-500/20 text-purple-500 rounded-lg">
                                                <Eye className="h-4 w-4" />
                                            </div>
                                            <span className="text-2xl font-bold text-purple-500">{tasks.filter(t => t.status === 'Review').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-purple-400/80 uppercase tracking-wider">Review</span>
                                    </div>

                                    {/* Todo */}
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-amber-500/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="p-1.5 bg-amber-500/20 text-amber-500 rounded-lg">
                                                <ListTodo className="h-4 w-4" />
                                            </div>
                                            <span className="text-2xl font-bold text-amber-500">{tasks.filter(t => t.status === 'Todo').length}</span>
                                        </div>
                                        <span className="text-xs font-medium text-amber-400/80 uppercase tracking-wider">Todo</span>
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
                            <CardTitle>Assigned Tasks</CardTitle>
                            <CardDescription>Current workload and status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {tasks.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">No tasks assigned yet.</div>
                                ) : (
                                    tasks.map(task => (
                                        <Link href={`/dashboard/projects/${task.projectId}?task=${task.id}`} key={task.id} className="block">
                                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg group hover:bg-muted transition-colors border border-border hover:border-muted-foreground/30">
                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-1 h-3 w-3 rounded-full ${task.status === 'Done' ? 'bg-green-500' :
                                                        task.status === 'In Progress' ? 'bg-blue-500' :
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
                                                <div className="text-right">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${task.status === 'Done' ? 'bg-green-900/30 text-green-400' :
                                                        task.status === 'In Progress' ? 'bg-blue-900/30 text-blue-400' :
                                                            'bg-muted text-muted-foreground'
                                                        }`}>
                                                        {task.status}
                                                    </span>
                                                    {task.dueDate && (
                                                        <div className="text-xs text-neutral-500 mt-2">
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
                                    activities.map((activity, i) => (
                                        <div key={activity.id || i} className="flex gap-4 relative">
                                            {/* Timeline Line */}
                                            {i !== activities.length - 1 && (
                                                <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-border"></div>
                                            )}

                                            <div className="h-5 w-5 rounded-full bg-muted border-2 border-primary z-10 flex-shrink-0 mt-1"></div>

                                            <div className="flex-1 pb-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            <span className="text-yellow-500">{activity.action}</span> {activity.target}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 mt-1">
                                                            {new Date(activity.timestamp).toLocaleString('en-IN', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
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
