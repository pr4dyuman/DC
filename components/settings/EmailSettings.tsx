"use client";

import { useState, useEffect } from "react";
import { updateEmailSettings, updateEmailCategorySettings, updateTaskEmailPriorities } from "@/lib/actions";
import { toast } from "sonner";
import { Loader2, Mail, AlertTriangle, Shield, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EMAIL_CATEGORY_INFO, DEFAULT_EMAIL_CATEGORIES } from "@/lib/email-constants";
import type { EmailCategory } from "@/lib/email-constants";

interface EmailSettingsProps {
    initialEnabled?: boolean;
    initialCategories?: Record<string, any>;
    loading?: boolean;
}

const DEFAULT_TASK_PRIORITIES = { high: true, medium: false, low: false };

export function EmailSettings({ initialEnabled = true, initialCategories, loading: parentLoading }: EmailSettingsProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [updating, setUpdating] = useState(false);
    const [categories, setCategories] = useState<Record<string, boolean>>(
        initialCategories || { ...DEFAULT_EMAIL_CATEGORIES }
    );
    const [taskPriorities, setTaskPriorities] = useState<Record<string, boolean>>(
        initialCategories?.taskEmailPriorities || { ...DEFAULT_TASK_PRIORITIES }
    );
    const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
    const [updatingPriority, setUpdatingPriority] = useState<string | null>(null);

    useEffect(() => {
        setEnabled(initialEnabled);
    }, [initialEnabled]);

    useEffect(() => {
        if (initialCategories) {
            setCategories({ ...DEFAULT_EMAIL_CATEGORIES, ...initialCategories });
            if (initialCategories.taskEmailPriorities) {
                setTaskPriorities({ ...DEFAULT_TASK_PRIORITIES, ...initialCategories.taskEmailPriorities });
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

    const handlePriorityToggle = async (priority: string, checked: boolean) => {
        setTaskPriorities(prev => ({ ...prev, [priority]: checked }));
        setUpdatingPriority(priority);
        try {
            await updateTaskEmailPriorities({ [priority]: checked });
            toast.success(`${priority.charAt(0).toUpperCase() + priority.slice(1)} priority task emails ${checked ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Failed to update priority", error);
            toast.error("Failed to update");
            setTaskPriorities(prev => ({ ...prev, [priority]: !checked }));
        } finally {
            setUpdatingPriority(null);
        }
    };

    if (parentLoading) {
        return <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    const categoryEntries = Object.entries(EMAIL_CATEGORY_INFO) as [EmailCategory, typeof EMAIL_CATEGORY_INFO[EmailCategory]][];

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
                            <CardTitle className="text-base">Email Service</CardTitle>
                            <CardDescription>Master switch for all outgoing emails</CardDescription>
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
                            <span>All emails are currently disabled. No emails will be sent.</span>
                        </div>
                    )}
                </CardHeader>
            </Card>

            {/* Per-Category Toggles */}
            {enabled && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Email Categories</CardTitle>
                        <CardDescription>Choose which email types to send. Critical emails are recommended to stay ON.</CardDescription>
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

                                    {/* Task Priority Sub-toggles */}
                                    {key === 'taskUpdates' && isOn && (
                                        <div className="ml-12 pl-3 border-l-2 border-blue-500/20 space-y-1 py-1 mb-1">
                                            <p className="text-xs text-muted-foreground mb-1">Send emails by task priority:</p>
                                            {([['high', 'High', 'bg-red-500'], ['medium', 'Medium', 'bg-yellow-500'], ['low', 'Low', 'bg-green-500']] as const).map(([pKey, pLabel, pColor]) => {
                                                const pOn = taskPriorities[pKey] ?? DEFAULT_TASK_PRIORITIES[pKey as keyof typeof DEFAULT_TASK_PRIORITIES];
                                                const pUpdating = updatingPriority === pKey;
                                                return (
                                                    <div key={pKey} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${pColor}`} />
                                                            <span className="text-xs font-medium">{pLabel} Priority</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {pUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                                            <Switch
                                                                checked={pOn}
                                                                onCheckedChange={(checked) => handlePriorityToggle(pKey, checked)}
                                                                disabled={pUpdating}
                                                                className="scale-[0.8]"
                                                            />
                                                        </div>
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
