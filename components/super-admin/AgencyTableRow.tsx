"use client";

import Link from "next/link";
import { Ban, CheckCircle, Eye, Loader2, Trash2 } from "lucide-react";
import { getAgencyStatusBadge, type AgencyTableRowData } from "./agency-table-shared";

type AgencyTableRowProps = {
    agency: AgencyTableRowData;
    createdAtLabel: string;
    activating: boolean;
    onNavigate: (agencyId: string) => void;
    onSuspend: (agencyId: string) => void;
    onActivate: (agencyId: string) => void;
    onDelete: (agencyId: string) => void;
};

export function AgencyTableRow({
    agency,
    createdAtLabel,
    activating,
    onNavigate,
    onSuspend,
    onActivate,
    onDelete,
}: AgencyTableRowProps) {
    return (
        <tr
            className="hover:bg-muted/50 cursor-pointer"
            onClick={() => onNavigate(agency.id)}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onNavigate(agency.id);
                }
            }}
            tabIndex={0}
        >
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="font-medium text-foreground">{agency.name}</div>
                    <div className="text-sm text-muted-foreground">{agency.slug}</div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.plan === "enterprise" ? "bg-purple-500/10 text-purple-500" :
                    agency.plan === "pro" ? "bg-blue-500/10 text-blue-500" :
                        agency.plan === "starter" ? "bg-emerald-500/10 text-emerald-500" :
                            "bg-muted text-muted-foreground"
                    }`}>
                    {agency.plan.toUpperCase()}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAgencyStatusBadge(agency.status)}`}>
                    {agency.status}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {agency.stats?.users || 0}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {agency.stats?.projects || 0}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {agency.stats?.clients || 0}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {createdAtLabel}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={`/super-admin/agencies/${agency.id}`}
                        className="text-blue-500 hover:text-blue-400"
                        title="View Details"
                    >
                        <Eye className="w-4 h-4" />
                    </Link>
                    {agency.status === "active" || agency.status === "trial" ? (
                        <button
                            onClick={() => onSuspend(agency.id)}
                            className="text-amber-500 hover:text-amber-400"
                            title="Suspend"
                        >
                            <Ban className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => onActivate(agency.id)}
                            disabled={activating}
                            className="text-green-500 hover:text-green-400 disabled:opacity-50"
                            title="Activate"
                        >
                            {activating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(agency.id)}
                        className="text-red-500 hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
