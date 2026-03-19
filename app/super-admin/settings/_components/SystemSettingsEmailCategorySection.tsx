"use client";

import { Loader2, Shield, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EMAIL_CATEGORY_INFO, DEFAULT_EMAIL_CATEGORIES, TASK_EMAIL_EVENTS, DEFAULT_TASK_EMAIL_EVENTS } from "@/lib/email-constants";
import type { EmailCategory, TaskEmailEventKey, TaskEmailEventConfig } from "@/lib/email-constants";

interface SystemSettingsEmailCategorySectionProps {
    emailGlobalEnabled: boolean;
    emailCategories: Record<string, boolean>;
    taskEmailEvents: Record<TaskEmailEventKey, TaskEmailEventConfig>;
    updatingEmail: string | null;
    onCategoryToggle: (category: string, checked: boolean) => void;
    onTaskEventToggle: (eventKey: TaskEmailEventKey, field: keyof TaskEmailEventConfig, checked: boolean) => void;
}

export function SystemSettingsEmailCategorySection({
    emailGlobalEnabled,
    emailCategories,
    taskEmailEvents,
    updatingEmail,
    onCategoryToggle,
    onTaskEventToggle,
}: SystemSettingsEmailCategorySectionProps) {
    if (!emailGlobalEnabled) {
        return null;
    }

    return (
        <div className="space-y-1">
            {(Object.entries(EMAIL_CATEGORY_INFO) as [EmailCategory, typeof EMAIL_CATEGORY_INFO[EmailCategory]][]).map(([key, info]) => {
                const isOn = emailCategories[key] ?? DEFAULT_EMAIL_CATEGORIES[key];
                const isUpdating = updatingEmail === key;

                return (
                    <div key={key}>
                        <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`p-1.5 rounded-md ${info.priority === "critical" ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                                    {info.priority === "critical"
                                        ? <Shield className="h-4 w-4 text-amber-500" />
                                        : <Zap className="h-4 w-4 text-blue-500" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">{info.label}</span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0 rounded-full border ${info.priority === "critical"
                                                ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                                                : "border-blue-500/30 text-blue-500 bg-blue-500/10"
                                                }`}
                                        >
                                            {info.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                                {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                <Switch
                                    checked={isOn}
                                    onCheckedChange={(checked) => onCategoryToggle(key, checked)}
                                    disabled={!!updatingEmail}
                                />
                            </div>
                        </div>

                        {key === "taskUpdates" && isOn && (
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
                                                    {updatingEmail === `event-${eventKey}-enabled` && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                                    <Switch
                                                        checked={eventConfig.enabled}
                                                        onCheckedChange={(checked) => onTaskEventToggle(eventKey, "enabled", checked)}
                                                        disabled={!!updatingEmail}
                                                        className="scale-[0.8]"
                                                    />
                                                </div>
                                            </div>
                                            {eventConfig.enabled && (
                                                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                                                    <div className="flex items-center justify-between py-1">
                                                        <span className="text-[11px] text-muted-foreground">Notify Assignee</span>
                                                        <div className="flex items-center gap-2">
                                                            {updatingEmail === `event-${eventKey}-notifyAssignee` && <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />}
                                                            <Switch
                                                                checked={eventConfig.notifyAssignee}
                                                                onCheckedChange={(checked) => onTaskEventToggle(eventKey, "notifyAssignee", checked)}
                                                                disabled={!!updatingEmail}
                                                                className="scale-[0.7]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between py-1">
                                                        <span className="text-[11px] text-muted-foreground">Notify Project Client</span>
                                                        <div className="flex items-center gap-2">
                                                            {updatingEmail === `event-${eventKey}-notifyClient` && <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />}
                                                            <Switch
                                                                checked={eventConfig.notifyClient}
                                                                onCheckedChange={(checked) => onTaskEventToggle(eventKey, "notifyClient", checked)}
                                                                disabled={!!updatingEmail}
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
        </div>
    );
}
