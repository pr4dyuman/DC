"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    Bot,
    CalendarClock,
    CheckCircle2,
    Globe2,
    Loader2,
    PencilLine,
    Play,
    Save,
    SearchCheck,
    Settings2,
    Sparkles,
    Target,
    Trash2,
    BarChart3,
} from "lucide-react";
import { toast } from "sonner";

import {
    createBlogStudioSchedule,
    deleteBlogStudioSchedule,
    runBlogStudioScheduleNow,
    testBlogStudioWebhookTarget,
    updateBlogStudioSchedule,
    updateBlogStudioScheduleStatus,
    upsertBlogStudioSettings,
} from "@/lib/actions";
import type {
    BlogStudioInputMode,
    BlogStudioPerformanceSyncStatus,
    BlogStudioPublishMode,
    BlogStudioRun,
    BlogStudioSchedule,
    BlogStudioScheduleCadence,
    BlogStudioScheduleStatus,
    BlogStudioSettings,
    BlogStudioTargetType,
} from "@/lib/types";
import {
    formatBlogStudioDate,
    getBlogStudioPublishModeLabel,
    getBlogStudioSourceLabel,
    getBlogStudioTargetTypeLabel,
    humanizeBlogStudioValue,
} from "@/lib/ai-blogger-presentation";
import {
    AIBloggerGlassCard,
    AIBloggerGradientButton,
    AIBloggerSectionEyebrow,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { AIBloggerPerformanceSyncCard } from "@/components/ai-blogger/AIBloggerPerformanceSyncCard";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { WebhookDocumentationModal } from "@/components/ai-blogger/WebhookDocumentationModal";
import { SearchConsoleOAuthButton } from "@/components/ai-blogger/SearchConsoleOAuthButton";
import { SessionDebugWidget } from "@/components/ai-blogger/SessionDebugWidget";

type AIBloggerSettingsWorkspaceProps = {
    settings: BlogStudioSettings;
    schedules: BlogStudioSchedule[];
    syncStatus: BlogStudioPerformanceSyncStatus;
    runs: BlogStudioRun[];
    showQuickActions?: boolean;
    generateHref?: string;
    postsHref?: string;
};

const SETTINGS_ACTION_REFRESH_LOCK_MS = 2500;

type WebhookHealthcheckState = {
    success: boolean;
    message: string;
    statusCode?: number;
    checkedAt: string;
};

const tabItems = [
    { value: "brand", label: "Brand Voice", icon: Bot },
    { value: "publishing", label: "Publishing", icon: Target },
    { value: "seo", label: "SEO Rules", icon: SearchCheck },
    { value: "search-console", label: "Search Console", icon: BarChart3 },
    { value: "automation", label: "Automation", icon: CalendarClock },
] as const;

function splitCommaList(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function toDateTimeLocalValue(iso?: string | Date) {
    if (!iso) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(10, 0, 0, 0);
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function getScheduleSourcePlaceholder(mode: BlogStudioInputMode) {
    if (mode === "website") return "Enter website URL";
    if (mode === "trending") return "Trend angle or market shift";
    return "Keyword cluster or campaign phrase";
}

function getScheduleSourceHint(mode: BlogStudioInputMode) {
    if (mode === "website") {
        return "Use the website URL. You can add a separate trend angle below to blend timely topics into website-led generation.";
    }

    if (mode === "trending") {
        return "Use a timely angle, launch, event, or market change that should drive the topic.";
    }

    return "Use a keyword cluster or offer theme for recurring evergreen content.";
}

function isValidHttpsUrl(value: string) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "https:";
    } catch {
        return false;
    }
}

function validatePublishingForm(input: {
    defaultTargetType: BlogStudioTargetType;
    defaultTargetLabel: string;
    webhookUrl: string;
    webhookActive: boolean;
    webhookRetryAttempts: string;
    webhookTimeout: string;
    webhookSecret: string;
    webhookHasSecret: boolean;
}) {
    if (!input.defaultTargetLabel.trim()) {
        return "Add a target label so the publishing destination is easy to recognize.";
    }

    if (input.defaultTargetType !== "webhook") {
        return null;
    }

    if (!isValidHttpsUrl(input.webhookUrl.trim())) {
        return "Enter a valid HTTPS webhook URL before saving publishing settings.";
    }

    const retryAttempts = Number.parseInt(input.webhookRetryAttempts, 10);
    if (!Number.isFinite(retryAttempts) || retryAttempts < 1 || retryAttempts > 5) {
        return "Retry attempts must be a whole number between 1 and 5.";
    }

    const timeout = Number.parseInt(input.webhookTimeout, 10);
    if (!Number.isFinite(timeout) || timeout < 5 || timeout > 30) {
        return "Webhook timeout must be a whole number between 5 and 30 seconds.";
    }

    if (input.webhookActive && !input.webhookSecret.trim() && !input.webhookHasSecret) {
        return "Add a webhook secret before enabling webhook delivery.";
    }

    return null;
}

function validateScheduleForm(input: {
    scheduleName: string;
    scheduleStatus: BlogStudioScheduleStatus;
    scheduleSourceMode: BlogStudioInputMode;
    scheduleSourceValue: string;
    scheduleTargetLabel: string;
    scheduleNextRunAt: string;
}) {
    if (!input.scheduleName.trim()) {
        return "Add a schedule name so your team can recognize this automation.";
    }

    if (!input.scheduleTargetLabel.trim()) {
        return "Add a target label for the schedule destination.";
    }

    if (!input.scheduleSourceValue.trim()) {
        return input.scheduleSourceMode === "website"
            ? "Add the website URL this schedule should analyze."
            : input.scheduleSourceMode === "trending"
                ? "Add the trend angle or market shift this schedule should follow."
                : "Add the keyword cluster this schedule should generate from.";
    }

    if (input.scheduleSourceMode === "website" && !isValidHttpsUrl(input.scheduleSourceValue.trim())) {
        return "Use a valid HTTPS website URL for website-led schedules.";
    }

    if (input.scheduleStatus === "active") {
        if (!input.scheduleNextRunAt) {
            return "Active schedules need a future next run time.";
        }

        const nextRunDate = new Date(input.scheduleNextRunAt);
        if (Number.isNaN(nextRunDate.getTime()) || nextRunDate.getTime() <= Date.now()) {
            return "Active schedules need a next run time in the future.";
        }
    }

    return null;
}

function getScheduleFormStateMessage(status: BlogStudioScheduleStatus, nextRunAt: string) {
    if (status !== "active") {
        return {
            toneClass: "border-border/60 bg-background/60 text-muted-foreground",
            icon: CalendarClock,
            message: "Draft and paused schedules can be saved without running immediately.",
        };
    }

    if (!nextRunAt) {
        return {
            toneClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            icon: AlertTriangle,
            message: "Active schedules get a default next run time if this field is left blank.",
        };
    }

    const date = new Date(nextRunAt);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        return {
            toneClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            icon: AlertTriangle,
            message: "Active schedules need a future next run time.",
        };
    }

    return {
        toneClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        icon: CheckCircle2,
        message: "The next run time is valid for the scheduler.",
    };
}

