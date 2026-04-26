"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, MessageCircle, Pencil } from "lucide-react";
import {
    getClientActivityLogs,
    getClientByUsername,
    getClientFinanceData,
    getClientProjects,
    getCurrentUser,
    getProjectTasks,
} from "@/lib/actions";
import {
    Activity as ActivityType,
    Client,
    Invoice,
    Project,
    Task,
    Transaction,
} from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { useChat } from "@/context/ChatContext";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { useDateFormat } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";
import { ClientActivityTab } from "./_components/ClientActivityTab";
import { ClientDetailSkeleton } from "./_components/ClientDetailSkeleton";
import { ClientFinanceTab } from "./_components/ClientFinanceTab";
import { ClientOverviewTab } from "./_components/ClientOverviewTab";
import { ClientProfileHeaderCard } from "./_components/ClientProfileHeaderCard";
import { ClientProjectsTab } from "./_components/ClientProjectsTab";

function downloadVCard(client: Client) {
    const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${client.name}`,
        `ORG:${client.companyName}`,
        `EMAIL:${client.email}`,
    ];

    if (client.phone) lines.push(`TEL:${client.phone}`);
    if (client.address) lines.push(`ADR:;;${client.address};;;;`);
    lines.push("END:VCARD");

    const blob = new Blob([lines.join("\n")], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${client.companyName.replace(/\s+/g, "_")}.vcf`;
    anchor.click();
    URL.revokeObjectURL(url);
}

type ClientFinanceData = {
    invoices: Invoice[];
    transactions: Transaction[];
    stats: {
        totalInvoiced: number;
        totalPaid: number;
        pendingAmount: number;
        ltv: number;
    };
};

export default function ClientDetailPage({ slug }: { slug: string }) {
    const fmt = useDateFormat();
    const { format: formatMoney } = useCurrency();
    const router = useRouter();
    const { openChat } = useChat();

    const [client, setClient] = useState<Client | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [financeData, setFinanceData] = useState<ClientFinanceData | null>(null);
    const [activities, setActivities] = useState<ActivityType[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [canManageClients, setCanManageClients] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            return url.searchParams.get("tab") || "overview";
        }

        return "overview";
    });

    const {
        visibleCount: activityLimit,
        sentinelRef: activitySentinelRef,
        hasMore: hasMoreActivities,
    } = useProgressiveList(activities.length, 15, [slug]);

    const loadData = useCallback(async () => {
        setLoading(true);

        try {
            const requestedClient = decodeURIComponent(slug);
            const currentUser = await getCurrentUser();
            setCurrentUserId(currentUser?.id || null);
            setCanManageClients(currentUser?.role === "admin" || currentUser?.role === "manager");

            if (currentUser?.role === "client") {
                const ownIdentifiers = new Set([currentUser.id, currentUser.username].filter(Boolean));
                if (!ownIdentifiers.has(requestedClient)) {
                    router.replace("/dashboard");
                    return;
                }
            }

            const foundClient = await getClientByUsername(requestedClient);
            setClient(foundClient || null);

            if (!foundClient) {
                setProjects([]);
                setFinanceData(null);
                setActivities([]);
                setAllTasks([]);
                return;
            }

            const [clientProjects, finance, logs] = await Promise.all([
                getClientProjects(foundClient.id),
                getClientFinanceData(foundClient.id),
                getClientActivityLogs(foundClient.id),
            ]);

            setProjects(clientProjects);
            setFinanceData(finance);
            setActivities(logs);

            if (clientProjects.length === 0) {
                setAllTasks([]);
                return;
            }

            const projectIds = clientProjects.map((project) => project.id);
            const tasks = await getProjectTasks(projectIds);
            setAllTasks(tasks);
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

    const handleTabChange = useCallback((value: string) => {
        setActiveTab(value);
        const url = new URL(window.location.href);

        if (value === "overview") {
            url.searchParams.delete("tab");
        } else {
            url.searchParams.set("tab", value);
        }

        window.history.replaceState({}, "", url.pathname + url.search);
    }, []);

    const visibleActivities = activities.slice(0, activityLimit);

    const groupedActivities = useMemo(() => {
        const groups: { label: string; items: ActivityType[] }[] = [];
        let currentLabel = "";
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        visibleActivities.forEach((activity) => {
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
    }, [visibleActivities, fmt]);

    if (loading) return <ClientDetailSkeleton />;

    if (!client) {
        return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold">Client not found</h1>
                    <Link href={canManageClients ? "/dashboard/clients" : "/dashboard"} className="text-primary hover:underline mt-4 inline-block">
                        &larr; Back
                    </Link>
                </div>
            );
    }

    const activeProjects = projects.filter((project) => project.status === "Active").length;
    const completedProjects = projects.filter((project) => project.status === "Completed").length;
    const dueInvoices = financeData?.invoices.filter((invoice) => invoice.status === "Pending" || invoice.status === "Overdue") || [];
    const lastActiveText = fmt.presence(client.lastActiveAt);
    const isOnline = lastActiveText === "Online";

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex items-center gap-4">
                <Link href={canManageClients ? "/dashboard/clients" : "/dashboard"} className="p-2 hover:bg-muted rounded-full transition-colors">
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
                    {currentUserId !== client.id && (
                        <button
                            onClick={() => openChat(client.id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-muted hover:bg-accent text-foreground rounded-lg transition-all border border-border"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Message</span>
                        </button>
                    )}
                    {canManageClients && (
                        <button
                            onClick={() => setIsEditDialogOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg transition-all"
                        >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit Client</span>
                        </button>
                    )}
                </div>
            </div>

            {canManageClients && (
                <EditClientDialog
                    client={client}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSuccess={loadData}
                />
            )}

            <ClientProfileHeaderCard
                client={client}
                lastActiveText={lastActiveText}
                isOnline={isOnline}
                activeProjects={activeProjects}
                completedProjects={completedProjects}
                pendingAmount={financeData?.stats.pendingAmount}
                allTasks={allTasks}
                formatMoney={formatMoney}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="w-full h-auto grid grid-cols-2 lg:grid-cols-4 gap-2 bg-secondary border border-border p-2 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Projects ({projects.length})
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Finance
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                        Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <ClientOverviewTab
                        client={client}
                        activities={activities}
                        activeProjects={activeProjects}
                        completedProjects={completedProjects}
                        lifetimeValue={financeData?.stats.ltv}
                        pendingAmount={financeData?.stats.pendingAmount}
                        totalPaid={financeData?.stats.totalPaid}
                        dueInvoicesCount={dueInvoices.length}
                        formatMoney={formatMoney}
                        formatDateTime={fmt.dateTime}
                    />
                </TabsContent>

                <TabsContent value="projects" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <ClientProjectsTab
                        projects={projects}
                        formatMoney={formatMoney}
                        formatDate={fmt.date}
                    />
                </TabsContent>

                <TabsContent value="finance" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <ClientFinanceTab
                        invoices={financeData?.invoices || []}
                        transactions={financeData?.transactions || []}
                        formatMoney={formatMoney}
                        formatDate={fmt.date}
                    />
                </TabsContent>

                <TabsContent value="activity" className="animate-in slide-in-from-bottom-2 duration-300">
                    <ClientActivityTab
                        activities={activities}
                        groupedActivities={groupedActivities}
                        hasMoreActivities={hasMoreActivities}
                        activitySentinelRef={activitySentinelRef}
                        formatTime={fmt.time12}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
