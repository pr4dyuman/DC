import type { User as AppUser } from "@/lib/types";
import {
    AlertCircle,
    CheckCircle2,
    Circle,
    Timer,
    type LucideIcon,
} from "lucide-react";

export type TaskAssignee = Pick<AppUser, "id" | "name" | "avatar" | "jobTitle" | "role"> & {
    email?: string;
};

export type ViewTaskCurrentUser = {
    id: string;
    name: string;
    avatar?: string;
};

export type TaskStatusConfig = {
    color: string;
    icon: LucideIcon;
};

export const PRIORITY_STYLES: Record<string, string> = {
    High: "bg-red-500/15 text-red-500 border-red-500/30",
    Medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    Low: "bg-blue-500/15 text-blue-500 border-blue-500/30",
};

export const STATUS_CONFIGS: Record<string, TaskStatusConfig> = {
    Done: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    "In Progress": { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", icon: Timer },
    Review: { color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30", icon: AlertCircle },
    Todo: { color: "bg-muted text-muted-foreground border-border", icon: Circle },
};
