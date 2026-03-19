"use client";

import { Banknote, Calendar, FileText, FolderOpen, ListTodo, Loader2, RotateCcw, Shield, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SystemSettingsNotificationsSectionProps {
    notificationDefaults: Record<string, boolean>;
    updatingNotif: string | null;
    onToggle: (key: string, checked: boolean) => void;
}

export function SystemSettingsNotificationsSection({
    notificationDefaults,
    updatingNotif,
    onToggle,
}: SystemSettingsNotificationsSectionProps) {
    const items = [
        {
            key: "welcome",
            label: "Welcome & Onboarding",
            desc: "Welcome messages when new employees or clients are added",
            icon: <Sparkles className="h-4 w-4 text-amber-500" />,
        },
        {
            key: "project",
            label: "Project Updates",
            desc: "Project status changes, completions, and auto-completion alerts",
            icon: <FolderOpen className="h-4 w-4 text-blue-500" />,
        },
        {
            key: "task",
            label: "Task Notifications",
            desc: "Task assignments, status updates, and comments",
            icon: <ListTodo className="h-4 w-4 text-green-500" />,
        },
        {
            key: "invoice",
            label: "Invoice & Billing",
            desc: "Invoice generation, payment pending, approved, and rejected",
            icon: <FileText className="h-4 w-4 text-cyan-500" />,
        },
        {
            key: "salary",
            label: "Salary & Payroll",
            desc: "Salary payment confirmations sent to employees",
            icon: <Banknote className="h-4 w-4 text-emerald-500" />,
        },
        {
            key: "leave",
            label: "Leave Management",
            desc: "Leave requests, approvals, rejections, and cancellations",
            icon: <Calendar className="h-4 w-4 text-violet-500" />,
        },
        {
            key: "refund",
            label: "Refunds",
            desc: "Refund issued notifications sent to clients",
            icon: <RotateCcw className="h-4 w-4 text-orange-500" />,
        },
        {
            key: "document",
            label: "Document Approvals",
            desc: "Document update requests and admin approvals/rejections",
            icon: <FileText className="h-4 w-4 text-slate-500" />,
        },
        {
            key: "security",
            label: "Security Alerts",
            desc: "Password reset notifications and security warnings",
            icon: <Shield className="h-4 w-4 text-red-500" />,
        },
    ] as const;

    return (
        <>
            <p className="text-xs text-muted-foreground mb-3">
                Toggle notification types on or off. When disabled, no in-app notifications of that type will
                be created for any user across all agencies.
            </p>
            <div className="space-y-1">
                {items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-lg">{item.icon}</span>
                            <div className="min-w-0">
                                <span className="text-sm font-medium text-foreground">{item.label}</span>
                                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                            {updatingNotif === item.key && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            <Switch
                                checked={notificationDefaults[item.key] ?? true}
                                onCheckedChange={(checked) => onToggle(item.key, checked)}
                                disabled={!!updatingNotif}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
