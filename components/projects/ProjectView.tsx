"use client";

import { useState } from "react";
import { Project, Task, User, Transaction, Asset, Service } from "@/lib/db";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProjectFinanceSummary } from "@/components/finance/ProjectFinanceSummary";
// import { TransactionList } from "@/components/finance/TransactionList";
// import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
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
};

export function ProjectView({ project, tasks, users, transactions, assets, categories, currentUser }: ProjectViewProps & { currentUser?: User }) {
    const projectServices = project.services || [];
    const filteredCategories = categories.filter(c => projectServices.includes(c.name));
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager'; // Helper

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                    <div>
                        <h1 className="text-2xl font-bold truncate">{project.name}</h1>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <Badge
                                variant={selectedCategory === "All" ? "secondary" : "outline"}
                                className={`cursor-pointer transition-all ${selectedCategory === "All" ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50" : "hover:bg-accent text-muted-foreground"}`}
                                onClick={() => setSelectedCategory("All")}
                            >
                                All
                            </Badge>
                            {project.services && project.services
                                .filter(svc => categories.some(c => c.name === svc))
                                .map((svc) => (
                                    <Badge
                                        key={svc}
                                        variant={selectedCategory === svc ? "secondary" : "outline"}
                                        className={`cursor-pointer transition-all ${selectedCategory === svc ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50" : "bg-yellow-500/5 text-yellow-600/70 hover:bg-yellow-500/10 border-yellow-500/20"}`}
                                        onClick={() => setSelectedCategory(svc)}
                                    >
                                        {svc}
                                    </Badge>
                                ))}
                        </div>
                    </div>

                    <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="board">Board</TabsTrigger>
                        {isAdmin && <TabsTrigger value="finance">Finance</TabsTrigger>}
                        <TabsTrigger value="assets">Assets</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 min-h-[32px]">
                        <TabsContent value="board" className="mt-0">
                            <div className="flex items-center gap-2">
                                <CreateTaskModal projectId={project.id} />
                                {isAdmin && (
                                    <ProjectSettingsModal
                                        projectId={project.id}
                                        currentClientId={project.clientId}
                                        currentUserId={currentUser?.id}
                                    />
                                )}
                            </div>
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
                        />
                    </div>
                </TabsContent>

                {isAdmin && (
                    <TabsContent value="finance" className="flex-1 overflow-auto data-[state=inactive]:hidden text-left">
                        <div className="container max-w-4xl py-6 space-y-6">
                            <ProjectFinanceSummary project={project} transactions={transactions} />
                            <PaymentSettingsCard project={project} />
                        </div>
                    </TabsContent>
                )}

                <TabsContent value="assets" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                    <div className="space-y-4 p-1">
                        <AssetList assets={assets} />
                    </div>
                </TabsContent>
            </Tabs>
        </div >
    );
}