function getScheduleHealthState(schedule: BlogStudioSchedule, latestRun?: BlogStudioRun) {
    if (latestRun?.status === "failed") {
        return {
            toneClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            label: schedule.status === "active" ? "Retry queued" : "Last run failed",
            message:
                schedule.status === "active" && schedule.nextRunAt
                    ? `${latestRun.summary || "The latest automation attempt failed."} Retry scheduled for ${formatBlogStudioDate(schedule.nextRunAt, true)}.`
                    : latestRun.summary || "The latest automation attempt failed.",
        };
    }

    if (schedule.status === "active" && !schedule.nextRunAt) {
        return {
            toneClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            label: "Needs scheduling",
            message: "Active schedules need a future next run time.",
        };
    }

    if (schedule.status === "active" && schedule.nextRunAt) {
        const nextRunDate = new Date(schedule.nextRunAt);
        if (!Number.isNaN(nextRunDate.getTime()) && nextRunDate.getTime() <= Date.now()) {
            return {
                toneClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                label: "Overdue",
                message: "This schedule is due now and waiting for the runner.",
            };
        }
    }

    if (schedule.status === "paused") {
        return {
            toneClass: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
            label: "Paused",
            message: "Automation is stopped until you reactivate this schedule.",
        };
    }

    if (schedule.status === "draft") {
        return {
            toneClass: "border-border/60 bg-background/60 text-muted-foreground",
            label: "Draft only",
            message: "This brief is saved but will not run until it is activated.",
        };
    }

    if (latestRun?.status === "completed") {
        return {
            toneClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            label: "Healthy",
            message: latestRun.summary || "The latest automation attempt completed successfully.",
        };
    }

    return {
        toneClass: "border-border/60 bg-background/60 text-muted-foreground",
        label: "Ready",
        message: "This schedule is configured and ready for the next run window.",
    };
}

function getScheduleLockState(schedule: BlogStudioSchedule) {
    if (!schedule.lockedUntil) {
        return {
            isLocked: false,
            label: "",
        };
    }

    const lockedUntil = new Date(schedule.lockedUntil);
    if (Number.isNaN(lockedUntil.getTime()) || lockedUntil.getTime() <= Date.now()) {
        return {
            isLocked: false,
            label: "",
        };
    }

    return {
        isLocked: true,
        label: `Run in progress until ${formatBlogStudioDate(schedule.lockedUntil, true)}`,
    };
}

