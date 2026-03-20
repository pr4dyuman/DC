"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Bell, Database, Globe, Mail, Loader2, Brain } from "lucide-react";
import { useDateFormat } from "@/context/TimezoneContext";
import { getSystemSettings, updateSystemSettings, getAllAgenciesWithStats, getDefaultAiConfig, saveDefaultAiConfig } from "@/lib/actions/super-admin";
import { AI_MODELS } from "@/lib/ai-models";
import { AIConfig, Agency, AIProvider } from "@/lib/types";
import { DEFAULT_EMAIL_CATEGORIES, DEFAULT_TASK_EMAIL_EVENTS } from "@/lib/email-constants";
import type { EmailCategory, TaskEmailEventKey, TaskEmailEventConfig } from "@/lib/email-constants";
import { toast } from "sonner";
import { SystemSettingsAiAgencyList } from "./_components/SystemSettingsAiAgencyList";
import { SystemSettingsDefaultAiSection, FeatureConfigs } from "./_components/SystemSettingsDefaultAiSection";
import { AIFeatureConfigState } from "./_components/FeatureConfigEditor";
import { SystemSettingsEmailAdminSection } from "./_components/SystemSettingsEmailAdminSection";
import { SystemSettingsEmailCategorySection } from "./_components/SystemSettingsEmailCategorySection";
import { SystemSettingsEmailGlobalControls } from "./_components/SystemSettingsEmailGlobalControls";
import { SystemSettingsInfoSection } from "./_components/SystemSettingsInfoSection";
import { SystemSettingsNotificationsSection } from "./_components/SystemSettingsNotificationsSection";
import { SystemSettingsPlatformSection } from "./_components/SystemSettingsPlatformSection";
import { SystemSettingsSectionAccordion } from "./_components/SystemSettingsSectionAccordion";
import { SystemSettingsSecuritySection } from "./_components/SystemSettingsSecuritySection";

type AgencyWithStats = Agency & {
    stats: {
        users: number;
        projects: number;
        clients: number;
    };
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
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

    // Email defaults state
    const [emailGlobalEnabled, setEmailGlobalEnabled] = useState(true);
    const [emailCategories, setEmailCategories] = useState<Record<string, boolean>>({ ...DEFAULT_EMAIL_CATEGORIES });
    const [taskEmailEvents, setTaskEmailEvents] = useState<Record<TaskEmailEventKey, TaskEmailEventConfig>>({ ...DEFAULT_TASK_EMAIL_EVENTS });
    const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);

    // Section accordion state — platform open by default
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ platform: true });

    const toggleSection = useCallback((key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Load settings from DB
    useEffect(() => {
        (async () => {
            try {
                const [settings, agencyList] = await Promise.all([
                    getSystemSettings(),
                    getAllAgenciesWithStats()
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
                        for (const key of ["chatConfig", "agentConfig", "taskExplainConfig", "hourEstimateConfig", "taskChatbotConfig"] as const) {
                            const subConf = (daiConfig as Record<string, any>)[key];
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
            for (const key of ["chatConfig", "agentConfig", "taskExplainConfig", "hourEstimateConfig", "taskChatbotConfig"] as const) {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
                <p className="text-muted-foreground mt-1">Configure global platform settings and defaults</p>
            </div>

            {/* Platform Info */}
            <SystemSettingsSectionAccordion
                title="Platform Information"
                description="Platform name, support email, and defaults for new agencies."
                icon={<Globe className="h-6 w-6 text-blue-500" />}
                iconBg="bg-blue-500/10"
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
                title="Email Services"
                description="Default email settings for all agencies. Each agency can override from their Settings page."
                icon={<Mail className="h-6 w-6 text-emerald-500" />}
                iconBg="bg-emerald-500/10"
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
                title="Security"
                description="Authentication, registration, and password policies."
                icon={<Shield className="h-6 w-6 text-green-500" />}
                iconBg="bg-green-500/10"
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
                title="Singularity AI"
                description="Manage AI provider configuration per agency."
                icon={<Brain className="h-6 w-6 text-purple-500" />}
                iconBg="bg-purple-500/10"
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
                title="Notifications"
                description="Control which in-app notification types are enabled across all agencies."
                icon={<Bell className="h-6 w-6 text-yellow-500" />}
                iconBg="bg-yellow-500/10"
                isOpen={!!openSections.notifications}
                onToggle={() => toggleSection('notifications')}
            >
                <SystemSettingsNotificationsSection
                    notificationDefaults={notificationDefaults}
                    updatingNotif={updatingNotif}
                    onToggle={handleNotifToggle}
                />
            </SystemSettingsSectionAccordion>

            {/* System Info */}
            <SystemSettingsSectionAccordion
                title="System Information"
                description="Platform version and environment details."
                icon={<Database className="h-6 w-6 text-indigo-500" />}
                iconBg="bg-indigo-500/10"
                isOpen={!!openSections.system}
                onToggle={() => toggleSection('system')}
            >
                <SystemSettingsInfoSection
                    platformName={platform.name}
                    lastRestartText={fmt.date(new Date())}
                />
            </SystemSettingsSectionAccordion>
        </div>
    );
}
