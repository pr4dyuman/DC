"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SystemSettingsEmailGlobalControlsProps {
    emailGlobalEnabled: boolean;
    updatingEmail: string | null;
    onToggle: (checked: boolean) => void;
}

export function SystemSettingsEmailGlobalControls({
    emailGlobalEnabled,
    updatingEmail,
    onToggle,
}: SystemSettingsEmailGlobalControlsProps) {
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Global Email Service</span>
                    {updatingEmail === "global" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
                <Switch
                    checked={emailGlobalEnabled}
                    onCheckedChange={onToggle}
                    disabled={updatingEmail === "global"}
                />
            </div>

            {!emailGlobalEnabled && (
                <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-400">
                        <strong>All emails disabled.</strong> No emails will be sent across the platform.
                    </div>
                </div>
            )}

            {emailGlobalEnabled && (
                <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200/80">
                        <strong>Brevo Free Tier:</strong> 300 emails/day. Critical categories (credentials, payments) are recommended to stay ON.
                    </div>
                </div>
            )}
        </>
    );
}
