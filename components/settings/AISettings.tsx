"use client";

import { useState, useEffect, useCallback } from "react";
import { getAIPermissions, updateAIPermissions } from "@/lib/actions";
import { toast } from "sonner";
import {
    Loader2, DollarSign, FileText, RefreshCcw, UserPlus, Trash2,
    AlertTriangle, ShieldCheck
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { AIPermissions } from "@/lib/types";
import { DEFAULT_AI_PERMISSIONS } from "@/lib/types";

type PermissionItem = {
    key: keyof AIPermissions;
    label: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    danger?: boolean;
};

const PERMISSION_ITEMS: PermissionItem[] = [
    {
        key: "canPayroll",
        label: "Payroll",
        description: "Allow AI to pay employee salaries (single & bulk). Required for importing historical salary data.",
        icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
        iconBg: "bg-emerald-500/10",
    },
    {
        key: "canManageInvoices",
        label: "Invoice Management",
        description: "Allow AI to create invoices in bulk, approve/reject payments, and update invoice status.",
        icon: <FileText className="h-4 w-4 text-blue-500" />,
        iconBg: "bg-blue-500/10",
    },
    {
        key: "canRefund",
        label: "Refunds",
        description: "Allow AI to create refund transactions linked to projects.",
        icon: <RefreshCcw className="h-4 w-4 text-amber-500" />,
        iconBg: "bg-amber-500/10",
    },
    {
        key: "canCreateEmployee",
        label: "Employee Creation",
        description: "Allow AI to onboard new employees with name, email, role, and salary.",
        icon: <UserPlus className="h-4 w-4 text-violet-500" />,
        iconBg: "bg-violet-500/10",
    },
    {
        key: "canDelete",
        label: "Delete Operations",
        description: "Allow AI to delete projects, clients, transactions, and services. Use with extreme caution.",
        icon: <Trash2 className="h-4 w-4 text-red-500" />,
        iconBg: "bg-red-500/10",
        danger: true,
    },
];

export function AISettings() {
    const [permissions, setPermissions] = useState<AIPermissions>(DEFAULT_AI_PERMISSIONS);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    const loadPermissions = useCallback(async () => {
        try {
            const perms = await getAIPermissions();
            setPermissions(perms);
        } catch (error) {
            console.error("Failed to load AI permissions", error);
            toast.error("Failed to load AI permissions");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    const handleToggle = async (key: keyof AIPermissions, checked: boolean) => {
        const prev = { ...permissions };
        const updated = { ...permissions, [key]: checked };

        setPermissions(updated); // Optimistic
        setUpdating(key);

        try {
            await updateAIPermissions(updated);
            const item = PERMISSION_ITEMS.find(p => p.key === key);
            toast.success(`AI ${item?.label || key}: ${checked ? "Enabled" : "Disabled"}`);
        } catch (error) {
            console.error("Failed to update AI permissions", error);
            toast.error("Failed to update permissions");
            setPermissions(prev); // Revert
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const enabledCount = Object.values(permissions).filter(Boolean).length;

    return (
        <div className="space-y-4">
            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${enabledCount > 0
                ? "border-violet-500/20 bg-violet-500/5"
                : "border-muted bg-muted/30"
                }`}>
                <ShieldCheck className={`h-5 w-5 ${enabledCount > 0 ? "text-violet-500" : "text-muted-foreground"}`} />
                <div className="flex-1">
                    <p className="text-sm font-medium">
                        {enabledCount === 0
                            ? "All AI permissions are disabled"
                            : `${enabledCount} of ${PERMISSION_ITEMS.length} permissions enabled`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        These controls determine what actions Singularity can perform. Disabled tools are hidden from the AI entirely.
                    </p>
                </div>
            </div>

            {/* Permission Toggles */}
            <div className="space-y-2">
                {PERMISSION_ITEMS.map((item) => (
                    <div
                        key={item.key}
                        className={`flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors ${item.danger && permissions[item.key]
                            ? "border-red-500/30 bg-red-500/5"
                            : "border-border bg-background/50 hover:bg-background/80"
                            }`}
                    >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-1.5 rounded-md ${item.iconBg} shrink-0 mt-0.5`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Label
                                        htmlFor={`ai-${item.key}`}
                                        className="text-sm font-medium cursor-pointer"
                                    >
                                        {item.label}
                                    </Label>
                                    {updating === item.key && (
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
                                    {item.danger && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
                                            Dangerous
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.description}
                                </p>
                                {item.danger && permissions[item.key] && (
                                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-red-400">
                                        <AlertTriangle className="h-3 w-3" />
                                        AI can permanently delete data when this is enabled.
                                    </div>
                                )}
                            </div>
                        </div>
                        <Switch
                            id={`ai-${item.key}`}
                            checked={permissions[item.key]}
                            onCheckedChange={(checked) => handleToggle(item.key, checked)}
                            disabled={updating !== null}
                            className={permissions[item.key]
                                ? item.danger ? "bg-red-500" : "bg-violet-500"
                                : ""
                            }
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
