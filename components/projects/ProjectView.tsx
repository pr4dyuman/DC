"use client";

import { useState } from "react";
import { AlertTriangle, Clock3 } from "lucide-react";
import { Project, Task, User, Transaction, Asset, Service, UserPermissions, getDefaultUserPermissionsForRole } from "@/lib/types";
import { useDateFormat } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectFinanceSummary } from "@/components/finance/ProjectFinanceSummary";
import { TransactionList } from "@/components/finance/TransactionList";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { AssetList } from "@/components/projects/AssetList";
import { AddAssetModal } from "@/components/projects/AddAssetModal";
import { PaymentSettingsCard } from "@/components/projects/PaymentSettingsCard";
import { ProjectServices } from "@/components/projects/ProjectServices";
import { toLocalCalendarDay } from "@/lib/date-utils";
import { getTaskAssigneeIds } from "@/lib/task-assignees";
import type { CurrentUserResult } from "@/lib/actions";

type ProjectViewProps = {
    project: Project;
    tasks: Task[];
    users: User[];
    transactions: Transaction[];
    assets: Asset[];
    categories: Service[];
    permissions?: UserPermissions;
};

export function ProjectView({ project, tasks, users, transactions, assets, categories, currentUser, permissions }: ProjectViewProps & { currentUser?: CurrentUserResult }) {
    const fmt = useDateFormat();
    const { format: formatMoney } = useCurrency();
    const projectServices = project.services || [];
    const matchedCategories = categories.filter(c =>
        c.projectId === project.id && (projectServices.includes(c.id) || projectServices.includes(c.name))
    );
    // Deduplicate by name (case-insensitive); keeps first match per name
    const seenNames = new Set<string>();
    const filteredCategories = matchedCategories.filter(c => {
        const key = c.name.toLowerCase();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
    });
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [showTeamHours, setShowTeamHours] = useState(false);
    const effectivePermissions = permissions ?? getDefaultUserPermissionsForRole(currentUser?.role);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const canAddAssets = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'employee';
    const canDeleteAssets = isAdmin;

    return (
        <div className="h-[calc(100dvh-4rem)] md:h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
            <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden">
                {/* Header: stacks on mobile, single row on md+ */}
                <div className="flex flex-col gap-2 mb-3 md:flex-row md:items-center md:justify-between md:gap-4">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                        <h1 className="text-xl font-bold truncate">{project.name}</h1>
                        {/* Settings gear (mobile only, next to title) */}
                        <div className="flex items-center gap-2 md:hidden shrink-0">
                            {isAdmin && (
                                <ProjectSettingsModal
                                    projectId={project.id}
                                    currentSlug={project.slug}
                                    currentClientId={project.clientId}
                                    currentClientIds={project.clientIds}
                                    currentUserId={currentUser?.id}
                                />
                            )}
                        </div>
                    </div>

                    {/* Tabs + Actions row */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:gap-3 md:shrink-0">
                        <TabsList className="h-9">
                            <TabsTrigger value="board">Board</TabsTrigger>
                            {isAdmin && <TabsTrigger value="finance">Finance</TabsTrigger>}
                            <TabsTrigger value="assets">Assets</TabsTrigger>
                            {isAdmin && <TabsTrigger value="services">Services</TabsTrigger>}
                        </TabsList>

                        <div className="flex items-center gap-2">
                            <TabsContent value="board" className="mt-0">
                                <div className="flex items-center gap-2">
                                    {effectivePermissions.canManageTasks && <CreateTaskModal projectId={project.id} />}
                                    {/* Settings gear (desktop only, in header row) */}
                                    <div className="hidden md:flex">
                                        {isAdmin && (
                                            <ProjectSettingsModal
                                                projectId={project.id}
                                                currentSlug={project.slug}
                                                currentClientId={project.clientId}
                                                currentClientIds={project.clientIds}
                                                currentUserId={currentUser?.id}
                                            />
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="finance" className="mt-0">
                                {isAdmin && <AddTransactionModal projectId={project.id} projectName={project.name} users={users} />}
                            </TabsContent>
                            <TabsContent value="assets" className="mt-0">
                                {canAddAssets && <AddAssetModal projectId={project.id} />}
                            </TabsContent>
                        </div>
                    </div>
                </div>

                {/* Row 2: Stats strip */}
                {(() => {
                    const total = tasks.length;
                    const done = tasks.filter(t => t.status === 'Done').length;
                    const today = toLocalCalendarDay(new Date());
                    const overdueTasks = tasks.filter(t => {
                        if (t.status === 'Done') return false;
                        const dueDate = toLocalCalendarDay(t.dueDate);
                        return !!dueDate && !!today && dueDate < today;
                    }).length;
                    const projectDueDate = toLocalCalendarDay(project.dueDate);
                    const isDue = !!projectDueDate && !!today && projectDueDate < today && project.status !== 'Completed';
                    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                    const completedHours = tasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                    const hoursPct = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
                    return (
                        <div className="mb-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {done}/{total} tasks
                                </span>
                                {overdueTasks > 0 && (
                                    <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {overdueTasks} overdue
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-2">
                                    <Clock3 className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
                                    <span className="text-cyan-500 dark:text-cyan-400 font-semibold">{completedHours}/{totalHours}h</span>
                                    <span className="hidden" aria-hidden="true">
                                    <span className="text-cyan-500 dark:text-cyan-400 font-semibold">⏱ {completedHours}/{totalHours}h</span>
                                    </span>
                                    {totalHours > 0 && (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="inline-block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <span className={`block h-full rounded-full transition-all ${hoursPct === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${hoursPct}%` }} />
                                            </span>
                                            <span className="text-[10px] font-semibold">{hoursPct}%</span>
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setShowTeamHours(v => !v)}
                                        className="text-[10px] font-semibold text-primary hover:underline"
                                    >
                                        {showTeamHours ? 'Hide' : 'Team'}
                                    </button>
                                </span>
                                {project.budget > 0 && <span>Budget: {formatMoney(project.budget)}</span>}
                                {project.dueDate && (
                                    <span className={`inline-flex items-center gap-1 ${isDue ? 'text-red-500 font-semibold' : ''}`}>
                                        Due: {fmt.date(project.dueDate)}
                                        {isDue ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                                    </span>
                                )}
                                <span className="hidden" aria-hidden="true">
                                {project.dueDate && <span className={isDue ? 'text-red-500 font-semibold' : ''}>Due: {fmt.date(project.dueDate)}{isDue ? ' ⚠' : ''}</span>}
                                </span>
                                {project.client && <span className="text-muted-foreground/80">Client: {project.client}</span>}
                            </div>

                            {/* Team Hours Breakdown */}
                            {showTeamHours && (() => {
                                const memberMap = new Map<string, { total: number; completed: number }>();
                                tasks.forEach(t => {
                                    if (!t.estimatedHours || t.estimatedHours <= 0) return;
                                    const assigneeIds = getTaskAssigneeIds(t);
                                    assigneeIds.forEach((assigneeId) => {
                                        if (!memberMap.has(assigneeId)) memberMap.set(assigneeId, { total: 0, completed: 0 });
                                        const entry = memberMap.get(assigneeId)!;
                                        entry.total += t.estimatedHours || 0;
                                        if (t.status === 'Done') entry.completed += t.estimatedHours || 0;
                                    });
                                });
                                const memberArr = Array.from(memberMap.entries())
                                    .map(([id, data]) => ({ id, ...data, user: users.find(u => u.id === id) }))
                                    .sort((a, b) => b.total - a.total);
                                if (memberArr.length === 0) return null;
                                return (
                                    <div className="p-3 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border space-y-2.5 animate-in slide-in-from-top-2 duration-200">
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

                            {/* Service filter badges */}
                            {filteredCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {filteredCategories.map((service) => {
                                        const displayName = service.name;
                                        return (
                                            <button
                                                type="button"
                                                key={service.id}
                                                aria-pressed={selectedCategory === displayName}
                                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${selectedCategory === displayName ? "bg-primary/15 text-primary hover:bg-primary/25 border-primary/30" : "text-muted-foreground hover:bg-muted border-border/50"}`}
                                                onClick={() => setSelectedCategory(displayName)}
                                            >
                                                {displayName}
                                            </button>
                                        );
                                    })}
                                    {selectedCategory !== 'All' && (
                                        <button
                                            type="button"
                                            aria-pressed={selectedCategory === 'All'}
                                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors text-muted-foreground hover:bg-accent border-border/50"
                                            onClick={() => setSelectedCategory('All')}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                <TabsContent value="board" className="flex-1 overflow-hidden data-[state=inactive]:hidden h-full">
                    <div className="h-full overflow-hidden">
                        <KanbanBoard
                            initialTasks={tasks}
                            projectId={project.id}
                            users={users}
                            categories={filteredCategories}
                            currentUserId={currentUser?.id}
                            currentUserRole={currentUser?.role}
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
                        <AssetList assets={assets} canDelete={canDeleteAssets} />
                    </div>
                </TabsContent>

                {isAdmin && (
                    <TabsContent value="services" className="flex-1 overflow-auto data-[state=inactive]:hidden no-scrollbar">
                        <ProjectServices projectId={project.id} users={users} />
                    </TabsContent>
                )}
            </Tabs>
        </div >
    );
}
