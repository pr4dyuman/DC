"use client";

import { useState } from "react";
import { Project, Task, User, Transaction, Asset, Service, UserPermissions } from "@/lib/types";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectFinanceSummary } from "@/components/finance/ProjectFinanceSummary";
import { TransactionList } from "@/components/finance/TransactionList";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { AssetList } from "@/components/projects/AssetList";
import { AddAssetModal } from "@/components/projects/AddAssetModal";
import { PaymentSettingsCard } from "@/components/projects/PaymentSettingsCard";

type ProjectViewProps = {
    project: Project;
    tasks: Task[];
    users: User[];
    transactions: Transaction[];
    assets: Asset[];
    categories: Service[];
    permissions?: UserPermissions;
};

export function ProjectView({ project, tasks, users, transactions, assets, categories, currentUser, permissions }: ProjectViewProps & { currentUser?: User }) {
    const projectServices = project.services || [];
    const filteredCategories = categories.filter(c => projectServices.includes(c.id) || projectServices.includes(c.name));
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [showTeamHours, setShowTeamHours] = useState(false);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager'; // Helper

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
            <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                    <div>
                        <h1 className="text-2xl font-bold truncate">{project.name}</h1>
                        {/* Project Summary Strip */}
                        {(() => {
                            const total = tasks.length;
                            const done = tasks.filter(t => t.status === 'Done').length;
                            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < today).length;
                            const isDue = project.dueDate && new Date(project.dueDate) < today && project.status !== 'Completed';
                            return (
                                <div className="mt-2 space-y-2">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{done}/{total} tasks done</span>
                                        {overdueTasks > 0 && <span className="text-red-500 font-semibold">⚠ {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}</span>}
                                        {(() => {
                                            const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                                            const completedHours = tasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                                            const hoursPct = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
                                            return (
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="text-cyan-500 dark:text-cyan-400 font-semibold">⏱ {completedHours}/{totalHours}h</span>
                                                    {totalHours > 0 && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <span className="inline-block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                <span className={`block h-full rounded-full transition-all ${hoursPct === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${hoursPct}%` }} />
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-muted-foreground">{hoursPct}%</span>
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => setShowTeamHours(v => !v)}
                                                        className="text-[10px] font-semibold text-primary hover:underline ml-1"
                                                    >
                                                        {showTeamHours ? 'Hide' : 'Team'}
                                                    </button>
                                                </span>
                                            );
                                        })()}
                                        {project.budget > 0 && <span>Budget: ₹{project.budget.toLocaleString()}</span>}
                                        {project.dueDate && <span className={isDue ? 'text-red-500 font-semibold' : ''}>Due: {new Date(project.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{isDue ? ' ⚠' : ''}</span>}
                                        {project.client && <span>Client: {project.client}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-xs">
                                            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                                    </div>

                                    {/* Team Hours Breakdown */}
                                    {showTeamHours && (() => {
                                        const memberMap = new Map<string, { total: number; completed: number }>();
                                        tasks.forEach(t => {
                                            if (!t.estimatedHours || t.estimatedHours <= 0 || !t.assigneeId) return;
                                            if (!memberMap.has(t.assigneeId)) memberMap.set(t.assigneeId, { total: 0, completed: 0 });
                                            const entry = memberMap.get(t.assigneeId)!;
                                            entry.total += t.estimatedHours;
                                            if (t.status === 'Done') entry.completed += t.estimatedHours;
                                        });
                                        const memberArr = Array.from(memberMap.entries())
                                            .map(([id, data]) => ({ id, ...data, user: users.find(u => u.id === id) }))
                                            .sort((a, b) => b.total - a.total);
                                        if (memberArr.length === 0) return null;
                                        return (
                                            <div className="mt-2 p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Team Hours</div>
                                                {memberArr.map(m => {
                                                    const mPct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
                                                    return (
                                                        <div key={m.id} className="flex items-center gap-3">
                                                            <Avatar className="h-6 w-6 border border-border shrink-0">
                                                                <AvatarImage src={m.user?.avatar} />
                                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{m.user?.name?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-medium text-foreground truncate">{m.user?.name || 'Unknown'}</span>
                                                                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0 ml-2">
                                                                        <span className="text-cyan-500 dark:text-cyan-400">{m.completed}h</span> / {m.total}h
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${mPct === 100 ? 'bg-emerald-500' : mPct >= 50 ? 'bg-cyan-500' : 'bg-blue-500'}`}
                                                                        style={{ width: `${mPct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {project.services && project.services.map((svc: string) => {
                                            const serviceObj = categories.find(c => c.id === svc || c.name === svc);
                                            const displayName = serviceObj ? serviceObj.name : svc;
                                            return (
                                                <Badge
                                                    key={svc}
                                                    variant={selectedCategory === svc ? "secondary" : "outline"}
                                                    className={`cursor-pointer transition-all ${selectedCategory === svc ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50" : "bg-yellow-500/5 text-yellow-600/70 hover:bg-yellow-500/10 border-yellow-500/20"}`}
                                                    onClick={() => setSelectedCategory(serviceObj ? serviceObj.id : svc)}
                                                >
                                                    {displayName}
                                                </Badge>
                                            );
                                        })}
                                        {selectedCategory !== 'All' && (
                                            <Badge variant="outline" className="cursor-pointer hover:bg-accent text-muted-foreground" onClick={() => setSelectedCategory('All')}>All ×</Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="board">Board</TabsTrigger>
                        {isAdmin && <TabsTrigger value="finance">Finance</TabsTrigger>}
                        <TabsTrigger value="assets">Assets</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 min-h-[32px]">
                        <TabsContent value="board" className="mt-0">
                            <div className="flex items-center gap-2">
                                {(permissions?.canManageTasks ?? true) && <CreateTaskModal projectId={project.id} />}
                                {isAdmin && (
                                    <ProjectSettingsModal
                                        projectId={project.id}
                                        currentSlug={project.slug}
                                        currentClientId={project.clientId}
                                        currentUserId={currentUser?.id}
                                    />
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="finance" className="mt-0">
                            {isAdmin && <AddTransactionModal projectId={project.id} projectName={project.name} users={users} />}
                        </TabsContent>
                        <TabsContent value="assets" className="mt-0">
                            <AddAssetModal projectId={project.id} />
                        </TabsContent>
                    </div>
                </div>

                <TabsContent value="board" className="flex-1 overflow-hidden data-[state=inactive]:hidden h-full">
                    <div className="h-full overflow-hidden">
                        <KanbanBoard
                            initialTasks={tasks}
                            projectId={project.id}
                            users={users}
                            categories={filteredCategories}
                            currentUserId={currentUser?.id}
                            aiEnabled={project.aiEnabled}
                            selectedCategory={selectedCategory}
                            readOnly={false}
                            permissions={permissions}
                        />
                    </div>
                </TabsContent>

                {isAdmin && (
                    <TabsContent value="finance" className="flex-1 overflow-auto data-[state=inactive]:hidden text-left no-scrollbar">
                        <div className="container max-w-4xl py-6 space-y-6">
                            <ProjectFinanceSummary project={project} transactions={transactions} />
                            <TransactionList
                                transactions={transactions.filter(t => t.projectId === project.id)}
                                title="Project Transactions"
                                isAdmin={true}
                            />
                            <PaymentSettingsCard project={project} />
                        </div>
                    </TabsContent>
                )}

                <TabsContent value="assets" className="flex-1 overflow-auto data-[state=inactive]:hidden no-scrollbar">
                    <div className="space-y-4 p-1">
                        <AssetList assets={assets} />
                    </div>
                </TabsContent>
            </Tabs>
        </div >
    );
}
