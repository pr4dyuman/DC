"use client";

import { useState } from "react";
import { Project, Task, User, Transaction, Asset, Category } from "@/lib/db";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { TransactionList } from "@/components/finance/TransactionList";
// import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { AssetList } from "@/components/projects/AssetList";
import { AddAssetModal } from "@/components/projects/AddAssetModal";

type ProjectViewProps = {
    project: Project;
    tasks: Task[];
    users: User[];
    // transactions: Transaction[]; // Removed
    assets: Asset[];
    categories: Category[];
};

export function ProjectView({ project, tasks, users, assets, categories }: ProjectViewProps) {
    const projectServices = project.services || (project.departments ? project.departments : []);
    const filteredCategories = categories.filter(c => projectServices.includes(c.name));

    // Simulate current user as the first user in the list for this mock app
    const currentUser = users.length > 0 ? users[0] : undefined;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                    <h1 className="text-2xl font-bold truncate">Project: {project.client}</h1>

                    <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="board">Board</TabsTrigger>
                        {/* <TabsTrigger value="expenses">Expenses</TabsTrigger> REMOVED */}
                        <TabsTrigger value="assets">Assets</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 min-h-[32px]">
                        <TabsContent value="board" className="mt-0">
                            <div className="flex items-center gap-2">
                                <CreateTaskModal projectId={project.id} />
                                <ProjectSettingsModal
                                    projectId={project.id}
                                    currentClientId={project.clientId}
                                    currentUserId={currentUser?.id}
                                />
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
                        />
                    </div>
                </TabsContent>

                {/* Expenses Tab Content Removed */}

                <TabsContent value="assets" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                    <div className="space-y-4 p-1">
                        <AssetList assets={assets} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
