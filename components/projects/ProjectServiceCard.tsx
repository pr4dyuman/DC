"use client";

import { Button } from "@/components/ui/button";
import { Edit2, Loader2, Trash2, Users } from "lucide-react";
import type { ServiceItem } from "./project-services-shared";

type ProjectServiceCardProps = {
    service: ServiceItem;
    isCheckingDelete: boolean;
    getUserName: (userId: string) => string;
    onEdit: (service: ServiceItem) => void;
    onDelete: (service: ServiceItem) => void;
};

export function ProjectServiceCard({
    service,
    isCheckingDelete,
    getUserName,
    onEdit,
    onDelete,
}: ProjectServiceCardProps) {
    return (
        <div className="border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-all border-border hover:border-primary/50 group relative">
            <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-sm">{service.name}</div>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(service)} aria-label={`Edit ${service.name}`} title={`Edit ${service.name}`}>
                        <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled={isCheckingDelete}
                        onClick={() => onDelete(service)}
                        aria-label={`Delete ${service.name}`}
                        title={`Delete ${service.name}`}
                    >
                        {isCheckingDelete ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Users className="h-3.5 w-3.5" />
                {(service.employees || []).length} Employee{(service.employees || []).length !== 1 ? "s" : ""}
            </div>

            {(service.employees || []).length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {(service.employees || []).map((employeeId) => (
                        <span key={employeeId} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[11px] font-medium">
                            {getUserName(employeeId)}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="text-xs text-muted-foreground italic">No employees assigned</div>
            )}
        </div>
    );
}
