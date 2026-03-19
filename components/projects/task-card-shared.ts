export const STATUS_ORDER = ["Todo", "In Progress", "Review", "Done"] as const;

export type TaskPriority = "Low" | "Medium" | "High";

export const PRIORITY_CYCLE: TaskPriority[] = ["Low", "Medium", "High"];

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
    High: "bg-red-500/15 text-red-500 hover:bg-red-500/25",
    Medium: "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25",
    Low: "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25",
};

export type TaskAssignee = {
    id: string;
    name: string;
    avatar?: string;
    jobTitle?: string;
    role?: string;
};
