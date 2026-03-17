"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getClientByUsername, getClientProjects, getClientFinanceData, getClientActivityLogs, getProjectTasks, getCurrentUser } from "@/lib/actions";
import { Client, Project, Invoice, Transaction, Activity as ActivityType, Task } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Mail, Phone, MapPin, Building, ExternalLink, Calendar,
    CreditCard, TrendingUp, Activity, FileText, CheckCircle2, Clock,
    ArrowUpRight, ArrowDownRight, Download, ArrowLeft, Pencil,
    MessageCircle, ChevronDown, AlertCircle, Loader2
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { useDateFormat } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useRouter } from "next/navigation";

// Helper: download vCard for client
function downloadVCard(client: Client) {
    const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${client.name}`,
        `ORG:${client.companyName}`,
        `EMAIL:${client.email}`,
    ];
    if (client.phone) lines.push(`TEL:${client.phone}`);
    if (client.address) lines.push(`ADR:;;${client.address};;;;`);
    lines.push('END:VCARD');

    const blob = new Blob([lines.join('\n')], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.companyName.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
}

// Skeleton loading component
function ClientDetailSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-10">
            <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                <div className="h-7 w-44 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-secondary to-muted border border-border shadow-2xl">
                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="h-32 w-32 rounded-full bg-muted-foreground/10 animate-pulse" />
                    <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-3">
                            <div className="h-8 w-52 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                            <div className="h-5 w-36 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                            <div className="h-5 w-48 rounded-md bg-muted-foreground/10 animate-pulse mx-auto md:mx-0" />
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="h-7 w-40 rounded-full bg-muted-foreground/10 animate-pulse" />
                            <div className="h-7 w-32 rounded-full bg-muted-foreground/10 animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 min-w-[200px]">
                        <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                        <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                        <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                        <div className="h-20 rounded-lg bg-muted-foreground/10 animate-pulse" />
                    </div>
                </div>
            </div>
            <div className="h-12 w-full rounded-lg bg-muted animate-pulse" />
            <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64 rounded-xl bg-muted/50 border border-border animate-pulse" />
                <div className="h-64 rounded-xl bg-muted/50 border border-border animate-pulse" />
            </div>
        </div>
    );
}

export default function ClientDetailPage({ slug }: { slug: string }) {
    const fmt = useDateFormat();
    const { format: formatMoney } = useCurrency();
    const [client, setClient] = useState<Client | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [financeData, setFinanceData] = useState<{
        invoices: Invoice[];
        transactions: Transaction[];
        stats: { totalInvoiced: number; totalPaid: number; pendingAmount: number; ltv: number; };
    } | null>(null);
    const [activities, setActivities] = useState<ActivityType[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Tab state — read initial tab from URL, then manage locally
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            return url.searchParams.get('tab') || 'overview';
        }
        return 'overview';
    });

    // Activity pagination
    const { visibleCount: activityLimit, sentinelRef: activitySentinelRef, hasMore: hasMoreActivities } = useProgressiveList(activities.length, 15, [slug]);

    const { openChat } = useChat();
    const router = useRouter();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const requestedClient = decodeURIComponent(slug);
            const currentUser = await getCurrentUser();

            if (currentUser?.role === 'client') {
                const ownIdentifiers = new Set([currentUser.id, currentUser.username].filter(Boolean));
                if (!ownIdentifiers.has(requestedClient)) {
                    router.replace('/dashboard');
                    return;
                }
            }

            const foundClient = await getClientByUsername(requestedClient);
            setClient(foundClient || null);

            if (foundClient) {
                const [clientProjects, finance, logs] = await Promise.all([
                    getClientProjects(foundClient.id),
                    getClientFinanceData(foundClient.id),
                    getClientActivityLogs(foundClient.id)
                ]);

                setProjects(clientProjects);
                setFinanceData(finance);
                setActivities(logs);

                // Fetch tasks for all client projects to compute hours
                if (clientProjects.length > 0) {
                    const projectIds = clientProjects.map(p => p.id);
                    const tasks = await getProjectTasks(projectIds);
                    setAllTasks(tasks);
                } else {
                    setAllTasks([]);
                }
            }
        } catch (error) {
            console.error("Failed to load client data", error);
            toast.error("Failed to load client data");
        } finally {
            setLoading(false);
        }
    }, [router, slug]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Tab URL sync handler (before early returns)
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

    // Activity pagination (before early returns)
    const visibleActivities = activities.slice(0, activityLimit);

    // Group activities by date (before early returns)
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

    if (loading) return <ClientDetailSkeleton />;
    if (!client) return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Client not found</h1>
            <Link href="/dashboard/clients" className="text-primary hover:underline mt-4 inline-block">
                &larr; Back to Clients
            </Link>
        </div>
    );

    const activeProjects = projects.filter(p => p.status === 'Active').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const dueInvoices = financeData?.invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue') || [];
    const lastActiveText = fmt.presence(client.lastActiveAt);
    const isOnline = lastActiveText === "Online";

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/clients" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold">Client Profile</h1>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => downloadVCard(client)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                        title="Download contact card"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">vCard</span>
                    </button>
                    <button
                        onClick={() => openChat(client.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Message</span>
                    </button>
                    <button
                        onClick={() => setIsEditDialogOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg transition-all"
                    >
                        <Pencil className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit Client</span>
                    </button>
                </div>
            </div>

            <EditClientDialog
                client={client}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={loadData}
            />

            {/* Profile Header Card */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-secondary to-muted border border-border shadow-2xl">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent"></div>

                <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                    {/* Avatar with online indicator */}
                    <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-border shadow-xl ring-2 ring-yellow-500/20">
                            <AvatarImage src={client.logo} className="object-cover" />
                            <AvatarFallback className="text-3xl bg-muted text-yellow-500">
                                {client.name ? client.name.substring(0, 2).toUpperCase() : "?"}
                            </AvatarFallback>
                        </Avatar>
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
                                <h2 className="text-3xl font-bold text-foreground tracking-tight">{client.name}</h2>
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
                            {client.username && <p className="text-muted-foreground font-medium text-lg">@{client.username}</p>}
                            <p className="text-yellow-500 font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                                <Building className="h-4 w-4" />
                                {client.companyName}
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <Mail className="mr-2 h-3 w-3 text-yellow-500" />
                                {client.email}
                            </Badge>
                            {client.phone && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                    <Phone className="mr-2 h-3 w-3 text-yellow-500" />
                                    {client.phone}
                                </Badge>
                            )}
                            {client.address && (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                    <MapPin className="mr-2 h-3 w-3 text-yellow-500" />
                                    {client.address}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Header stat cards */}
                    <div className="flex flex-col gap-3 min-w-[160px] sm:min-w-[200px]">
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="bg-muted/50 border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{activeProjects}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active</div>
                            </Card>
                            <Card className="bg-muted/50 border-border p-4 text-center">
                                <div className="text-2xl font-bold text-green-500">{completedProjects}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Done</div>
                            </Card>
                        </div>
                        {/* Hours stat cards */}
                        {(() => {
                            const totalHours = allTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                            const completedHours = allTasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                            return (
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
                            );
                        })()}
                        {financeData && financeData.stats.pendingAmount > 0 && (
                            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5">
                                <AlertCircle className="h-3 w-3" />
                                {formatMoney(financeData.stats.pendingAmount)} pending
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="w-full h-auto grid grid-cols-2 lg:grid-cols-4 gap-2 bg-secondary border border-border p-2 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">Overview</TabsTrigger>
                    <TabsTrigger value="projects" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Projects ({projects.length})
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">Finance</TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime Value</CardTitle>
                                <CreditCard className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">{formatMoney(financeData?.stats.ltv)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Total paid amount</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                                <Activity className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">{activeProjects}</div>
                                <p className="text-xs text-muted-foreground mt-1">{completedProjects} completed projects</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
                                <FileText className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">{formatMoney(financeData?.stats.pendingAmount)}</div>
                                <p className="text-xs text-muted-foreground mt-1">{dueInvoices.length} invoices pending</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Paid Total</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">{formatMoney(financeData?.stats.totalPaid)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Settled payments</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Contact Info */}
                        <Card className="md:col-span-1 bg-card border-border h-fit">
                            <CardHeader>
                                <CardTitle>Contact Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {client.address && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <MapPin className="h-4 w-4 text-yellow-500" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Location</p>
                                            <p className="text-xs text-muted-foreground">{client.address}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Mail className="h-4 w-4 text-yellow-500" />
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium text-foreground">Email</p>
                                        <p className="text-xs text-muted-foreground truncate" title={client.email}>{client.email}</p>
                                    </div>
                                </div>
                                {client.phone && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Phone className="h-4 w-4 text-yellow-500" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Phone</p>
                                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Activity Mini Feed */}
                        <Card className="md:col-span-2 bg-card border-border">
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px] pr-4">
                                    <div className="space-y-6">
                                        {activities.length > 0 ? activities.slice(0, 5).map((activity, i) => (
                                            <div key={activity.id || i} className="flex gap-4 relative">
                                                {i !== activities.slice(0, 5).length - 1 && (
                                                    <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-border"></div>
                                                )}
                                                <div className="h-5 w-5 rounded-full bg-muted border-2 border-primary z-10 flex-shrink-0 mt-1"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        <span className="text-yellow-500">{activity.action}</span> {activity.target}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {fmt.dateTime(activity.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">No recent activity recorded.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map(project => (
                            <Link href={`/dashboard/projects/${project.id}`} key={project.id}>
                                <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer h-full group">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-start">
                                            <span className="truncate group-hover:text-yellow-500 transition-colors">{project.name}</span>
                                            <Badge variant="outline" className={`
                                                ${project.status === 'Active' ? 'text-green-500 border-green-500/20' :
                                                    project.status === 'Completed' ? 'text-blue-500 border-blue-500/20' :
                                                        'text-muted-foreground border-border'}
                                            `}>
                                                {project.status}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>{project.services?.join(", ")}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between text-sm py-2 border-t border-border">
                                            <span className="text-muted-foreground">Budget</span>
                                            <span className="font-medium text-foreground">{formatMoney(project.budget)}</span>
                                        </div>
                                        {project.dueDate && (
                                            <div className="flex justify-between text-sm pt-2">
                                                <span className="text-muted-foreground">Due Date</span>
                                                <span>{fmt.date(project.dueDate)}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                    {projects.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-lg border border-dashed border-border text-sm">
                            No projects found for this client.
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="finance" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-yellow-500" />
                                    Invoices
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-3">
                                        {financeData?.invoices.map(invoice => (
                                            <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-2 w-2 rounded-full ${invoice.status === 'Paid' ? 'bg-green-500' :
                                                        invoice.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`} />
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">#{invoice.id.slice(0, 8)}</p>
                                                        <p className="text-xs text-muted-foreground">{fmt.date(invoice.date)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-foreground">{formatMoney(invoice.amount)}</p>
                                                    <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 rounded-full ${invoice.status === 'Paid' ? 'bg-green-900/30 text-green-500' :
                                                        invoice.status === 'Pending' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-red-900/30 text-red-500'
                                                        }`}>
                                                        {invoice.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {(!financeData?.invoices || financeData.invoices.length === 0) && (
                                            <div className="text-center py-8 text-sm text-muted-foreground">No invoices found.</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                    Transactions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-3">
                                        {financeData?.transactions.map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type?.toLowerCase() === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                        }`}>
                                                        {tx.type?.toLowerCase() === 'income' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{tx.description}</p>
                                                        <p className="text-xs text-muted-foreground">{fmt.date(tx.date)}</p>
                                                    </div>
                                                </div>
                                                <p className={`text-sm font-bold ${tx.type?.toLowerCase() === 'income' ? 'text-green-500' : 'text-foreground'
                                                    }`}>
                                                    {tx.type?.toLowerCase() === 'income' ? '+' : '-'} {formatMoney(tx.amount)}
                                                </p>
                                            </div>
                                        ))}
                                        {(!financeData?.transactions || financeData.transactions.length === 0) && (
                                            <div className="text-center py-8 text-sm text-muted-foreground">No transactions found.</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="activity" className="animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>All activities associated with this client.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {activities.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">No activity recorded for this client.</div>
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
                                                                    <p className="text-sm font-medium text-foreground">
                                                                        <span className="text-yellow-500">{activity.action}</span> {activity.target}
                                                                    </p>
                                                                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                                                                        {fmt.time12(activity.timestamp)}
                                                                    </span>
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
            </Tabs>
        </div>
    );
}
