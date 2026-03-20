export type OverviewData = {
    totals: { totalRequests: number; totalInputTokens: number; totalOutputTokens: number; totalTokens: number; successCount: number; errorCount: number };
    byFeature: { _id: string; requests: number; totalTokens: number; inputTokens: number; outputTokens: number }[];
    byDay: { _id: string; requests: number; tokens: number }[];
    byProvider: { _id: string; requests: number; totalTokens: number }[];
    days: number;
};

export type AgencyUsage = {
    agencyId: string; agencyName: string; agencySlug: string; plan: string;
    storageUsed: number; storageLimit: number;
    totalRequests: number; totalTokens: number; inputTokens: number; outputTokens: number;
};

export type UserUsage = {
    userId: string; userName: string; userEmail: string; agencyName: string;
    totalRequests: number; totalTokens: number; inputTokens: number; outputTokens: number;
    lastUsed: string | null;
};

export type StorageData = {
    agencyId: string; agencyName: string; agencySlug: string; plan: string;
    storageUsed: number; storageLimit: number;
};

export type Tab = "overview" | "agencies" | "users" | "storage";

export const FEATURE_LABELS: Record<string, string> = {
    "singularity-agent": "Singularity Agent",
    "singularity-chat": "Singularity Chat",
    "ai-explain": "AI Explain",
    "ai-enhance": "AI Enhance",
    "ai-task-chat": "AI Task Chat",
    "ai-chatbot": "AI Chatbot",
    "ai-hour-estimate": "Hour Estimate",
};

export const FEATURE_COLORS: Record<string, { bg: string; text: string; bar: string; ring: string }> = {
    "singularity-agent": { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", bar: "bg-purple-500", ring: "ring-purple-500/20" },
    "singularity-chat": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500", ring: "ring-blue-500/20" },
    "ai-explain": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", ring: "ring-emerald-500/20" },
    "ai-enhance": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", ring: "ring-amber-500/20" },
    "ai-task-chat": { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", bar: "bg-pink-500", ring: "ring-pink-500/20" },
    "ai-chatbot": { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", bar: "bg-cyan-500", ring: "ring-cyan-500/20" },
    "ai-hour-estimate": { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500", ring: "ring-orange-500/20" },
};

export const PROVIDER_COLORS: Record<string, string> = {
    gemini: "#6366f1",
    openai: "#22c55e",
    nvidia: "#84cc16",
    github: "#6b7280",
    groq: "#f97316",
};

export const PLAN_STYLES: Record<string, string> = {
    free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    starter: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    pro: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    enterprise: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
};

export function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
}

export function fmtBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, index)).toFixed(1) + " " + units[index];
}

export function timeAgo(iso: string | null): string {
    if (!iso) return "Never";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function activityStatus(iso: string | null): "active" | "recent" | "inactive" {
    if (!iso) return "inactive";
    const hrs = (Date.now() - new Date(iso).getTime()) / 3600000;
    if (hrs < 24) return "active";
    if (hrs < 168) return "recent";
    return "inactive";
}
