"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { ContributionHeatmap, DailyStats } from "@/components/team/ContributionHeatmap";
import { Activity as ActivityIcon, AlertCircle, Briefcase, CheckCircle2, Clock, Eye, ListTodo, Zap } from "lucide-react";
import { User } from "@/lib/types";

type ProjectHoursSummary = {
    id: string;
    total: number;
    completed: number;
    projectName: string;
};

interface EmployeeProfileOverviewTabProps {
    userRole: User["role"];
    availableYears: number[];
    selectedYear: number;
    onYearChange: (year: number) => void;
    contributionStats: Record<string, DailyStats>;
    leaveDates: string[];
    activeProjectsCount: number;
    doneTaskCount: number;
    inProgressTaskCount: number;
    reviewTaskCount: number;
    todoTaskCount: number;
    overdueTasks: number;
    completedHours: number;
    inProgressHours: number;
    totalHours: number;
    projectHours: ProjectHoursSummary[];
}

export function EmployeeProfileOverviewTab({
    userRole,
    availableYears,
    selectedYear,
    onYearChange,
    contributionStats,
    leaveDates,
    activeProjectsCount,
    doneTaskCount,
    inProgressTaskCount,
    reviewTaskCount,
    todoTaskCount,
    overdueTasks,
    completedHours,
    inProgressHours,
    totalHours,
    projectHours,
}: EmployeeProfileOverviewTabProps) {
    return (
        <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-1 md:col-span-2 bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <ActivityIcon className="h-5 w-5 text-primary" />
                            Contribution Activity
                        </CardTitle>
                        <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value, 10))}>
                            <SelectTrigger className="w-[100px] h-8 bg-secondary border-border text-xs">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent className="bg-secondary border-border">
                                {availableYears.map((year) => (
                                    <SelectItem key={year} value={year.toString()} className="text-xs focus:bg-muted focus:text-foreground">
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <ContributionHeatmap
                            data={contributionStats}
                            leaveDates={leaveDates}
                            tooltipLabel={userRole === "client" ? "assigned" : "completed"}
                            year={selectedYear}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Quick Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/40 border border-border p-4 rounded-xl flex items-center justify-between group hover:border-muted-foreground/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg text-foreground group-hover:bg-accent transition-colors">
                                    <Briefcase className="h-4 w-4" />
                                </div>
                                <span className="text-muted-foreground font-medium">Active Projects</span>
                            </div>
                            <span className="text-2xl font-bold text-foreground">{activeProjectsCount}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-green-500/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="p-1.5 bg-green-500/20 text-green-500 rounded-lg">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <span className="text-2xl font-bold text-green-500">{doneTaskCount}</span>
                                </div>
                                <span className="text-xs font-medium text-green-500/80 uppercase tracking-wider">Done</span>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-blue-500/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="p-1.5 bg-blue-500/20 text-blue-500 rounded-lg">
                                        <Clock className="h-4 w-4 animate-pulse" />
                                    </div>
                                    <span className="text-2xl font-bold text-blue-500">{inProgressTaskCount}</span>
                                </div>
                                <span className="text-xs font-medium text-blue-500/80 uppercase tracking-wider">In Progress</span>
                            </div>

                            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-purple-500/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="p-1.5 bg-purple-500/20 text-purple-500 rounded-lg">
                                        <Eye className="h-4 w-4" />
                                    </div>
                                    <span className="text-2xl font-bold text-purple-500">{reviewTaskCount}</span>
                                </div>
                                <span className="text-xs font-medium text-purple-500/80 uppercase tracking-wider">Review</span>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col gap-2 hover:bg-amber-500/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="p-1.5 bg-amber-500/20 text-amber-500 rounded-lg">
                                        <ListTodo className="h-4 w-4" />
                                    </div>
                                    <span className="text-2xl font-bold text-amber-500">{todoTaskCount}</span>
                                </div>
                                <span className="text-xs font-medium text-amber-500/80 uppercase tracking-wider">Todo</span>
                            </div>
                        </div>

                        {overdueTasks > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between hover:bg-red-500/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-red-500/20 text-red-500 rounded-lg">
                                        <AlertCircle className="h-4 w-4" />
                                    </div>
                                    <span className="text-red-500 font-medium">Overdue</span>
                                </div>
                                <span className="text-2xl font-bold text-red-500">{overdueTasks}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-cyan-500" />
                            Hours Overview
                        </CardTitle>
                        <CardDescription>
                            {userRole === "client" ? "Total hours across all projects" : "Estimated working hours across assigned tasks"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                <div className="relative w-28 h-28 shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle cx="50" cy="50" r="42" strokeWidth="8" className="fill-none stroke-muted" />
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="42"
                                            strokeWidth="8"
                                            className="fill-none stroke-cyan-500"
                                            strokeLinecap="round"
                                            strokeDasharray={`${totalHours > 0 ? (completedHours / totalHours) * 263.89 : 0} 263.89`}
                                            style={{ transition: "stroke-dasharray 0.8s ease" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-foreground">
                                            {totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0}%
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 w-full sm:w-auto">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-cyan-500">{completedHours}h</div>
                                        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Completed</div>
                                    </div>
                                    <div className="text-center border-x border-border px-3">
                                        <div className="text-2xl font-bold text-blue-500">{inProgressHours}h</div>
                                        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Remaining</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-foreground">{totalHours}h</div>
                                        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Total</div>
                                    </div>
                                </div>
                            </div>

                            {projectHours.length > 0 && (
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">By Project</h4>
                                    <div className="space-y-3">
                                        {projectHours.map((project) => {
                                            const pct = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;
                                            return (
                                                <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block group">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">
                                                            {project.projectName}
                                                        </span>
                                                        <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-2">
                                                            <span className="text-cyan-500">{project.completed}h</span> / {project.total}h
                                                        </span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-cyan-500" : "bg-blue-500"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
