import type { Activity, Project, Task, User } from "@/lib/types";
import type { DailyStats } from "@/components/team/ContributionHeatmap";
import { toLocalCalendarDay } from "@/lib/date-utils";

export function isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === "Done") return false;
    const today = toLocalCalendarDay(new Date());
    const dueDate = toLocalCalendarDay(task.dueDate);
    return !!today && !!dueDate && dueDate < today;
}

export function calculateStreak(contributionStats: Record<string, DailyStats>): number {
    const today = new Date();
    let streak = 0;
    const checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (contributionStats[dateStr] && contributionStats[dateStr].count > 0) {
            streak++;
        } else if (i > 0) {
            break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
}

export function downloadVCard(user: User) {
    const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${user.name}`,
        `EMAIL:${user.email}`,
    ];

    if (user.contactNumber) lines.push(`TEL:${user.contactNumber}`);
    if (user.jobTitle) lines.push(`TITLE:${user.jobTitle}`);
    lines.push("END:VCARD");

    const blob = new Blob([lines.join("\n")], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${user.name.replace(/\s+/g, "_")}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
}

export function getAvailableYears(createdAt?: string | Date | null): number[] {
    const currentYear = new Date().getFullYear();
    const joinYear = createdAt
        ? new Date(createdAt).getFullYear()
        : currentYear;
    const years: number[] = [];

    for (let year = currentYear; year >= joinYear; year--) {
        years.push(year);
    }

    return years;
}

export function getFilteredTasks(
    tasks: Task[],
    statusFilter: string,
    search: string,
    sortBy: string,
): Task[] {
    return tasks
        .filter((task) => {
            const matchesStatus = statusFilter === "all" ? true : task.status === statusFilter;
            const matchesSearch = search.trim()
                ? task.title.toLowerCase().includes(search.toLowerCase())
                    || task.description?.toLowerCase().includes(search.toLowerCase())
                : true;

            return matchesStatus && matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === "priority") {
                const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
                return (order[a.priority || "Medium"] ?? 1) - (order[b.priority || "Medium"] ?? 1);
            }

            if (sortBy === "dueDate") {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return (toLocalCalendarDay(a.dueDate)?.getTime() ?? 0) - (toLocalCalendarDay(b.dueDate)?.getTime() ?? 0);
            }

            if (sortBy === "newest") {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            }

            return 0;
        });
}

export function buildContributionStats(
    userRole: User["role"] | undefined,
    tasks: Task[],
    clientCreatedTasks: Task[],
    contributionHistory: Activity[],
): Record<string, DailyStats> {
    const stats: Record<string, DailyStats> = {};

    const getDay = (dateStr: string) => {
        if (!stats[dateStr]) {
            stats[dateStr] = { date: dateStr, count: 0 };
        }
        return stats[dateStr];
    };

    if (userRole === "client") {
        clientCreatedTasks.forEach((task) => {
            if (task.createdAt) {
                const dateStr = task.createdAt.split("T")[0];
                const day = getDay(dateStr);
                day.count++;
            }
        });
        return stats;
    }

    const countedTitles = new Set<string>();
    const doneTitles = new Set(
        tasks
            .filter((task) => task.status === "Done")
            .map((task) => task.title.toLowerCase().trim()),
    );

    const taskCompletionTimes = new Map<string, string>();

    contributionHistory.forEach((activity) => {
        const action = activity.action.toLowerCase();
        const title = activity.target.toLowerCase().trim();

        if (
            doneTitles.has(title)
            && (action.includes("done") || action.includes("completed") || action.includes("fixed") || action.includes("finished"))
        ) {
            const currentStored = taskCompletionTimes.get(title);
            if (!currentStored || activity.timestamp > currentStored) {
                taskCompletionTimes.set(title, activity.timestamp);
            }
        }
    });

    taskCompletionTimes.forEach((timestamp, title) => {
        const dateStr = timestamp.split("T")[0];
        const day = getDay(dateStr);
        day.count++;
        countedTitles.add(title);
    });

    tasks
        .filter((task) => task.status === "Done")
        .forEach((task) => {
            const titleKey = task.title.toLowerCase().trim();
            if (!countedTitles.has(titleKey)) {
                const timestamp = task.updatedAt || task.createdAt;
                if (timestamp) {
                    const dateStr = typeof timestamp === "string"
                        ? timestamp.split("T")[0]
                        : new Date(timestamp).toISOString().split("T")[0];
                    const day = getDay(dateStr);
                    day.count++;
                    countedTitles.add(titleKey);
                }
            }
        });

    return stats;
}

export function groupActivitiesByDate(
    activities: Activity[],
    formatDateLong: (value: string | Date) => string,
): Array<{ label: string; items: Activity[] }> {
    const groups: Array<{ label: string; items: Activity[] }> = [];
    let currentLabel = "";
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    activities.forEach((activity) => {
        const dateStr = new Date(activity.timestamp).toDateString();
        let label: string;

        if (dateStr === today) label = "Today";
        else if (dateStr === yesterday) label = "Yesterday";
        else label = formatDateLong(activity.timestamp);

        if (label !== currentLabel) {
            currentLabel = label;
            groups.push({ label, items: [] });
        }

        groups[groups.length - 1].items.push(activity);
    });

    return groups;
}

export function summarizeEmployeeProfile(tasks: Task[], userProjects: Project[]) {
    const completedTasks = tasks.filter((task) => task.status === "Done").length;
    const overdueTasks = tasks.filter((task) => isOverdue(task)).length;
    const efficiency = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : null;
    const activeProjectsCount = userProjects.filter((project) => project.status === "Active").length;
    const inProgressTaskCount = tasks.filter((task) => task.status === "In Progress").length;
    const reviewTaskCount = tasks.filter((task) => task.status === "Review").length;
    const todoTaskCount = tasks.filter((task) => task.status === "Todo").length;

    const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const completedHours = tasks
        .filter((task) => task.status === "Done")
        .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const inProgressHours = totalHours - completedHours;

    const projectHoursMap = new Map<string, { total: number; completed: number; projectName: string }>();
    tasks.forEach((task) => {
        if (!task.estimatedHours || task.estimatedHours <= 0) return;
        const key = task.projectId;
        if (!projectHoursMap.has(key)) {
            const project = userProjects.find((item) => item.id === key);
            projectHoursMap.set(key, {
                total: 0,
                completed: 0,
                projectName: project?.name || "Unknown Project",
            });
        }

        const entry = projectHoursMap.get(key);
        if (!entry) return;

        entry.total += task.estimatedHours;
        if (task.status === "Done") {
            entry.completed += task.estimatedHours;
        }
    });

    const projectHoursArray = Array.from(projectHoursMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.total - a.total);

    return {
        completedTasks,
        overdueTasks,
        efficiency,
        activeProjectsCount,
        inProgressTaskCount,
        reviewTaskCount,
        todoTaskCount,
        totalHours,
        completedHours,
        inProgressHours,
        projectHoursArray,
    };
}
