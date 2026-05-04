"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { Shield, Bell, Database, Globe, Mail, Loader2, Brain, FileText, CheckCircle2, ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { useDateFormat } from "@/context/TimezoneContext";
import { getSystemSettings, updateSystemSettings, getAllAgenciesWithStats, getDefaultAiConfig, saveDefaultAiConfig, getPromptConfig, savePromptConfig } from "@/lib/actions/super-admin";
import { AI_MODELS } from "@/lib/ai-models";
import { AIConfig, Agency, AIProvider } from "@/lib/types";
import { DEFAULT_EMAIL_CATEGORIES, DEFAULT_TASK_EMAIL_EVENTS } from "@/lib/email-constants";
import type { EmailCategory, TaskEmailEventKey, TaskEmailEventConfig } from "@/lib/email-constants";
import { toast } from "sonner";
import { SystemSettingsAiAgencyList } from "./_components/SystemSettingsAiAgencyList";
import { SystemSettingsDefaultAiSection, FeatureConfigs } from "./_components/SystemSettingsDefaultAiSection";
import { SystemSettingsEmailAdminSection } from "./_components/SystemSettingsEmailAdminSection";
import { SystemSettingsEmailCategorySection } from "./_components/SystemSettingsEmailCategorySection";
import { SystemSettingsEmailGlobalControls } from "./_components/SystemSettingsEmailGlobalControls";
import { SystemSettingsInfoSection } from "./_components/SystemSettingsInfoSection";
import { SystemSettingsNotificationsSection } from "./_components/SystemSettingsNotificationsSection";
import { SystemSettingsPlatformSection } from "./_components/SystemSettingsPlatformSection";
import { SystemSettingsSectionAccordion } from "./_components/SystemSettingsSectionAccordion";
import { SystemSettingsSecuritySection } from "./_components/SystemSettingsSecuritySection";
import { SystemSettingsPromptSection, type PromptConfigState } from "./_components/SystemSettingsPromptSection";
import { SystemSettingsBlogManagementSection } from "./_components/SystemSettingsBlogManagementSection";

type AgencyWithStats = Agency & {
    stats: {
        users: number;
        projects: number;
        clients: number;
    };
};

type SettingsSectionKey = "platform" | "email" | "security" | "ai" | "notifications" | "prompts" | "blogs" | "system";

type SettingsSectionMeta = {
    key: SettingsSectionKey;
    title: string;
    description: string;
    icon: LucideIcon;
    iconBg: string;
    iconClassName: string;
};

