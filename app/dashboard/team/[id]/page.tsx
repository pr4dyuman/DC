"use client";

import { use, useEffect, useState } from "react";
import { User, Task, Activity } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Mail, Briefcase, Phone, MapPin, Calendar, IndianRupee,
    CheckCircle2, Clock, Activity as ActivityIcon, ArrowLeft,
    PieChart, Zap, Trash2, Pencil
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getUser, getUserTasks, getUserActivity } from "@/lib/actions";
import { EditUserDialog } from "@/components/team/EditUserDialog";
import { useChat } from "@/context/ChatContext";
import { MessageCircle } from "lucide-react";
import { getSessionId } from "@/lib/auth"; // Ensure this is imported

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
    // Correctly unwrap params using React.use()
    const { id } = use(params);

    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { openChat } = useChat();
    const [isSelf, setIsSelf] = useState(false);

    const [currentUserRole, setCurrentUserRole] = useState<string>("");

    // Function to re-fetch data after edit
    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Who is looking?
            const currentSessionId = await getSessionId();
            if (currentSessionId) {
                const currentUser = await getUser(currentSessionId);
                if (currentUser) {
                    setCurrentUserRole(currentUser.role);
                    setIsSelf(currentUser.id === id);
                }
            }

            // Who are we looking at?
            const userData = await getUser(id);
            if (userData) {
                setUser(userData);
                const userTasks = await getUserTasks(id);
                setTasks(userTasks);
                const userActivities = await getUserActivity(id);
                setActivities(userActivities);
            }
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

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
                <h1 className="text-2xl font-bold">Employee Profile</h1>

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
                </div>
            </div>

            <EditUserDialog
                user={user}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={loadData}
                currentUserRole={currentUserRole}
            />

            {/* Profile Header Card */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-800 shadow-2xl">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent"></div>

                <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                    <Avatar className="h-32 w-32 border-4 border-neutral-800 shadow-xl ring-2 ring-yellow-500/20">
                        <AvatarImage src={user.avatar} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-neutral-800 text-yellow-500">
                            {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">{user.name}</h2>
                            <p className="text-yellow-500 font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                                <Briefcase className="h-4 w-4" />
                                {user.jobTitle || "Team Member"}
                                <span className="text-neutral-500">•</span>
                                <span className="capitalize text-neutral-400">{user.role}</span>

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
                            <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 px-3 py-1">
                                <Mail className="mr-2 h-3 w-3 text-yellow-500" />
                                {user.email}
                            </Badge>
                            {/* Salary Logic: Only Show if Self or Admin/Manager */}
                            {user.salary && user.salary > 0 && (isSelf || currentUserRole === 'admin' || currentUserRole === 'manager') && (
                                <Badge variant="secondary" className="bg-neutral-800 text-green-400 hover:bg-neutral-700 px-3 py-1">
                                    <IndianRupee className="mr-2 h-3 w-3" />
                                    {user.salary.toLocaleString()}/mo
                                </Badge>
                            )}
                            <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 px-3 py-1">
                                <Calendar className="mr-2 h-3 w-3 text-yellow-500" />
                                Joined May 2024
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="bg-neutral-800/50 border-neutral-700 p-4 text-center">
                                <div className="text-2xl font-bold text-white">{completedTasks}</div>
                                <div className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Done</div>
                            </Card>
                            <Card className="bg-neutral-800/50 border-neutral-700 p-4 text-center">
                                <div className="text-2xl font-bold text-yellow-500">{efficiency}%</div>
                                <div className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Efficiency</div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="w-full sm:w-auto grid grid-cols-3 h-12 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm">
                        Assigned Tasks ({tasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm">
                        Recent Activity
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300" >
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="col-span-1 md:col-span-2 bg-neutral-900 border-neutral-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5 text-yellow-500" />
                                    Work Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed border-neutral-800 rounded-lg">
                                    Activity Chart Placeholder
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-neutral-900 border-neutral-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    Quick Stats
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                                    <span className="text-muted-foreground">Projects</span>
                                    <span className="font-bold">4 Active</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                                    <span className="text-muted-foreground">Pending Tasks</span>
                                    <span className="font-bold text-orange-400">{pendingTasks}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Last Active</span>
                                    <span className="font-bold text-green-400">Now</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TASKS TAB */}
                <TabsContent value="tasks" className="animate-in slide-in-from-bottom-2 duration-300" >
                    <Card className="bg-neutral-900 border-neutral-800">
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
                                            <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg group hover:bg-neutral-800 transition-colors border border-neutral-800 hover:border-neutral-700">
                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-1 h-3 w-3 rounded-full ${task.status === 'Done' ? 'bg-green-500' :
                                                        task.status === 'In Progress' ? 'bg-blue-500' :
                                                            'bg-neutral-500'
                                                        }`} />
                                                    <div>
                                                        <h4 className="font-medium text-white group-hover:text-yellow-500 transition-colors">{task.title}</h4>
                                                        <p className="text-sm text-neutral-400 mt-1 line-clamp-1">{task.description || "No description provided."}</p>

                                                        <div className="flex gap-2 mt-2">
                                                            <Badge variant="outline" className="text-xs border-neutral-700 text-neutral-400">
                                                                {task.priority || 'Normal'}
                                                            </Badge>
                                                            {task.category && (
                                                                <Badge variant="outline" className="text-xs border-neutral-700 text-neutral-400">
                                                                    {task.category}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${task.status === 'Done' ? 'bg-green-900/30 text-green-400' :
                                                        task.status === 'In Progress' ? 'bg-blue-900/30 text-blue-400' :
                                                            'bg-neutral-700 text-neutral-300'
                                                        }`}>
                                                        {task.status}
                                                    </span>
                                                    {task.dueDate && (
                                                        <div className="text-xs text-neutral-500 mt-2">
                                                            Due {new Date(task.dueDate).toLocaleDateString()}
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
                    <Card className="bg-neutral-900 border-neutral-800">
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
                                                <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-neutral-800"></div>
                                            )}

                                            <div className="h-5 w-5 rounded-full bg-neutral-800 border-2 border-yellow-500 z-10 flex-shrink-0 mt-1"></div>

                                            <div className="flex-1 pb-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-medium text-white">
                                                            <span className="text-yellow-500">{activity.action}</span> {activity.target}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 mt-1">
                                                            {new Date(activity.timestamp).toLocaleString(undefined, {
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
            </Tabs>
        </div>
    );
}
