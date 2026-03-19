"use client";

import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SystemSettingsEmailAdminSectionProps {
    notifications: {
        emailOnAgencyCreated: boolean;
        emailOnAgencySuspended: boolean;
        weeklySummary: boolean;
    };
    updatingEmail: string | null;
    onToggle: (key: string, checked: boolean) => void;
}

export function SystemSettingsEmailAdminSection({
    notifications,
    updatingEmail,
    onToggle,
}: SystemSettingsEmailAdminSectionProps) {
    const alertItems = [
        { key: "emailOnAgencyCreated", label: "New agency created", desc: "Get notified when a new agency registers on the platform" },
        { key: "emailOnAgencySuspended", label: "Agency suspended", desc: "Get notified when an agency is suspended" },
        { key: "weeklySummary", label: "Weekly summary report", desc: "Receive a weekly summary of platform activity (coming soon)", disabled: true },
    ] as const;

    return (
        <>
            <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-medium text-foreground">Super-Admin Email Alerts</p>
                <p className="text-xs text-muted-foreground mb-2">Receive email notifications for important platform events.</p>
                <div className="space-y-1">
                    {alertItems.map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="min-w-0">
                                <span className="text-sm font-medium text-foreground">{item.label}</span>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                                {updatingEmail === `sa-${item.key}` && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                <Switch
                                    checked={notifications[item.key]}
                                    onCheckedChange={(checked) => onToggle(item.key, checked)}
                                    disabled={!!updatingEmail || ("disabled" in item && item.disabled)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-medium text-foreground">Anti-Spam Setup (DNS)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["SPF Record", "DKIM Signing", "DMARC Policy"].map((dns) => (
                        <div key={dns} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{dns}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Configure these in your Brevo dashboard{" > "}Settings{" > "}Senders & Domains{" > "}Authenticate domain
                </p>
            </div>
        </>
    );
}
