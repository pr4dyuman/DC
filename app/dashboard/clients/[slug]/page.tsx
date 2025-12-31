"use client";

import { useState, useEffect, use } from "react";
import { getClientByUsername, getClientProjects, getClientFinanceData, getClientActivityLogs } from "@/lib/actions";
import { Client, Project, Invoice, Transaction, Activity as ActivityType } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Loader2, Mail, Phone, MapPin, Building, Globe, ExternalLink, Calendar,
    CreditCard, TrendingUp, Activity, FileText, CheckCircle2, Clock,
    ArrowUpRight, ArrowDownRight, Download
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ClientDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [client, setClient] = useState<Client | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [financeData, setFinanceData] = useState<{
        invoices: Invoice[];
        transactions: Transaction[];
        stats: { totalInvoiced: number; totalPaid: number; pendingAmount: number; ltv: number; };
    } | null>(null);
    const [activities, setActivities] = useState<ActivityType[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        loadData();
    }, [slug]);

    const loadData = async () => {
        setLoading(true);
        try {
            const foundClient = await getClientByUsername(decodeURIComponent(slug));
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
            }
        } catch (error) {
            console.error("Failed to load client data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!client) return <div className="text-center py-12">Client not found</div>;

    const activeProjects = projects.filter(p => p.status === 'Active').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/clients" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowUpRight className="h-5 w-5 rotate-180" /> {/* Back arrow */}
                </Link>
                <h1 className="text-2xl font-bold">Client Profile</h1>
            </div>

            {/* Profile Header Card */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-800 shadow-2xl">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent"></div>

                <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                    <Avatar className="h-32 w-32 border-4 border-neutral-800 shadow-xl ring-2 ring-yellow-500/20">
                        <AvatarImage src={client.logo} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-neutral-800 text-yellow-500">
                            {client.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">{client.name}</h2>
                            {client.username && <p className="text-neutral-400 font-medium text-lg">@{client.username}</p>}
                            <p className="text-yellow-500 font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                                <Building className="h-4 w-4" />
                                {client.companyName}
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 px-3 py-1">
                                <Mail className="mr-2 h-3 w-3 text-yellow-500" />
                                {client.email}
                            </Badge>
                            {client.phone && (
                                <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 px-3 py-1">
                                    <Phone className="mr-2 h-3 w-3 text-yellow-500" />
                                    {client.phone}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="w-full h-auto grid grid-cols-2 lg:grid-cols-4 gap-2 bg-neutral-900 border border-neutral-800 p-2 rounded-lg">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">Overview</TabsTrigger>
                        <TabsTrigger value="projects" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">
                            Projects ({projects.length})
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">Finance</TabsTrigger>
                        <TabsTrigger value="activity" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-sm py-2">Activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        {/* Quick Stats */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-neutral-900 border-neutral-800">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime Value</CardTitle>
                                    <CreditCard className="h-4 w-4 text-yellow-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">₹{financeData?.stats.ltv.toLocaleString() ?? '0'}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Total paid amount</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-neutral-900 border-neutral-800">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                                    <Activity className="h-4 w-4 text-yellow-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">{activeProjects}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{completedProjects} completed projects</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-neutral-900 border-neutral-800">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
                                    <FileText className="h-4 w-4 text-yellow-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">₹{financeData?.stats.pendingAmount.toLocaleString() ?? '0'}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{financeData?.invoices.filter(i => i.status === 'Pending').length ?? 0} invoices pending</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-neutral-900 border-neutral-800">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Paid Total</CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white">₹{financeData?.stats.totalPaid.toLocaleString() ?? '0'}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Settled payments</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Contact Info */}
                            <Card className="md:col-span-1 bg-neutral-900 border-neutral-800 h-fit">
                                <CardHeader>
                                    <CardTitle>Contact Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {client.address && (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50">
                                            <MapPin className="h-4 w-4 text-yellow-500" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Location</p>
                                                <p className="text-xs text-muted-foreground">{client.address}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50">
                                        <Mail className="h-4 w-4 text-yellow-500" />
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium text-white">Email</p>
                                            <p className="text-xs text-muted-foreground truncate" title={client.email}>{client.email}</p>
                                        </div>
                                    </div>
                                    {client.phone && (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50">
                                            <Phone className="h-4 w-4 text-yellow-500" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Phone</p>
                                                <p className="text-xs text-muted-foreground">{client.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Recent Activity Mini Feed */}
                            <Card className="md:col-span-2 bg-neutral-900 border-neutral-800">
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[300px] pr-4">
                                        <div className="space-y-6">
                                            {activities.length > 0 ? activities.slice(0, 5).map((activity, i) => (
                                                <div key={i} className="flex gap-4 relative">
                                                    {i !== activities.slice(0, 5).length - 1 && (
                                                        <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-neutral-800"></div>
                                                    )}
                                                    <div className="h-5 w-5 rounded-full bg-neutral-800 border-2 border-yellow-500 z-10 flex-shrink-0 mt-1"></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">
                                                            <span className="text-yellow-500">{activity.action}</span> {activity.target}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 mt-1">
                                                            {new Date(activity.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
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

                    <TabsContent value="projects" className="space-y-4">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {projects.map(project => (
                                <Link href={`/dashboard/projects/${project.id}`} key={project.id}>
                                    <Card className="bg-neutral-900 border-neutral-800 hover:border-yellow-500/50 transition-all cursor-pointer h-full group">
                                        <CardHeader>
                                            <CardTitle className="flex justify-between items-start">
                                                <span className="truncate group-hover:text-yellow-500 transition-colors">{project.name}</span>
                                                <Badge variant="outline" className={`
                                                    ${project.status === 'Active' ? 'text-green-500 border-green-500/20' :
                                                        project.status === 'Completed' ? 'text-blue-500 border-blue-500/20' :
                                                            'text-neutral-500 border-neutral-700'}
                                                `}>
                                                    {project.status}
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription>{project.services?.join(", ")}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between text-sm py-2 border-t border-neutral-800">
                                                <span className="text-muted-foreground">Budget</span>
                                                <span className="font-medium text-white">₹{project.budget?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2">
                                                <span className="text-muted-foreground">Due Date</span>
                                                <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                        {projects.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-neutral-900/50 rounded-lg border border-dashed border-neutral-800 text-sm">
                                No projects found for this client.
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="finance" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-neutral-900 border-neutral-800">
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
                                                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-800/30 hover:bg-neutral-800 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-2 w-2 rounded-full ${invoice.status === 'Paid' ? 'bg-green-500' :
                                                            invoice.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`} />
                                                        <div>
                                                            <p className="text-sm font-medium text-white">#{invoice.id.slice(0, 8)}</p>
                                                            <p className="text-xs text-muted-foreground">{new Date(invoice.date).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-white">₹{invoice.amount.toLocaleString()}</p>
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

                            <Card className="bg-neutral-900 border-neutral-800">
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
                                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-800/30 hover:bg-neutral-800 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type?.toLowerCase() === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                            }`}>
                                                            {tx.type?.toLowerCase() === 'income' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-white">{tx.description}</p>
                                                            <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm font-bold ${tx.type?.toLowerCase() === 'income' ? 'text-green-500' : 'text-white'
                                                        }`}>
                                                        {tx.type?.toLowerCase() === 'income' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
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

                    <TabsContent value="activity">
                        <Card className="bg-neutral-900 border-neutral-800">
                            <CardHeader>
                                <CardTitle>Activity Log</CardTitle>
                                <CardDescription>All activities associated with this client.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {activities.map((activity, i) => (
                                        <div key={i} className="flex gap-4 relative pb-6 last:pb-0">
                                            {/* Timeline Line */}
                                            {i !== activities.length - 1 && (
                                                <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-neutral-800"></div>
                                            )}

                                            <div className="h-5 w-5 rounded-full bg-neutral-800 border-2 border-yellow-500 z-10 flex-shrink-0 mt-1"></div>

                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-white">
                                                        <span className="text-yellow-500">{activity.action}</span>
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{activity.target}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">No activity recorded for this client.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
