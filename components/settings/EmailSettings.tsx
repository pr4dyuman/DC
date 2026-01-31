"use client";

import { useState, useEffect } from "react";
import { getAgencySettings, updateEmailSettings } from "@/lib/actions";
import { toast } from "sonner";
import { Loader2, Mail, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function EmailSettings() {
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await getAgencySettings();
            if (settings) {
                setEnabled(settings.emailNotificationsEnabled ?? true);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to load email settings", error);
            toast.error("Failed to load settings");
            setLoading(false);
        }
    };

    const handleToggle = async (checked: boolean) => {
        setEnabled(checked); // Optimistic update
        setUpdating(true);
        try {
            await updateEmailSettings(checked);
            toast.success(checked ? "Email notifications enabled" : "Email notifications disabled");
        } catch (error) {
            console.error("Failed to update email settings", error);
            toast.error("Failed to update settings");
            setEnabled(!checked); // Revert
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 rounded-full">
                        <Mail className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                        <CardTitle>Email Notifications Kill Switch</CardTitle>
                        <CardDescription>Control all outgoing system emails.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between space-x-4 rounded-lg border border-red-200/20 bg-background/50 p-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                             <Label htmlFor="email-switch" className="text-base font-medium">
                                Send Emails
                            </Label>
                            {updating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            If disabled, no emails (tasks, invoices, client invites) will be sent by the system.
                        </p>
                        {!enabled && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                <span>System is currently silent.</span>
                            </div>
                        )}
                    </div>
                    <Switch
                        id="email-switch"
                        checked={enabled}
                        onCheckedChange={handleToggle}
                        disabled={updating}
                        className={enabled ? "bg-green-500" : "bg-red-500"}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
