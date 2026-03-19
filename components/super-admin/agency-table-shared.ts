import type { Agency } from "@/lib/types";

export type AgencyTableRowData = Agency & {
    stats?: {
        users?: number;
        projects?: number;
        clients?: number;
    };
};

export function getAgencyStatusBadge(status: string): string {
    const map: Record<string, string> = {
        active: "bg-green-500/10 text-green-500",
        trial: "bg-blue-500/10 text-blue-500",
        suspended: "bg-red-500/10 text-red-500",
        cancelled: "bg-muted text-muted-foreground",
    };

    return map[status] || "bg-muted text-muted-foreground";
}