export function AIBloggerSettingsWorkspace({
    settings,
    schedules,
    syncStatus,
    runs,
    showQuickActions = true,
    generateHref = "/dashboard/ai-blogger/generate",
    postsHref = "/dashboard/ai-blogger/posts",
}: AIBloggerSettingsWorkspaceProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingAction, setPendingAction] = useState("");
    const hasPendingAction = pendingAction !== "" || isPending;
    const [deleteTarget, setDeleteTarget] = useState<BlogStudioSchedule | null>(null);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [oauthRefreshKey, setOAuthRefreshKey] = useState(0);

    const [bannedTerms, setBannedTerms] = useState(settings.brandVoice.bannedTerms.join(", "));

    const [defaultTargetType, setDefaultTargetType] = useState<BlogStudioTargetType>(settings.publishing.defaultTarget.type);
    const [defaultTargetLabel, setDefaultTargetLabel] = useState(settings.publishing.defaultTarget.label);
    const [webhookUrl, setWebhookUrl] = useState(settings.publishing.defaultTarget.webhookConfig?.url || "");
    const [webhookActive, setWebhookActive] = useState(settings.publishing.defaultTarget.webhookConfig?.active || false);
    const [webhookRetryAttempts, setWebhookRetryAttempts] = useState(String(settings.publishing.defaultTarget.webhookConfig?.retryAttempts || 3));
    const [webhookTimeout, setWebhookTimeout] = useState(String(settings.publishing.defaultTarget.webhookConfig?.timeout || 10));
    const [webhookSecret, setWebhookSecret] = useState("");
    const [publishMode, setPublishMode] = useState<BlogStudioPublishMode>(settings.publishing.publishMode);
    const [requireApproval, setRequireApproval] = useState(settings.publishing.requireApproval);
    const [autoSchedule, setAutoSchedule] = useState(settings.publishing.autoSchedule);
    const webhookSecretMasked = settings.publishing.defaultTarget.webhookConfig?.secretMasked || "";
    const webhookHasSecret = Boolean(settings.publishing.defaultTarget.webhookConfig?.hasSecret);
    const [webhookHealthcheck, setWebhookHealthcheck] = useState<WebhookHealthcheckState | null>(null);
    const savedWebhookStatus = settings.publishing.defaultTarget.webhookConfig?.lastStatus;
    const savedWebhookLastSentAt = settings.publishing.defaultTarget.webhookConfig?.lastSentAt;
    const savedWebhookLastError = settings.publishing.defaultTarget.webhookConfig?.lastError;

    const [minWords, setMinWords] = useState(String(settings.seo.minWords));
    const [maxWords, setMaxWords] = useState(String(settings.seo.maxWords));
    const [defaultLanguage, setDefaultLanguage] = useState(settings.seo.defaultLanguage);
    const [defaultLocation, setDefaultLocation] = useState(settings.seo.defaultLocation);
    const [requireInternalLinks, setRequireInternalLinks] = useState(settings.seo.requireInternalLinks);
    const [requireMetaDescription, setRequireMetaDescription] = useState(settings.seo.requireMetaDescription);
    const [requireSeoReview, setRequireSeoReview] = useState(settings.seo.requireSeoReview);

    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [scheduleName, setScheduleName] = useState("");
    const [scheduleStatus, setScheduleStatus] = useState<BlogStudioScheduleStatus>("active");
    const [scheduleCadence, setScheduleCadence] = useState<BlogStudioScheduleCadence>("weekly");
    const [scheduleSourceMode, setScheduleSourceMode] = useState<BlogStudioInputMode>("website");
    const [scheduleSourceValue, setScheduleSourceValue] = useState("");
    const [scheduleTrendFocus, setScheduleTrendFocus] = useState("");
    const [scheduleKeyword, setScheduleKeyword] = useState("");
    const [scheduleTargetType, setScheduleTargetType] = useState<BlogStudioTargetType>(settings.publishing.defaultTarget.type);
    const [scheduleTargetLabel, setScheduleTargetLabel] = useState(settings.publishing.defaultTarget.label);
    const [scheduleNextRunAt, setScheduleNextRunAt] = useState(toDateTimeLocalValue());
    const [scheduleCreateDraftOnly, setScheduleCreateDraftOnly] = useState(true);

    useEffect(() => {
        setWebhookHealthcheck(null);
    }, [defaultTargetType, defaultTargetLabel, webhookUrl, webhookActive, webhookRetryAttempts, webhookTimeout, webhookSecret]);

    const activeSchedules = schedules.filter((schedule) => schedule.status === "active").length;
    const timezoneLabel = useMemo(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        [],
    );
    const scheduleFormStateMessage = useMemo(
        () => getScheduleFormStateMessage(scheduleStatus, scheduleNextRunAt),
        [scheduleNextRunAt, scheduleStatus],
    );
    const scheduleRunsById = useMemo(() => {
        const scheduleNameToId = new Map(schedules.map((schedule) => [schedule.name, schedule.id]));
        const grouped = new Map<string, BlogStudioRun[]>();

        for (const run of runs) {
            const matchedScheduleId =
                run.scheduleId ||
                (run.createdBy === "ai-blogger-scheduler" ? scheduleNameToId.get(run.selectedTopic || "") : undefined);

            if (!matchedScheduleId) {
                continue;
            }

            const nextRuns = grouped.get(matchedScheduleId) || [];
            nextRuns.push(run);
            grouped.set(matchedScheduleId, nextRuns);
        }

        return grouped;
    }, [runs, schedules]);

    const resetScheduleForm = () => {
        setEditingScheduleId(null);
        setScheduleName("");
        setScheduleStatus("active");
        setScheduleCadence("weekly");
        setScheduleSourceMode("website");
        setScheduleSourceValue("");
        setScheduleTrendFocus("");
        setScheduleKeyword("");
        setScheduleTargetType(defaultTargetType);
        setScheduleTargetLabel(defaultTargetLabel);
        setScheduleNextRunAt(toDateTimeLocalValue());
        setScheduleCreateDraftOnly(true);
    };

    const runAction = (key: string, action: () => Promise<unknown>, successMessage: string) => {
        if (hasPendingAction) {
            return;
        }

        setPendingAction(key);
        startTransition(async () => {
            let waitingForRefresh = false;
            try {
                await action();
                toast.success(successMessage);
                waitingForRefresh = true;
                router.refresh();
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "AI Blogger update failed";
                console.error(`[${key}] Action failed:`, message);
                toast.error(message);
                setPendingAction("");
            } finally {
                if (waitingForRefresh) {
                    window.setTimeout(() => setPendingAction(""), SETTINGS_ACTION_REFRESH_LOCK_MS);
                } else {
                    setPendingAction("");
                }
            }
        });
    };

    const saveBrandVoice = () => runAction(
        "brand",
        () => upsertBlogStudioSettings({
            brandVoice: {
                tone: "",
                audience: "",
                ctaStyle: "",
                bannedTerms: splitCommaList(bannedTerms),
            },
        }),
        "Editorial guardrails saved",
    );

    const savePublishing = () => {
        const validationMessage = validatePublishingForm({
            defaultTargetType,
            defaultTargetLabel,
            webhookUrl,
            webhookActive,
            webhookRetryAttempts,
            webhookTimeout,
            webhookSecret,
            webhookHasSecret,
        });

        if (validationMessage) {
            toast.error(validationMessage);
            return;
        }

        runAction(
            "publishing",
            () => upsertBlogStudioSettings({
                publishing: {
                    defaultTarget: {
                        type: defaultTargetType,
                        label: defaultTargetLabel,
                        webhookConfig: defaultTargetType === "webhook" ? {
                            url: webhookUrl,
                            active: webhookActive,
                            retryAttempts: Number.parseInt(webhookRetryAttempts, 10),
                            timeout: Number.parseInt(webhookTimeout, 10),
                            secret: webhookSecret.trim() || undefined,
                        } : undefined,
                    },
                    requireApproval,
                    autoSchedule,
                    publishMode,
                },
            }),
            "Publishing settings saved",
        );
    };

    const saveSeo = () => runAction(
        "seo",
        () => upsertBlogStudioSettings({
            seo: {
                minWords: Number.parseInt(minWords, 10),
                maxWords: Number.parseInt(maxWords, 10),
                defaultLanguage,
                defaultLocation,
                requireInternalLinks,
                requireMetaDescription,
                requireSeoReview,
            },
        }),
        "SEO settings saved",
    );

    const runWebhookHealthCheck = () => {
        if (hasPendingAction) {
            return;
        }

        const validationMessage = validatePublishingForm({
            defaultTargetType,
            defaultTargetLabel,
            webhookUrl,
            webhookActive,
            webhookRetryAttempts,
            webhookTimeout,
            webhookSecret,
            webhookHasSecret,
        });

        if (validationMessage) {
            toast.error(validationMessage);
            return;
        }

        setPendingAction("webhook-test");
        startTransition(async () => {
            try {
                const result = await testBlogStudioWebhookTarget({
                    target: {
                        type: defaultTargetType,
                        label: defaultTargetLabel,
                        webhookConfig: defaultTargetType === "webhook"
                            ? {
                                url: webhookUrl,
                                active: webhookActive,
                                retryAttempts: Number.parseInt(webhookRetryAttempts, 10),
                                timeout: Number.parseInt(webhookTimeout, 10),
                                secret: webhookSecret.trim() || undefined,
                            }
                            : undefined,
                    },
                });

                setWebhookHealthcheck({
                    success: result.success,
                    message: result.message,
                    statusCode: result.statusCode,
                    checkedAt: result.timestamp,
                });
                if (result.success) {
                    toast.success(result.message);
                } else {
                    toast.error(result.message);
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Webhook health check failed";
                setWebhookHealthcheck({
                    success: false,
                    message,
                    checkedAt: new Date().toISOString(),
                });
                toast.error(message);
            } finally {
                setPendingAction("");
            }
        });
    };

    const saveSchedule = () => {
        const validationMessage = validateScheduleForm({
            scheduleName,
            scheduleStatus,
            scheduleSourceMode,
            scheduleSourceValue,
            scheduleTargetLabel,
            scheduleNextRunAt,
        });

        if (validationMessage) {
            toast.error(validationMessage);
            return;
        }

        runAction(
            "schedule",
            async () => {
                const payload = {
                    name: scheduleName,
                    status: scheduleStatus,
                    cadence: scheduleCadence,
                    timezone: timezoneLabel,
                    target: {
                        type: scheduleTargetType,
                        label: scheduleTargetLabel,
                    },
                    brief: {
                        sourceMode: scheduleSourceMode,
                        sourceValue: scheduleSourceValue,
                        trendFocus: scheduleTrendFocus,
                        audience: "",
                        tone: "",
                        cta: "",
                        primaryKeyword: scheduleKeyword,
                        language: defaultLanguage,
                        location: defaultLocation,
                    },
                    createDraftOnly: scheduleCreateDraftOnly,
                    nextRunAt: scheduleNextRunAt ? new Date(scheduleNextRunAt).toISOString() : "",
                };

                if (editingScheduleId) {
                    await updateBlogStudioSchedule(editingScheduleId, payload);
                } else {
                    await createBlogStudioSchedule(payload);
                }

                resetScheduleForm();
            },
            editingScheduleId ? "Schedule updated" : "Recurring schedule saved",
        );
    };

    const startEditingSchedule = (schedule: BlogStudioSchedule) => {
        setEditingScheduleId(schedule.id);
        setScheduleName(schedule.name);
        setScheduleStatus(schedule.status);
        setScheduleCadence(schedule.cadence);
        setScheduleSourceMode(schedule.brief.sourceMode);
        setScheduleSourceValue(schedule.brief.sourceValue || "");
        setScheduleTrendFocus(schedule.brief.trendFocus || "");
        setScheduleKeyword(schedule.brief.primaryKeyword || "");
        setScheduleTargetType(schedule.target.type);
        setScheduleTargetLabel(schedule.target.label);
        setScheduleNextRunAt(toDateTimeLocalValue(schedule.nextRunAt));
        setScheduleCreateDraftOnly(schedule.createDraftOnly);
        document.getElementById("ai-blogger-schedule-form")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const toggleScheduleStatus = (schedule: BlogStudioSchedule) => {
        const nextStatus: BlogStudioScheduleStatus = schedule.status === "active" ? "paused" : "active";

        runAction(
            `status-${schedule.id}`,
            () => updateBlogStudioScheduleStatus(schedule.id, {
                status: nextStatus,
                nextRunAt: schedule.nextRunAt,
            }),
            `Schedule ${nextStatus}`,
        );
    };

    const runScheduleNow = (schedule: BlogStudioSchedule) => {
        if (hasPendingAction) {
            return;
        }

        setPendingAction(`run-${schedule.id}`);
        startTransition(async () => {
            let waitingForRefresh = false;
            try {
                const result = await runBlogStudioScheduleNow(schedule.id);
                if (result.ok) {
                    toast.success(result.summary);
                } else {
                    toast.error(result.summary);
                }
                waitingForRefresh = true;
                router.refresh();
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "AI Blogger update failed";
                toast.error(message);
                setPendingAction("");
            } finally {
                if (waitingForRefresh) {
                    window.setTimeout(() => setPendingAction(""), SETTINGS_ACTION_REFRESH_LOCK_MS);
                } else {
                    setPendingAction("");
                }
            }
        });
    };

    const confirmDeleteSchedule = () => {
        if (!deleteTarget) {
            return;
        }

        runAction(
            `delete-${deleteTarget.id}`,
            async () => {
                await deleteBlogStudioSchedule(deleteTarget.id);
                if (editingScheduleId === deleteTarget.id) {
                    resetScheduleForm();
                }
                setDeleteTarget(null);
            },
            "Schedule deleted",
        );
    };

    return (
        <>
            <div className="space-y-6">
                <AIBloggerGlassCard className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="space-y-3">
                            <AIBloggerSectionEyebrow>Settings</AIBloggerSectionEyebrow>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                    Manage your content defaults
                                </h2>
                                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                    Control voice, SEO rules, publishing behavior, and recurring draft schedules.
                                </p>
                            </div>
                        </div>

                        {showQuickActions ? (
                            <div className="flex flex-wrap gap-3">
                                <AIBloggerGradientButton asChild>
                                    <Link href={generateHref}>
                                        <Sparkles className="h-4 w-4" />
                                        Generate Draft
                                    </Link>
                                </AIBloggerGradientButton>
                                <AIBloggerGradientButton asChild variant="outline">
                                    <Link href={postsHref}>
                                        <Settings2 className="h-4 w-4" />
                                        Open Posts
                                    </Link>
                                </AIBloggerGradientButton>
                            </div>
                        ) : null}
                    </div>
                </AIBloggerGlassCard>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {([
                        { icon: Target, label: "Target", value: settings.publishing.defaultTarget.label },
                        { icon: Globe2, label: "Publish mode", value: getBlogStudioPublishModeLabel(settings.publishing.publishMode) },
                        { icon: Bot, label: "Voice mode", value: "Context-driven AI" },
                        { icon: CalendarClock, label: "Active schedules", value: String(activeSchedules) },
                    ] as const).map((item) => (
                        <AIBloggerGlassCard key={item.label} className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-primary/8 text-primary">
                                    <item.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                                    <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{item.value}</p>
                                </div>
                            </div>
                        </AIBloggerGlassCard>
                    ))}
                </div>

                <Tabs defaultValue="brand" className="space-y-6">
                    <TabsList className="flex h-auto w-full overflow-x-auto rounded-xl border border-border/60 bg-background/40 p-1.5 gap-1 no-scrollbar">
                        {tabItems.map((item) => (
                            <TabsTrigger
                                key={item.value}
                                value={item.value}
                                className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-background/80 data-[state=inactive]:hover:text-foreground"
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="brand">
                        <AIBloggerGlassCard className="p-6">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                                        <Bot className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">Editorial Guardrails</h3>
                                        <p className="text-sm text-muted-foreground">
                                            AI now infers audience, tone, and CTA from the source context. Use guardrails here only to block wording you never want in drafts.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-4 text-sm leading-6 text-muted-foreground">
                                    Audience, tone, and CTA are inferred inside the existing AI Brief Pack step using website intelligence, SERP intent, grounded research, and business fit.
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ai-blogger-banned">Restricted Terms</Label>
                                    <Textarea
                                        id="ai-blogger-banned"
                                        value={bannedTerms}
                                        onChange={(event) => setBannedTerms(event.target.value)}
                                        placeholder="Clickbait, revolutionary, unbeatable"
                                        className="min-h-[120px] rounded-xl border-border/60 bg-background/60"
                                    />
                                    <p className="text-xs text-muted-foreground">Separate terms with commas.</p>
                                </div>

                                <div className="flex justify-end">
                                    <AIBloggerGradientButton type="button" onClick={saveBrandVoice} disabled={hasPendingAction}>
                                        {pendingAction === "brand" ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save Guardrails
                                            </>
                                        )}
                                    </AIBloggerGradientButton>
                                </div>
                            </div>
                        </AIBloggerGlassCard>
                    </TabsContent>

                    <TabsContent value="publishing">
                        <AIBloggerGlassCard className="p-6">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                                        <Target className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">Publishing Defaults</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Choose the default target and how approval and scheduling should behave.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-default-target-type">Default Target Type</Label>
                                        <Select value={defaultTargetType} onValueChange={(value) => setDefaultTargetType(value as BlogStudioTargetType)}>
                                            <SelectContent>
                                                <SelectItem value="manual-export">Manual Export</SelectItem>
                                                <SelectItem value="webhook">Webhook</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-default-target-label">Default Target Label</Label>
                                        <Input id="ai-blogger-default-target-label" value={defaultTargetLabel} onChange={(event) => setDefaultTargetLabel(event.target.value)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="ai-blogger-publish-mode">Publish Mode</Label>
                                        <Select value={publishMode} onValueChange={(value) => setPublishMode(value as BlogStudioPublishMode)}>
                                            <SelectContent>
                                                <SelectItem value="draft-only">Draft Only</SelectItem>
                                                <SelectItem value="approval-required">Approval Required</SelectItem>
                                                <SelectItem value="schedule-after-approval">Schedule After Approval</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {defaultTargetType === "webhook" && (
                                    <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h4 className="font-medium text-amber-700 dark:text-amber-300">Webhook Configuration</h4>
                                                <p className="text-sm text-muted-foreground">Configure where published posts will be sent.</p>
                                            </div>
                                            <button
                                                onClick={() => setIsDocModalOpen(true)}
                                                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary/12 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                                            >
                                                Docs
                                            </button>
                                         </div>
                                         <div className="space-y-2">
                                             <Label htmlFor="ai-blogger-webhook-url">Webhook URL</Label>
                                            <Textarea
                                                id="ai-blogger-webhook-url"
                                                placeholder="https://your-site.com/api/blogs/webhook"
                                                value={webhookUrl}
                                                onChange={(e) => setWebhookUrl(e.target.value)}
                                                className="rounded-2xl border-border/60 bg-background/60 font-mono text-sm"
                                                rows={2}
                                            />
                                             <p className="text-xs text-muted-foreground">Must be a valid HTTPS URL where your site receives blog data</p>
                                         </div>
                                         <div className="space-y-2">
                                             <Label htmlFor="ai-blogger-webhook-secret">Webhook Secret</Label>
                                             <Input
                                                 id="ai-blogger-webhook-secret"
                                                 type="password"
                                                 value={webhookSecret}
                                                 onChange={(e) => setWebhookSecret(e.target.value)}
                                                 placeholder={webhookHasSecret ? "Leave blank to keep the stored secret" : "Enter a shared secret"}
                                                 className="h-12 rounded-2xl border-border/60 bg-background/60 font-mono text-sm"
                                             />
                                             <p className="text-xs text-muted-foreground">
                                                 {webhookHasSecret
                                                     ? `Stored secret: ${webhookSecretMasked || "configured"}. Add a new value only if you want to rotate it.`
                                                     : "Set the same secret on the customer website receiver so it can verify requests."}
                                             </p>
                                             <p className="text-xs text-muted-foreground">
                                                 The secret is stored encrypted in AI Blogger settings. The local receiver can now validate requests from the stored agency secret, with env-based validation only as an optional fallback.
                                             </p>
                                         </div>
                                         <div className="flex flex-wrap items-center gap-3">
                                             <AIBloggerGradientButton
                                                 type="button"
                                                 variant="outline"
                                                 onClick={runWebhookHealthCheck}
                                                 disabled={hasPendingAction}
                                             >
                                                 {pendingAction === "webhook-test" ? (
                                                     <>
                                                         <Loader2 className="h-4 w-4 animate-spin" />
                                                         Testing
                                                     </>
                                                 ) : (
                                                     <>
                                                         <Play className="h-4 w-4" />
                                                         Test Webhook
                                                     </>
                                                 )}
                                             </AIBloggerGradientButton>
                                             <p className="text-xs text-muted-foreground">
                                                 Runs a safe authenticated GET health check. It does not create or update any blog content.
                                             </p>
                                         </div>
                                         <div className="grid gap-4 md:grid-cols-2">
                                             <div className="space-y-2">
                                                 <Label htmlFor="ai-blogger-webhook-active">Active</Label>
                                                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                                                    <span className="text-sm">Enable webhook delivery</span>
                                                    <Switch checked={webhookActive} onCheckedChange={setWebhookActive} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-blogger-webhook-retries">Retry Attempts</Label>
                                                <Input
                                                    id="ai-blogger-webhook-retries"
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={webhookRetryAttempts}
                                                    onChange={(e) => setWebhookRetryAttempts(e.target.value)}
                                                    className="h-12 rounded-2xl border-border/60 bg-background/60"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-blogger-webhook-timeout">Timeout (seconds)</Label>
                                                <Input
                                                    id="ai-blogger-webhook-timeout"
                                                    type="number"
                                                    min="5"
                                                    max="30"
                                                    value={webhookTimeout}
                                                    onChange={(e) => setWebhookTimeout(e.target.value)}
                                                    className="h-12 rounded-2xl border-border/60 bg-background/60"
                                                />
                                            </div>
                                        </div>
                                        {(savedWebhookStatus || webhookHealthcheck) ? (
                                            <div className="grid gap-3 md:grid-cols-2">
                                                {savedWebhookStatus ? (
                                                    <div className={`rounded-xl border px-4 py-3 text-sm ${
                                                        savedWebhookStatus === "success"
                                                            ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                                                            : savedWebhookStatus === "failed"
                                                                ? "border-destructive/25 bg-destructive/5 text-destructive"
                                                                : "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                                                    }`}>
                                                        <p className="font-medium text-foreground">Latest saved delivery</p>
                                                        <p className="mt-1.5">
                                                            {savedWebhookStatus === "success"
                                                                ? "The last saved publish delivery succeeded."
                                                                : savedWebhookStatus === "failed"
                                                                    ? "The last saved publish delivery failed."
                                                                    : "A publish delivery is still marked pending."}
                                                        </p>
                                                        {savedWebhookLastSentAt ? (
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                Attempted {formatBlogStudioDate(savedWebhookLastSentAt, true)}
                                                            </p>
                                                        ) : null}
                                                        {savedWebhookStatus === "failed" && savedWebhookLastError ? (
                                                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{savedWebhookLastError}</p>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                                {webhookHealthcheck ? (
                                                    <div className={`rounded-xl border px-4 py-3 text-sm ${
                                                        webhookHealthcheck.success
                                                            ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                                                            : "border-destructive/25 bg-destructive/5 text-destructive"
                                                    }`}>
                                                        <p className="font-medium text-foreground">Latest health check</p>
                                                        <p className="mt-1.5">{webhookHealthcheck.message}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Checked {formatBlogStudioDate(webhookHealthcheck.checkedAt, true)}
                                                        </p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                        <div>
                                            <p className="font-medium">Require Approval</p>
                                            <p className="text-sm text-muted-foreground">Keep an approval checkpoint before handoff.</p>
                                        </div>
                                        <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                        <div>
                                            <p className="font-medium">Auto Schedule</p>
                                            <p className="text-sm text-muted-foreground">Allow approved content into the schedule queue when supported.</p>
                                        </div>
                                        <Switch checked={autoSchedule} onCheckedChange={setAutoSchedule} />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4 text-sm leading-6 text-muted-foreground">
                                    {defaultTargetType === "webhook"
                                        ? "Published posts will be sent to your webhook URL after publication. Configure the URL, secret, retry, and timeout settings above."
                                        : "Manual Export keeps posts in the queue for review, copy, and markdown export."}
                                </div>

                                <div className="flex justify-end">
                                    <AIBloggerGradientButton type="button" onClick={savePublishing} disabled={hasPendingAction}>
                                        {pendingAction === "publishing" ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save Publishing
                                            </>
                                        )}
                                    </AIBloggerGradientButton>
                                </div>
                            </div>
                        </AIBloggerGlassCard>
                    </TabsContent>

                    <TabsContent value="seo">
                        <AIBloggerGlassCard className="p-6">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                                        <SearchCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">SEO Guardrails</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Define the structure and review checks every draft should meet.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-min-words">Minimum Words</Label>
                                        <Input id="ai-blogger-min-words" type="number" value={minWords} onChange={(event) => setMinWords(event.target.value)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-max-words">Maximum Words</Label>
                                        <Input id="ai-blogger-max-words" type="number" value={maxWords} onChange={(event) => setMaxWords(event.target.value)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-language">Language</Label>
                                        <Input id="ai-blogger-language" value={defaultLanguage} onChange={(event) => setDefaultLanguage(event.target.value)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-blogger-location">Location</Label>
                                        <Input id="ai-blogger-location" value={defaultLocation} onChange={(event) => setDefaultLocation(event.target.value)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                        <div>
                                            <p className="font-medium">Require Internal Links</p>
                                            <p className="text-sm text-muted-foreground">Flag missing links during review.</p>
                                        </div>
                                        <Switch checked={requireInternalLinks} onCheckedChange={setRequireInternalLinks} />
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                        <div>
                                            <p className="font-medium">Require Meta Description</p>
                                            <p className="text-sm text-muted-foreground">Keep excerpt and metadata ready.</p>
                                        </div>
                                        <Switch checked={requireMetaDescription} onCheckedChange={setRequireMetaDescription} />
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                        <div>
                                            <p className="font-medium">Require SEO Review</p>
                                            <p className="text-sm text-muted-foreground">Hold drafts in SEO review before approval.</p>
                                        </div>
                                        <Switch checked={requireSeoReview} onCheckedChange={setRequireSeoReview} />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <AIBloggerGradientButton type="button" onClick={saveSeo} disabled={hasPendingAction}>
                                        {pendingAction === "seo" ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save SEO Rules
                                            </>
                                        )}
                                    </AIBloggerGradientButton>
                                </div>
                            </div>
                        </AIBloggerGlassCard>
                    </TabsContent>

                    <TabsContent value="search-console">
                        <AIBloggerGlassCard className="p-6">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                                        <BarChart3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">Google Search Console</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Connect your Search Console to track blog analytics and performance metrics.
                                        </p>
                                    </div>
                                </div>

                                <SearchConsoleOAuthButton
                                    key={oauthRefreshKey}
                                    currentStatus={settings?.searchConsoleOAuth?.authStatus || "not-connected"}
                                    selectedDomain={settings?.searchConsoleOAuth?.selectedDomain}
                                    onConnected={() => {
                                        toast.success("Google Search Console connected");
                                        setOAuthRefreshKey((prev) => prev + 1);
                                        router.refresh();
                                    }}
                                    onDisconnected={() => {
                                        toast.success("Disconnected from Google Search Console");
                                        setOAuthRefreshKey((prev) => prev + 1);
                                        router.refresh();
                                    }}
                                />

                                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                                    <p className="text-sm text-sky-900 dark:text-sky-200">
                                        <strong>How it works:</strong> Click &quot;Connect with Google&quot; and authorize AgencyOS to access your Search Console. Your tokens are encrypted and stored securely.
                                    </p>
                                </div>
                            </div>
                        </AIBloggerGlassCard>
                    </TabsContent>

                    <TabsContent value="automation">
                        <div className="space-y-6">
                            <AIBloggerPerformanceSyncCard syncStatus={syncStatus} />

                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)]">
                                <AIBloggerGlassCard id="ai-blogger-schedule-form" className="p-6">
                                    <div className="space-y-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                                                    <CalendarClock className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold">
                                                        {editingScheduleId ? "Edit Schedule" : "Recurring Schedule"}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Save recurring briefs, change lifecycle state, and control when draft generation runs.
                                                    </p>
                                                </div>
                                            </div>
                                            {editingScheduleId ? (
                                                <AIBloggerGradientButton type="button" size="sm" variant="ghost" onClick={resetScheduleForm}>
                                                    Reset Form
                                                </AIBloggerGradientButton>
                                            ) : null}
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="ai-blogger-schedule-name">Schedule Name</Label>
                                                <Input id="ai-blogger-schedule-name" value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} placeholder="Weekly SEO roundup" className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-blogger-schedule-status">Status</Label>
                                                <Select value={scheduleStatus} onValueChange={(value) => setScheduleStatus(value as BlogStudioScheduleStatus)}>
                                                    <SelectContent>
                                                        <SelectItem value="draft">Draft</SelectItem>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="paused">Paused</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-blogger-schedule-cadence">Cadence</Label>
                                                <Select value={scheduleCadence} onValueChange={(value) => setScheduleCadence(value as BlogStudioScheduleCadence)}>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="ai-blogger-schedule-next-run">Next Run</Label>
                                                <Input
                                                    id="ai-blogger-schedule-next-run"
                                                    type="datetime-local"
                                                    min={toDateTimeLocalValue(new Date(Date.now() + 60000))}
                                                    value={scheduleNextRunAt}
                                                    onChange={(event) => setScheduleNextRunAt(event.target.value)}
                                                    className="h-12 rounded-2xl border-border/60 bg-background/60"
                                                    title="Select a future date and time for the next automated generation run"
                                                />
                                            </div>
                                            <div className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-sm leading-6 ${scheduleFormStateMessage.toneClass} md:col-span-2`}>
                                                <scheduleFormStateMessage.icon className="mt-0.5 h-4 w-4 shrink-0" />
                                                <p>{scheduleFormStateMessage.message}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-blogger-schedule-source-mode">Input Method</Label>
                                                <Select value={scheduleSourceMode} onValueChange={(value) => setScheduleSourceMode(value as BlogStudioInputMode)}>
                                                    <SelectContent>
                                                        <SelectItem value="website">Website Brief</SelectItem>
                                                        <SelectItem value="trending">Trend Assisted</SelectItem>
                                                        <SelectItem value="keywords">Keyword Cluster</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="ai-blogger-schedule-source-value">Source Detail</Label>
                                                <Input id="ai-blogger-schedule-source-value" value={scheduleSourceValue} onChange={(event) => setScheduleSourceValue(event.target.value)} placeholder={getScheduleSourcePlaceholder(scheduleSourceMode)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                                <p className="text-xs leading-5 text-muted-foreground">
                                                    {getScheduleSourceHint(scheduleSourceMode)}
                                                </p>
                                            </div>
                                            {scheduleSourceMode === "website" ? (
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="ai-blogger-schedule-trend-focus">Trend Angle</Label>
                                                    <Input
                                                        id="ai-blogger-schedule-trend-focus"
                                                        value={scheduleTrendFocus}
                                                        onChange={(event) => setScheduleTrendFocus(event.target.value)}
                                                        placeholder="Optional, e.g. AI search, holiday demand, Google core update"
                                                        className="h-12 rounded-2xl border-border/60 bg-background/60"
                                                    />
                                                    <p className="text-xs leading-5 text-muted-foreground">
                                                        This keeps the website as the main source, but nudges recurring drafts toward a timely angle when topic discovery runs.
                                                    </p>
                                                </div>
                                            ) : null}
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-blogger-schedule-keyword">Primary Keyword</Label>
                                                <Input id="ai-blogger-schedule-keyword" value={scheduleKeyword} onChange={(event) => setScheduleKeyword(event.target.value)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="ai-blogger-schedule-target-type">Target Type</Label>
                                                <Select value={scheduleTargetType} onValueChange={(value) => setScheduleTargetType(value as BlogStudioTargetType)}>
                                                    <SelectContent>
                                                        <SelectItem value="manual-export">Manual Export</SelectItem>
                                                        <SelectItem value="webhook">Webhook</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="ai-blogger-schedule-target-label">Target Label</Label>
                                                <Input id="ai-blogger-schedule-target-label" value={scheduleTargetLabel} onChange={(event) => setScheduleTargetLabel(event.target.value)} className="h-12 rounded-2xl border-border/60 bg-background/60" />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                            <div>
                                                <p className="font-medium">Create Draft Only</p>
                                                <p className="text-sm text-muted-foreground">
                                                    When turned off, successful runs advance the generated post into Research automatically.
                                                </p>
                                            </div>
                                            <Switch checked={scheduleCreateDraftOnly} onCheckedChange={setScheduleCreateDraftOnly} />
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-3">
                                            {editingScheduleId ? (
                                                <AIBloggerGradientButton type="button" variant="outline" onClick={resetScheduleForm}>
                                                    Cancel Edit
                                                </AIBloggerGradientButton>
                                            ) : null}
                                            <AIBloggerGradientButton type="button" onClick={saveSchedule} disabled={hasPendingAction}>
                                                {pendingAction === "schedule" ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Saving
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4" />
                                                        {editingScheduleId ? "Update Schedule" : "Save Schedule"}
                                                    </>
                                                )}
                                            </AIBloggerGradientButton>
                                        </div>
                                    </div>
                                </AIBloggerGlassCard>

                                <AIBloggerGlassCard className="p-6">
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                                                <Globe2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold">Saved Schedules</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Review lifecycle state, run health, manual controls, and recent execution history.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {schedules.length > 0 ? schedules.map((schedule) => {
                                                const history = (scheduleRunsById.get(schedule.id) || []).slice(0, 4);
                                                const latestRun = history[0];
                                                const health = getScheduleHealthState(schedule, latestRun);
                                                const lockState = getScheduleLockState(schedule);
                                                const scheduleBusy = hasPendingAction || lockState.isLocked;

                                                return (
                                                    <div key={schedule.id} className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                                        <div className="space-y-4">
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div className="space-y-2">
                                                                    <p className="font-semibold">{schedule.name}</p>
                                                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                                        <span>{humanizeBlogStudioValue(schedule.cadence)}</span>
                                                                        <span>•</span>
                                                                        <span>{getBlogStudioSourceLabel(schedule.brief.sourceMode)}</span>
                                                                        {schedule.brief.trendFocus ? (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span>Trend blend</span>
                                                                            </>
                                                                        ) : null}
                                                                        <span>•</span>
                                                                        <span>{getBlogStudioTargetTypeLabel(schedule.target.type)}</span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">Next run: {formatBlogStudioDate(schedule.nextRunAt, true)}</p>
                                                                    <p className="text-xs text-muted-foreground">Last run: {formatBlogStudioDate(schedule.lastRunAt, true)}</p>
                                                                    <p className="text-xs text-muted-foreground">Target: {schedule.target.label}</p>
                                                                    {schedule.brief.trendFocus ? (
                                                                        <p className="text-xs text-muted-foreground">Trend angle: {schedule.brief.trendFocus}</p>
                                                                    ) : null}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <Badge variant="outline" className="rounded-full">
                                                                        {humanizeBlogStudioValue(schedule.status)}
                                                                    </Badge>
                                                                    <Badge variant="outline" className="rounded-full">
                                                                        {schedule.createDraftOnly ? "Draft Only" : "Advance To Research"}
                                                                    </Badge>
                                                                    {lockState.isLocked ? (
                                                                        <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
                                                                            Running
                                                                        </Badge>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className={`rounded-[20px] border px-4 py-3 text-sm ${health.toneClass}`}>
                                                                <p className="font-medium">{health.label}</p>
                                                                <p className="mt-1 leading-6">{health.message}</p>
                                                            </div>

                                                            {lockState.isLocked ? (
                                                                <div className="rounded-[20px] border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                                                                    <div className="flex items-center gap-2">
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        <span>{lockState.label}</span>
                                                                    </div>
                                                                </div>
                                                            ) : null}

                                                            <div className="flex flex-wrap gap-2">
                                                                <AIBloggerGradientButton type="button" size="sm" variant="outline" disabled={scheduleBusy} onClick={() => toggleScheduleStatus(schedule)}>
                                                                    {pendingAction === `status-${schedule.id}` ? (
                                                                        <>
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                            Saving
                                                                        </>
                                                                    ) : schedule.status === "active" ? "Pause" : "Activate"}
                                                                </AIBloggerGradientButton>
                                                                <AIBloggerGradientButton type="button" size="sm" variant="outline" disabled={scheduleBusy} onClick={() => runScheduleNow(schedule)}>
                                                                    {pendingAction === `run-${schedule.id}` ? (
                                                                        <>
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                            Running
                                                                        </>
                                                                    ) : lockState.isLocked ? (
                                                                        <>
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                            Running
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Play className="h-4 w-4" />
                                                                            Run Now
                                                                        </>
                                                                    )}
                                                                </AIBloggerGradientButton>
                                                                <AIBloggerGradientButton type="button" size="sm" variant="outline" disabled={scheduleBusy} onClick={() => startEditingSchedule(schedule)}>
                                                                    <PencilLine className="h-4 w-4" />
                                                                    Edit
                                                                </AIBloggerGradientButton>
                                                                <AIBloggerGradientButton type="button" size="sm" variant="ghost" disabled={scheduleBusy} onClick={() => setDeleteTarget(schedule)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Delete
                                                                </AIBloggerGradientButton>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                                        Recent Run History
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {history.length > 0 ? `${history.length} recent entries` : "No runs yet"}
                                                                    </p>
                                                                </div>
                                                                {history.length > 0 ? history.map((run) => (
                                                                    <div key={run.id} className="rounded-[20px] border border-border/60 bg-background/50 px-3 py-3">
                                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                                            <div className="space-y-1">
                                                                                <p className="text-sm font-medium">
                                                                                    {run.summary || "Execution summary not recorded."}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    Started: {formatBlogStudioDate(run.startedAt || run.createdAt, true)}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    Completed: {formatBlogStudioDate(run.completedAt || run.updatedAt, true)}
                                                                                </p>
                                                                            </div>
                                                                            <Badge variant="outline" className="rounded-full">
                                                                                {humanizeBlogStudioValue(run.status)}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                )) : (
                                                                    <div className="rounded-[20px] border border-dashed border-border/60 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                                                                        No execution history has been recorded for this schedule yet.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                                                    No schedules have been saved yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AIBloggerGlassCard>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                                    <div className="text-sm text-muted-foreground">
                                        <p className="font-semibold text-amber-700 dark:text-amber-300">
                                            Remove &quot;{deleteTarget?.name}&quot;?
                                        </p>
                                        <p className="mt-1">
                                            This removes the saved automation schedule and its future run window. Existing generated posts and recorded run history stay intact.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={hasPendingAction}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSchedule} className="bg-red-600 text-white hover:bg-red-700" disabled={hasPendingAction}>
                            {deleteTarget && pendingAction === `delete-${deleteTarget.id}` ? "Deleting" : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <WebhookDocumentationModal
                isOpen={isDocModalOpen}
                onClose={() => setIsDocModalOpen(false)}
                webhookUrl={webhookUrl}
            />

            <SessionDebugWidget />
        </>
    );
}
