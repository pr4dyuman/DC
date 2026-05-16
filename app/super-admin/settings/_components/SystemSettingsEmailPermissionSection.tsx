"use client";

import { Loader2, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_PLATFORM_EMAIL_PERMISSIONS, PLATFORM_EMAIL_PERMISSION_INFO } from "@/lib/email-constants";
import type { PlatformEmailPermissionKey } from "@/lib/email-constants";

interface SystemSettingsEmailPermissionSectionProps {
    permissions: Record<PlatformEmailPermissionKey, boolean>;
    updatingEmail: string | null;
    onToggle: (permission: PlatformEmailPermissionKey, checked: boolean) => void;
}

export function SystemSettingsEmailPermissionSection({
    permissions,
    updatingEmail,
    onToggle,
}: SystemSettingsEmailPermissionSectionProps) {
    const permissionEntries = Object.entries(PLATFORM_EMAIL_PERMISSION_INFO) as [
        PlatformEmailPermissionKey,
        typeof PLATFORM_EMAIL_PERMISSION_INFO[PlatformEmailPermissionKey],
    ][];

    return (
        <div className="border-t border-border pt-4">
            <div className="mb-2">
                <p className="text-xs font-medium text-foreground">Platform Email Permissions</p>
                <p className="text-xs text-muted-foreground">
                    These critical email permissions are controlled by super admin only and default to ON.
                </p>
            </div>

            <div className="space-y-1">
                {permissionEntries.map(([key, info]) => {
                    const isOn = permissions[key] ?? DEFAULT_PLATFORM_EMAIL_PERMISSIONS[key];
                    const updatingKey = `permission-${key}`;
                    const isUpdating = updatingEmail === updatingKey;

                    return (
                        <div
                            key={key}
                            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="rounded-md bg-amber-500/10 p-1.5">
                                    <Shield className="h-4 w-4 text-amber-500" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">{info.label}</span>
                                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-500">
                                            critical
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{info.description}</p>
                                </div>
                            </div>
                            <div className="ml-2 flex items-center gap-2">
                                {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                <Switch
                                    checked={isOn}
                                    onCheckedChange={(checked) => onToggle(key, checked)}
                                    disabled={!!updatingEmail}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
