"use client";

import { useState, useEffect } from "react";
import { updateEmailSettings, updateEmailCategorySettings, updateTaskEmailEvents } from "@/lib/actions";
import { toast } from "sonner";
import { Loader2, Mail, AlertTriangle, Shield, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EMAIL_CATEGORY_INFO, DEFAULT_EMAIL_CATEGORIES, TASK_EMAIL_EVENTS, DEFAULT_TASK_EMAIL_EVENTS } from "@/lib/email-constants";
import type { EmailCategory, TaskEmailEventKey, TaskEmailEventConfig } from "@/lib/email-constants";
import type { Agency } from "@/lib/types";

type EmailCategorySettings = NonNullable<Agency["settings"]["emailCategories"]>;

interface EmailSettingsProps {
    initialEnabled?: boolean;
    initialCategories?: EmailCategorySettings;
    loading?: boolean;
}

const DEFAULT_EVENTS = { ...DEFAULT_TASK_EMAIL_EVENTS };

function getCategoryState(initialCategories?: EmailCategorySettings): Record<EmailCategory, boolean> {
    const categories = { ...DEFAULT_EMAIL_CATEGORIES };
    if (!initialCategories) {
        return categories;
    }

    for (const key of Object.keys(DEFAULT_EMAIL_CATEGORIES) as EmailCategory[]) {
        if (typeof initialCategories[key] === "boolean") {
            categories[key] = initialCategories[key];
        }
    }

    return categories;
}

