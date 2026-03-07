"use client";

import { useState, useEffect } from "react";
import { updateEmailSettings, updateEmailCategorySettings } from "@/lib/actions";
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
    initialCategories?: Record<string, boolean>;
    loading?: boolean;
}

export function EmailSettings({ initialEnabled = true, initialCategories, loading: parentLoading }: EmailSettingsProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [updating, setUpdating] = useState(false);
    const [categories, setCategories] = useState<Record<string, boolean>>(
        initialCategories || { ...DEFAULT_EMAIL_CATEGORIES }
    );
    const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);

    useEffect(() => {
        setEnabled(initialEnabled);
    }, [initialEnabled]);

    useEffect(() => {
        if (initialCategories) {
            setCategories({ ...DEFAULT_EMAIL_CATEGORIES, ...initialCategories });
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
                                <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
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
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