const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
    {
        key: "platform",
        title: "Platform Information",
        description: "Platform name, support email, and defaults for new agencies.",
        icon: Globe,
        iconBg: "bg-blue-500/10",
        iconClassName: "text-blue-500",
    },
    {
        key: "email",
        title: "Email Services",
        description: "Default email settings for all agencies and super-admin alerts.",
        icon: Mail,
        iconBg: "bg-emerald-500/10",
        iconClassName: "text-emerald-500",
    },
    {
        key: "security",
        title: "Security",
        description: "Authentication, registration, and password policies.",
        icon: Shield,
        iconBg: "bg-green-500/10",
        iconClassName: "text-green-500",
    },
    {
        key: "ai",
        title: "Singularity AI",
        description: "Default provider configuration and per-agency AI setup.",
        icon: Brain,
        iconBg: "bg-purple-500/10",
        iconClassName: "text-purple-500",
    },
    {
        key: "notifications",
        title: "Notifications",
        description: "In-app notification defaults across all agencies.",
        icon: Bell,
        iconBg: "bg-yellow-500/10",
        iconClassName: "text-yellow-500",
    },
    {
        key: "prompts",
        title: "Prompt Management",
        description: "AI prompt overrides for every major AI feature.",
        icon: FileText,
        iconBg: "bg-orange-500/10",
        iconClassName: "text-orange-500",
    },
    {
        key: "blogs",
        title: "Blog Management",
        description: "Public blog controls and AI Blogger publishing entry points.",
        icon: FileText,
        iconBg: "bg-sky-500/10",
        iconClassName: "text-sky-500",
    },
    {
        key: "system",
        title: "System Information",
        description: "Platform version and environment details.",
        icon: Database,
        iconBg: "bg-indigo-500/10",
        iconClassName: "text-indigo-500",
    },
];

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function SettingsSummaryCard({
    label,
    value,
    detail,
    icon,
}: {
    label: string;
    value: string;
    detail: string;
    icon: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function SettingsMap({
    sections,
    getStatus,
}: {
    sections: SettingsSectionMeta[];
    getStatus: (key: SettingsSectionKey) => string;
}) {
    return (
        <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Settings Map</p>
                    <h2 className="mt-1 text-base font-semibold text-foreground">System controls</h2>
                </div>
                <nav className="mt-4 space-y-2" aria-label="Super-admin settings sections">
                    {sections.map((section, index) => {
                        const Icon = section.icon;

                        return (
                            <a
                                key={section.key}
                                href={`#settings-${section.key}`}
                                className="group flex gap-3 rounded-xl border border-border/70 bg-background/60 p-3 transition hover:border-primary/40 hover:bg-primary/5"
                            >
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${section.iconClassName}`} />
                                        <p className="truncate text-sm font-medium text-foreground">{section.title}</p>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.description}</p>
                                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-primary">{getStatus(section.key)}</p>
                                </div>
                            </a>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}

export default function SystemSettingsPage() {
    const fmt = useDateFormat();
    const [saving, setSaving] = useState("");
    const [saved, setSaved] = useState("");
    const [loading, setLoading] = useState(true);

    // Platform state — currency is now per-agency; removed from here
    const [platform, setPlatform] = useState({
        name: "AgencyOS",
        supportEmail: "support@agencyos.com",
    });

    // Security state
    const [security, setSecurity] = useState({
        requireEmailVerification: false,
        enableTwoFactor: false,
        allowSelfRegistration: false,
        enforceStrongPasswords: true,
    });

    // Notifications state (super-admin email alerts — shown in Email section)
    const [notifications, setNotifications] = useState({
        emailOnAgencyCreated: true,
        emailOnAgencySuspended: true,
        weeklySummary: false,
    });

    // Notification type defaults (controls in-app notifications for all agencies)
    const [notificationDefaults, setNotificationDefaults] = useState<Record<string, boolean>>({
        welcome: true,
        project: true,
        task: true,
        invoice: true,
        salary: true,
        leave: true,
        refund: true,
        document: true,
        security: true,
    });
    const [updatingNotif, setUpdatingNotif] = useState<string | null>(null);

    // Agencies for AI config
    const [agencies, setAgencies] = useState<AgencyWithStats[]>([]);

    // Default AI config state
    const [defaultAi, setDefaultAi] = useState<{ provider: AIProvider; apiKey: string; model: string; customModelId: string }>({ provider: 'gemini', apiKey: '', model: '', customModelId: '' });
    const [defaultAiConfigured, setDefaultAiConfigured] = useState(false);
    const [savingDefaultAi, setSavingDefaultAi] = useState(false);
    const [savedDefaultAi, setSavedDefaultAi] = useState('');
    const [defaultAiFeatureConfigs, setDefaultAiFeatureConfigs] = useState<FeatureConfigs>({});

    // Prompt config
    const [promptConfig, setPromptConfig] = useState<PromptConfigState>({});
    const [savingPrompt, setSavingPrompt] = useState(false);
    const [savedPrompt, setSavedPrompt] = useState('');

    // Email defaults state
    const [emailGlobalEnabled, setEmailGlobalEnabled] = useState(true);
    const [emailCategories, setEmailCategories] = useState<Record<string, boolean>>({ ...DEFAULT_EMAIL_CATEGORIES });
    const [taskEmailEvents, setTaskEmailEvents] = useState<Record<TaskEmailEventKey, TaskEmailEventConfig>>({ ...DEFAULT_TASK_EMAIL_EVENTS });
    const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);

    // Section accordion state — platform open by default
    const [openSections, setOpenSections] = useState<Record<SettingsSectionKey, boolean>>({
        platform: true,
        email: true,
        security: false,
        ai: true,
        notifications: false,
        prompts: false,
        blogs: false,
        system: false,
    });

    const toggleSection = useCallback((key: SettingsSectionKey) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const setAllSections = useCallback((open: boolean) => {
        setOpenSections(
            SETTINGS_SECTIONS.reduce(
                (next, section) => ({ ...next, [section.key]: open }),
                {} as Record<SettingsSectionKey, boolean>,
            ),
        );
    }, []);

    // Load settings from DB
    useEffect(() => {
        (async () => {
            try {
                const [settings, agencyList] = await Promise.all([
                    getSystemSettings(),
                    getAllAgenciesWithStats(),
                ]);
                if (settings?.platform) setPlatform(prev => ({ ...prev, ...settings.platform }));
                if (settings?.security) setSecurity(prev => ({ ...prev, ...settings.security }));
                if (settings?.notifications) setNotifications(prev => ({ ...prev, ...settings.notifications }));
                if (settings?.notificationDefaults) setNotificationDefaults(prev => ({ ...prev, ...settings.notificationDefaults }));
                if (settings?.emailDefaults) {
                    const emailDefaults = settings.emailDefaults;
                    if (typeof emailDefaults.globalEnabled === 'boolean') setEmailGlobalEnabled(emailDefaults.globalEnabled);
                    const cats: Record<string, boolean> = { ...DEFAULT_EMAIL_CATEGORIES };
                    for (const key of Object.keys(DEFAULT_EMAIL_CATEGORIES) as EmailCategory[]) {
                        const categoryValue = emailDefaults[key];
                        if (typeof categoryValue === 'boolean') {
                            cats[key] = categoryValue;
                        }
                    }
                    setEmailCategories(cats);
                    const taskEmailEventDefaults = emailDefaults.taskEmailEvents;
                    if (taskEmailEventDefaults) {
                        setTaskEmailEvents(prev => {
                            const merged = { ...prev };
                            for (const eventKey of Object.keys(prev) as TaskEmailEventKey[]) {
                                const eventConfig = taskEmailEventDefaults[eventKey];
                                if (eventConfig) {
                                    merged[eventKey] = { ...prev[eventKey], ...eventConfig };
                                }
                            }
                            return merged;
                        });
                    }
                }
                setAgencies((agencyList as AgencyWithStats[]) || []);
                // Load default AI config
                try {
                    const daiConfig = await getDefaultAiConfig();
                    if (daiConfig) {
                        setDefaultAi({ provider: daiConfig.provider, apiKey: '', model: daiConfig.model, customModelId: daiConfig.customModelId || '' });
                        setDefaultAiConfigured(true);
                        // Load per-feature model overrides
                        const fc: FeatureConfigs = {};
                        for (const key of ["chatConfig", "agentConfig", "taskExplainConfig", "hourEstimateConfig", "taskChatbotConfig", "heavyTasksConfig"] as const) {
                            const subConf = (daiConfig as AIConfig & Record<string, AIConfig | undefined>)[key];
                            if (subConf && Object.keys(subConf).length > 0) {
                                fc[key] = {
                                    provider: subConf.provider,
                                    apiKey: subConf.apiKey || "",
                                    model: subConf.model,
                                    customModelId: subConf.customModelId || ""
                                };
                            }
                        }
                        setDefaultAiFeatureConfigs(fc);
                    }
                } catch { /* ignore if not configured */ }
                // Load prompt config
                try {
                    const pc = await getPromptConfig();
                    if (pc) setPromptConfig(pc as PromptConfigState);
                } catch { /* ignore */ }
            } catch (e) {
                console.error("Failed to load settings:", e);
                toast.error("Failed to load system settings");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSave = useCallback(async (section: 'platform' | 'security' | 'notifications') => {
        setSaving(section);
        try {
            const data = section === 'platform' ? platform : section === 'security' ? security : notifications;
            await updateSystemSettings(section, data);
            setSaved(section);
            setTimeout(() => setSaved(""), 2500);
        } catch (e) {
            console.error("Failed to save:", e);
            toast.error("Failed to save changes");
        } finally {
            setSaving("");
        }
    }, [platform, security, notifications]);

    const handleEmailGlobalToggle = useCallback(async (checked: boolean) => {
        setEmailGlobalEnabled(checked);
        setUpdatingEmail('global');
        try {
            await updateSystemSettings('emailDefaults', { globalEnabled: checked });
            setSaved('email');
            setTimeout(() => setSaved(''), 2500);
        } catch (e) {
            console.error('Failed to toggle email:', e);
            setEmailGlobalEnabled(!checked);
            toast.error("Failed to update email service");
        } finally {
            setUpdatingEmail(null);
        }
    }, []);

    const handleEmailCategoryToggle = useCallback(async (category: string, checked: boolean) => {
        setEmailCategories(prev => ({ ...prev, [category]: checked }));
        setUpdatingEmail(category);
        try {
            await updateSystemSettings('emailDefaults', { [category]: checked });
        } catch (e) {
            console.error('Failed to toggle category:', e);
            setEmailCategories(prev => ({ ...prev, [category]: !checked }));
            toast.error("Failed to update email category");
        } finally {
            setUpdatingEmail(null);
        }
    }, []);

    const handleTaskEventToggle = useCallback(async (eventKey: TaskEmailEventKey, field: keyof TaskEmailEventConfig, checked: boolean) => {
        setTaskEmailEvents(prev => ({
            ...prev,
            [eventKey]: { ...prev[eventKey], [field]: checked },
        }));
        setUpdatingEmail(`event-${eventKey}-${field}`);
        try {
            await updateSystemSettings('emailDefaults', {
                taskEmailEvents: { [eventKey]: { [field]: checked } },
            });
        } catch (e) {
            console.error('Failed to toggle task event:', e);
            setTaskEmailEvents(prev => ({
                ...prev,
                [eventKey]: { ...prev[eventKey], [field]: !checked },
            }));
            toast.error("Failed to update task email event");
        } finally {
            setUpdatingEmail(null);
        }
    }, []);

    const handleNotifToggle = useCallback(async (key: string, checked: boolean) => {
        setNotificationDefaults(prev => ({ ...prev, [key]: checked }));
        setUpdatingNotif(key);
        try {
            await updateSystemSettings('notificationDefaults', { [key]: checked });
        } catch (e) {
            console.error('Failed to toggle notification:', e);
            setNotificationDefaults(prev => ({ ...prev, [key]: !checked }));
            toast.error("Failed to update notification default");
        } finally {
            setUpdatingNotif(null);
        }
    }, []);

    const handleDefaultAiProviderChange = useCallback((provider: AIProvider) => {
        setDefaultAi((prev) => ({
            ...prev,
            provider,
            model: AI_MODELS[provider]?.[0]?.id || "",
            customModelId: "",
        }));
    }, []);

    const handleDefaultAiApiKeyChange = useCallback((apiKey: string) => {
        setDefaultAi((prev) => ({ ...prev, apiKey }));
    }, []);

    const handleDefaultAiModelChange = useCallback((model: string) => {
        setDefaultAi((prev) => ({
            ...prev,
            model,
            customModelId: model !== "custom" ? "" : prev.customModelId,
        }));
    }, []);

    const handleDefaultAiCustomModelIdChange = useCallback((customModelId: string) => {
        setDefaultAi((prev) => ({ ...prev, customModelId }));
    }, []);

    const handleDefaultAiSave = useCallback(async () => {
        if (!defaultAi.apiKey && !defaultAiConfigured) return;
        if (!defaultAi.model) return;

        setSavingDefaultAi(true);
        try {
            const configToSave: AIConfig = {
                provider: defaultAi.provider,
                apiKey: defaultAi.apiKey || "",
                model: defaultAi.model,
            };
            if (defaultAi.customModelId) configToSave.customModelId = defaultAi.customModelId;
            // Include per-feature object overrides
            for (const key of ["chatConfig", "agentConfig", "taskExplainConfig", "hourEstimateConfig", "taskChatbotConfig", "heavyTasksConfig"] as const) {
                const val = defaultAiFeatureConfigs[key];
                if (val) (configToSave as Record<string, unknown>)[key] = val;
            }

            await saveDefaultAiConfig(configToSave);
            setDefaultAiConfigured(true);
            setDefaultAi((prev) => ({ ...prev, apiKey: "" }));
            setSavedDefaultAi("Saved!");
            setTimeout(() => setSavedDefaultAi(""), 3000);
        } catch (err) {
            const message = getErrorMessage(err, "Failed to save default AI config");
            toast.error(message);
            setSavedDefaultAi(message);
            setTimeout(() => setSavedDefaultAi(""), 3000);
        } finally {
            setSavingDefaultAi(false);
        }
    }, [defaultAi, defaultAiConfigured, defaultAiFeatureConfigs]);

    const handleDefaultAiRemove = useCallback(async () => {
        setSavingDefaultAi(true);
        try {
            await saveDefaultAiConfig(null);
            setDefaultAi({ provider: "gemini", apiKey: "", model: "", customModelId: "" });
            setDefaultAiFeatureConfigs({});
            setDefaultAiConfigured(false);
            setSavedDefaultAi("Removed");
            setTimeout(() => setSavedDefaultAi(""), 3000);
        } catch {
            toast.error("Failed to remove default AI config");
        } finally {
            setSavingDefaultAi(false);
        }
    }, []);

    const handleSavePromptConfig = useCallback(async (config: PromptConfigState) => {
        setSavingPrompt(true);
        try {
            await savePromptConfig(config as Record<string, { standard?: string; live?: string }>);
            setSavedPrompt('Saved!');
            setTimeout(() => setSavedPrompt(''), 3000);
        } catch (e) {
            console.error('Failed to save prompt config:', e);
            toast.error('Failed to save prompt overrides');
        } finally {
            setSavingPrompt(false);
        }
    }, []);

    const handleSuperAdminAlertToggle = useCallback(async (key: string, checked: boolean) => {
        setNotifications(prev => ({ ...prev, [key]: checked }));
        setUpdatingEmail(`sa-${key}`);
        try {
            await updateSystemSettings('notifications', { [key]: checked });
        } catch (e) {
            console.error('Failed to toggle alert:', e);
            setNotifications(prev => ({ ...prev, [key]: !checked }));
            toast.error("Failed to update alert setting");
        } finally {
            setUpdatingEmail(null);
        }
    }, []);

    const configuredAgencyAiCount = agencies.filter((agency) => Boolean(agency.aiConfig)).length;
    const enabledEmailCategoryCount = Object.values(emailCategories).filter(Boolean).length;
    const enabledNotificationCount = Object.values(notificationDefaults).filter(Boolean).length;
    const promptOverrideCount = Object.values(promptConfig).filter(
        (config) => (config?.standard?.trim().length ?? 0) > 0 || (config?.live?.trim().length ?? 0) > 0,
    ).length;

    const getSectionStatus = useCallback(
        (key: SettingsSectionKey) => {
            switch (key) {
                case "platform":
                    return platform.supportEmail ? "Ready" : "Needs email";
                case "email":
                    return emailGlobalEnabled ? `${enabledEmailCategoryCount} categories on` : "Emails off";
                case "security":
                    return security.enforceStrongPasswords ? "Strong passwords" : "Review policy";
                case "ai":
                    return defaultAiConfigured ? `${configuredAgencyAiCount}/${agencies.length} agencies` : "Default not set";
                case "notifications":
                    return `${enabledNotificationCount} types on`;
                case "prompts":
                    return promptOverrideCount > 0 ? `${promptOverrideCount} overrides` : "Built-in prompts";
                case "blogs":
                    return "Manage content";
                case "system":
                    return "Read only";
            }
        },
        [
            agencies.length,
            configuredAgencyAiCount,
            defaultAiConfigured,
            emailGlobalEnabled,
            enabledEmailCategoryCount,
            enabledNotificationCount,
            platform.supportEmail,
            promptOverrideCount,
            security.enforceStrongPasswords,
        ],
    );

    if (loading) {
        return (
            <div className="space-y-6" aria-busy="true" aria-label="Loading system settings">
                <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <div className="space-y-2">
                            <div className="h-5 w-40 rounded-lg bg-muted" />
                            <div className="h-4 w-72 max-w-full rounded-lg bg-muted" />
                        </div>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="h-28 rounded-2xl border border-border bg-card" />
                    <div className="h-28 rounded-2xl border border-border bg-card" />
                    <div className="h-28 rounded-2xl border border-border bg-card" />
                </div>
                <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="h-96 rounded-2xl border border-border bg-card" />
                    <div className="space-y-4">
                        <div className="h-28 rounded-2xl border border-border bg-card" />
                        <div className="h-28 rounded-2xl border border-border bg-card" />
                        <div className="h-28 rounded-2xl border border-border bg-card" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Super-admin Control Center
                        </p>
                        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                            Configure platform defaults, communication rules, AI runtime behavior, prompt overrides, and public blog controls from one organized workspace.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setAllSections(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                        >
                            <ChevronDown className="h-4 w-4" />
                            Open all
                        </button>
                        <button
                            type="button"
                            onClick={() => setAllSections(false)}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                        >
                            <ChevronUp className="h-4 w-4" />
                            Collapse all
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <SettingsSummaryCard
                    label="Agencies"
                    value={String(agencies.length)}
                    detail={`${configuredAgencyAiCount} with dedicated AI config`}
                    icon={<Brain className="h-5 w-5" />}
                />
                <SettingsSummaryCard
                    label="Communication"
                    value={emailGlobalEnabled ? "Email on" : "Email off"}
                    detail={`${enabledEmailCategoryCount} email categories, ${enabledNotificationCount} notification types`}
                    icon={<Mail className="h-5 w-5" />}
                />
                <SettingsSummaryCard
                    label="Governance"
                    value={security.enforceStrongPasswords ? "Protected" : "Needs review"}
                    detail={`${promptOverrideCount} prompt overrides active`}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                <SettingsMap sections={SETTINGS_SECTIONS} getStatus={getSectionStatus} />
                <div className="space-y-4">

            {/* Platform Info */}
            <SystemSettingsSectionAccordion
                id="settings-platform"
                title="Platform Information"
                description="Platform name, support email, and defaults for new agencies."
                icon={<Globe className="h-6 w-6 text-blue-500" />}
                iconBg="bg-blue-500/10"
                status={getSectionStatus("platform")}
                isOpen={!!openSections.platform}
                onToggle={() => toggleSection('platform')}
            >
                <SystemSettingsPlatformSection
                    platform={platform}
                    onChange={(updates) => setPlatform((prev) => ({ ...prev, ...updates }))}
                    onSave={() => handleSave("platform")}
                    saving={saving === "platform"}
                    saved={saved === "platform"}
                />
            </SystemSettingsSectionAccordion>

            {/* Email Services */}
            <SystemSettingsSectionAccordion
                id="settings-email"
                title="Email Services"
                description="Default email settings for all agencies. Each agency can override from their Settings page."
                icon={<Mail className="h-6 w-6 text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                status={getSectionStatus("email")}
                isOpen={!!openSections.email}
                onToggle={() => toggleSection('email')}
            >
                <SystemSettingsEmailGlobalControls
                    emailGlobalEnabled={emailGlobalEnabled}
                    updatingEmail={updatingEmail}
                    onToggle={handleEmailGlobalToggle}
                />
                <SystemSettingsEmailCategorySection
                    emailGlobalEnabled={emailGlobalEnabled}
                    emailCategories={emailCategories}
                    taskEmailEvents={taskEmailEvents}
                    updatingEmail={updatingEmail}
                    onCategoryToggle={handleEmailCategoryToggle}
                    onTaskEventToggle={handleTaskEventToggle}
                />
                <SystemSettingsEmailAdminSection
                    notifications={notifications}
                    updatingEmail={updatingEmail}
                    onToggle={handleSuperAdminAlertToggle}
                />

            </SystemSettingsSectionAccordion>

            {/* Security */}
            <SystemSettingsSectionAccordion
                id="settings-security"
                title="Security"
                description="Authentication, registration, and password policies."
                icon={<Shield className="h-6 w-6 text-green-500" />}
                iconBg="bg-green-500/10"
                status={getSectionStatus("security")}
                isOpen={!!openSections.security}
                onToggle={() => toggleSection('security')}
            >
                <SystemSettingsSecuritySection
                    security={security}
                    onChange={(key, checked) => setSecurity((prev) => ({ ...prev, [key]: checked }))}
                    onSave={() => handleSave("security")}
                    saving={saving === "security"}
                    saved={saved === "security"}
                />
            </SystemSettingsSectionAccordion>

            {/* AI Configuration */}
            <SystemSettingsSectionAccordion
                id="settings-ai"
                title="Singularity AI"
                description="Manage AI provider configuration per agency."
                icon={<Brain className="h-6 w-6 text-purple-500" />}
                iconBg="bg-purple-500/10"
                status={getSectionStatus("ai")}
                isOpen={!!openSections.ai}
                onToggle={() => toggleSection('ai')}
            >
                <SystemSettingsDefaultAiSection
                    defaultAi={defaultAi}
                    availableModels={AI_MODELS[defaultAi.provider] || []}
                    defaultAiConfigured={defaultAiConfigured}
                    savingDefaultAi={savingDefaultAi}
                    savedDefaultAi={savedDefaultAi}
                    featureConfigs={defaultAiFeatureConfigs}
                    onProviderChange={handleDefaultAiProviderChange}
                    onApiKeyChange={handleDefaultAiApiKeyChange}
                    onModelChange={handleDefaultAiModelChange}
                    onCustomModelIdChange={handleDefaultAiCustomModelIdChange}
                    onFeatureConfigChange={(key, value) => setDefaultAiFeatureConfigs((prev) => ({ ...prev, [key]: value }))}
                    onSave={() => { void handleDefaultAiSave(); }}
                    onRemove={() => { void handleDefaultAiRemove(); }}
                />
                <SystemSettingsAiAgencyList agencies={agencies} />
            </SystemSettingsSectionAccordion>

            {/* Notifications */}
            <SystemSettingsSectionAccordion
                id="settings-notifications"
                title="Notifications"
                description="Control which in-app notification types are enabled across all agencies."
                icon={<Bell className="h-6 w-6 text-yellow-500" />}
                iconBg="bg-yellow-500/10"
                status={getSectionStatus("notifications")}
                isOpen={!!openSections.notifications}
                onToggle={() => toggleSection('notifications')}
            >
                <SystemSettingsNotificationsSection
                    notificationDefaults={notificationDefaults}
                    updatingNotif={updatingNotif}
                    onToggle={handleNotifToggle}
                />
            </SystemSettingsSectionAccordion>

            {/* Prompt Management */}
            <SystemSettingsSectionAccordion
                id="settings-prompts"
                title="Prompt Management"
                description="Override AI prompts for each feature. Full replacement — overrides replace the built-in prompts entirely."
                icon={<FileText className="h-6 w-6 text-orange-500" />}
                iconBg="bg-orange-500/10"
                status={getSectionStatus("prompts")}
                isOpen={!!openSections.prompts}
                onToggle={() => toggleSection('prompts')}
            >
                <SystemSettingsPromptSection
                    promptConfig={promptConfig}
                    saving={savingPrompt}
                    saved={savedPrompt}
                    onSave={(config) => { setPromptConfig(config); void handleSavePromptConfig(config); }}
                />
            </SystemSettingsSectionAccordion>

            {/* Blog Management */}
            <SystemSettingsSectionAccordion
                id="settings-blogs"
                title="Blog Management"
                description="Manage and publish blogs from AI Blogger and other sources"
                icon={<FileText className="h-6 w-6 text-blue-500" />}
                iconBg="bg-blue-500/10"
                status={getSectionStatus("blogs")}
                isOpen={!!openSections.blogs}
                onToggle={() => toggleSection('blogs')}
            >
                <SystemSettingsBlogManagementSection />
            </SystemSettingsSectionAccordion>

            {/* System Info */}
            <SystemSettingsSectionAccordion
                id="settings-system"
                title="System Information"
                description="Platform version and environment details."
                icon={<Database className="h-6 w-6 text-indigo-500" />}
                iconBg="bg-indigo-500/10"
                status={getSectionStatus("system")}
                isOpen={!!openSections.system}
                onToggle={() => toggleSection('system')}
            >
                <SystemSettingsInfoSection
                    platformName={platform.name}
                    lastRestartText={fmt.date(new Date())}
                />
            </SystemSettingsSectionAccordion>
                </div>
            </div>
        </div>
    );
}
