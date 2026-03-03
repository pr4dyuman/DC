"use client";

import { useState } from "react";
import { Project, Task, User, Transaction, Asset, Service, UserPermissions } from "@/lib/types";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
