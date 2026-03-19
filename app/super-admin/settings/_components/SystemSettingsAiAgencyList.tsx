"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SystemSettingsAiAgencyListProps {
    agencies: Array<{
        id: string;
        name: string;
        aiConfig?: {
            provider?: string;
            model?: string;
        } | null;
    }>;
}

export function SystemSettingsAiAgencyList({
    agencies,
}: SystemSettingsAiAgencyListProps) {
    if (agencies.length === 0) {
        return <p className="text-sm text-muted-foreground">No agencies found.</p>;
    }

    return (
        <div className="divide-y divide-border">
            {agencies.map((agency) => (
                <Link
                    key={agency.id}
                    href={`/super-admin/settings/ai/${agency.id}`}
                    className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/40 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${agency.aiConfig ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                        <div>
                            <span className="text-sm font-medium text-foreground">{agency.name}</span>
                            <p className="text-xs text-muted-foreground">
                                {agency.aiConfig
                                    ? `${agency.aiConfig.provider?.charAt(0).toUpperCase()}${agency.aiConfig.provider?.slice(1)} - ${agency.aiConfig.model || "configured"}`
                                    : "Not configured"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${agency.aiConfig ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                            {agency.aiConfig ? "Active" : "Off"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                    </div>
                </Link>
            ))}
        </div>
    );
}