export function EmailSettings({ initialEnabled = true, initialCategories, loading: parentLoading }: EmailSettingsProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [updating, setUpdating] = useState(false);
    const [categories, setCategories] = useState<Record<EmailCategory, boolean>>(() => getCategoryState(initialCategories));
    const [taskEmailEvents, setTaskEmailEvents] = useState<Record<TaskEmailEventKey, TaskEmailEventConfig>>(() => {
        const events = { ...DEFAULT_EVENTS };
        if (initialCategories?.taskEmailEvents) {
            for (const key of Object.keys(events) as TaskEmailEventKey[]) {
                if (initialCategories.taskEmailEvents[key]) {
                    events[key] = { ...events[key], ...initialCategories.taskEmailEvents[key] };
                }
            }
        }
        return events;
    });
    const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
    const [updatingEvent, setUpdatingEvent] = useState<string | null>(null);

    useEffect(() => {
        setEnabled(initialEnabled);
    }, [initialEnabled]);

    useEffect(() => {
        if (initialCategories) {
            setCategories(getCategoryState(initialCategories));
            const initialTaskEmailEvents = initialCategories.taskEmailEvents;
            if (initialTaskEmailEvents) {
                setTaskEmailEvents(prev => {
                    const merged = { ...prev };
                    for (const key of Object.keys(prev) as TaskEmailEventKey[]) {
                        if (initialTaskEmailEvents[key]) {
                            merged[key] = { ...prev[key], ...initialTaskEmailEvents[key] };
                        }
                    }
                    return merged;
                });
            }
        }
    }, [initialCategories]);

    const handleToggle = async (checked: boolean) => {
        setEnabled(checked);
        setUpdating(true);
        try {
            await updateEmailSettings(checked);
            toast.success(checked ? "Email notifications enabled" : "Email notifications disabled");
        } catch (error) {
            console.error("Failed to update email settings", error);
            toast.error("Failed to update settings");
            setEnabled(!checked);
        } finally {
            setUpdating(false);
        }
    };

    const handleCategoryToggle = async (category: string, checked: boolean) => {
        setCategories(prev => ({ ...prev, [category]: checked }));
        setUpdatingCategory(category);
        try {
            await updateEmailCategorySettings({ [category]: checked });
            const info = EMAIL_CATEGORY_INFO[category as EmailCategory];
            toast.success(`${info?.label || category} emails ${checked ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Failed to update category", error);
            toast.error("Failed to update");
            setCategories(prev => ({ ...prev, [category]: !checked }));
        } finally {
            setUpdatingCategory(null);
        }
    };

    const handleEventToggle = async (eventKey: TaskEmailEventKey, field: keyof TaskEmailEventConfig, checked: boolean) => {
        setTaskEmailEvents(prev => ({
            ...prev,
            [eventKey]: { ...prev[eventKey], [field]: checked },
        }));
        setUpdatingEvent(`${eventKey}-${field}`);
        try {
            await updateTaskEmailEvents({ [eventKey]: { [field]: checked } });
            const info = TASK_EMAIL_EVENTS[eventKey];
            toast.success(`${info.label} — ${field === 'enabled' ? (checked ? 'enabled' : 'disabled') : `${field} ${checked ? 'on' : 'off'}`}`);
        } catch (error) {
            console.error("Failed to update event", error);
            toast.error("Failed to update");
            setTaskEmailEvents(prev => ({
                ...prev,
                [eventKey]: { ...prev[eventKey], [field]: !checked },
            }));
        } finally {
            setUpdatingEvent(null);
        }
    };

    if (parentLoading) {
        return <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    const categoryEntries = (Object.entries(EMAIL_CATEGORY_INFO) as [EmailCategory, typeof EMAIL_CATEGORY_INFO[EmailCategory]][])
        .filter(([key]) => key !== "accountCreation");

    return (
        <div className="space-y-4">
            {/* Global Kill Switch */}
            <Card className={enabled ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${enabled ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <Mail className={`h-5 w-5 ${enabled ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-base">Agency Notification Email Service</CardTitle>
                            <CardDescription>Master switch for agency-managed notification emails</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {updating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            <Switch
                                id="email-switch"
                                checked={enabled}
                                onCheckedChange={handleToggle}
                                disabled={updating}
                            />
                        </div>
                    </div>
                    {!enabled && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Agency notification emails are currently disabled.</span>
                        </div>
                    )}
                </CardHeader>
            </Card>

            {/* Per-Category Toggles */}
            {enabled && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Email Categories</CardTitle>
                        <CardDescription>Choose which agency notification email types to send.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {categoryEntries.map(([key, info]) => {
                            const isOn = categories[key] ?? DEFAULT_EMAIL_CATEGORIES[key];
                            const isUpdating = updatingCategory === key;

                            return (
                                <div key={key}>
                                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`p-1.5 rounded-md ${info.priority === 'critical' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                                                {info.priority === 'critical'
                                                    ? <Shield className="h-4 w-4 text-amber-500" />
                                                    : <Zap className="h-4 w-4 text-blue-500" />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-sm font-medium cursor-pointer">{info.label}</Label>
                                                    <Badge variant={info.priority === 'critical' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                                        {info.priority}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                            <Switch
                                                checked={isOn}
                                                onCheckedChange={(checked) => handleCategoryToggle(key, checked)}
                                                disabled={isUpdating}
                                            />
                                        </div>
                                    </div>

                                    {/* Task Email Event Sub-toggles */}
                                    {key === 'taskUpdates' && isOn && (
                                        <div className="ml-12 pl-3 border-l-2 border-blue-500/20 space-y-2 py-1 mb-1">
                                            <p className="text-xs text-muted-foreground mb-1">Configure task email events and recipients:</p>
                                            {(Object.entries(TASK_EMAIL_EVENTS) as [TaskEmailEventKey, typeof TASK_EMAIL_EVENTS[TaskEmailEventKey]][]).map(([eventKey, eventInfo]) => {
                                                const eventConfig = taskEmailEvents[eventKey] || DEFAULT_TASK_EMAIL_EVENTS[eventKey];
                                                return (
                                                    <div key={eventKey} className="rounded-lg bg-muted/20 p-2">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-medium text-foreground">{eventInfo.label}</span>
                                                                <p className="text-[10px] text-muted-foreground">{eventInfo.description}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {updatingEvent === `${eventKey}-enabled` && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                                                <Switch
                                                                    checked={eventConfig.enabled}
                                                                    onCheckedChange={(checked) => handleEventToggle(eventKey, 'enabled', checked)}
                                                                    disabled={!!updatingEvent}
                                                                    className="scale-[0.8]"
                                                                />
                                                            </div>
                                                        </div>
                                                        {eventConfig.enabled && (
                                                            <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                                                                <div className="flex items-center justify-between py-1">
                                                                    <span className="text-[11px] text-muted-foreground">Send to Assignee</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {updatingEvent === `${eventKey}-notifyAssignee` && <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />}
                                                                        <Switch
                                                                            checked={eventConfig.notifyAssignee}
                                                                            onCheckedChange={(checked) => handleEventToggle(eventKey, 'notifyAssignee', checked)}
                                                                            disabled={!!updatingEvent}
                                                                            className="scale-[0.7]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <span className="text-[11px] text-muted-foreground">Send to Project Client</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {updatingEvent === `${eventKey}-notifyClient` && <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />}
                                                                        <Switch
                                                                            checked={eventConfig.notifyClient}
                                                                            onCheckedChange={(checked) => handleEventToggle(eventKey, 'notifyClient', checked)}
                                                                            disabled={!!updatingEvent}
                                                                            className="scale-[0.7]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
