"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, Bell, Database, Globe, Check, Mail, AlertTriangle, Loader2, Brain, ChevronRight, ChevronDown, Zap, Sparkles } from "lucide-react";
import { useDateFormat } from "@/context/TimezoneContext";
import { CURRENCIES } from "@/lib/currency";
import { getSystemSettings, updateSystemSettings, getAllAgenciesWithStats, getDefaultAiConfig, saveDefaultAiConfig } from "@/lib/actions/super-admin";
import { AI_MODELS } from "@/lib/ai-models";
import { AIConfig, Agency, AIProvider } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { EMAIL_CATEGORY_INFO, DEFAULT_EMAIL_CATEGORIES, TASK_EMAIL_EVENTS, DEFAULT_TASK_EMAIL_EVENTS } from "@/lib/email-constants";
import type { EmailCategory, TaskEmailEventKey, TaskEmailEventConfig } from "@/lib/email-constants";
import { toast } from "sonner";

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

    // Platform state
    const [platform, setPlatform] = useState({
        name: "AgencyOS",
        supportEmail: "support@agencyos.com",
        defaultCurrency: "USD",
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
                    if (typeof settings.emailDefaults.globalEnabled === 'boolean') setEmailGlobalEnabled(settings.emailDefaults.globalEnabled);
                    const cats: Record<string, boolean> = { ...DEFAULT_EMAIL_CATEGORIES };
                    for (const key of Object.keys(DEFAULT_EMAIL_CATEGORIES)) {
                        if (typeof settings.emailDefaults[key] === 'boolean') cats[key] = settings.emailDefaults[key];
                    }
                    setEmailCategories(cats);
                    if (settings.emailDefaults.taskEmailEvents) {
                        setTaskEmailEvents(prev => {
                            const merged = { ...prev };
                            for (const eventKey of Object.keys(prev) as TaskEmailEventKey[]) {
                                if (settings.emailDefaults.taskEmailEvents[eventKey]) {
                                    merged[eventKey] = { ...prev[eventKey], ...settings.emailDefaults.taskEmailEvents[eventKey] };
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
            <SectionAccordion
                title="Platform Information"
                description="Platform name, support email, and defaults for new agencies."
                icon={<Globe className="h-6 w-6 text-blue-500" />}
                iconBg="bg-blue-500/10"
                isOpen={!!openSections.platform}
                onToggle={() => toggleSection('platform')}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Platform Name</label>
                        <input
                            type="text"
                            value={platform.name}
                            onChange={e => setPlatform(p => ({ ...p, name: e.target.value }))}
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Support Email</label>
                        <input
                            type="email"
                            value={platform.supportEmail}
                            onChange={e => setPlatform(p => ({ ...p, supportEmail: e.target.value }))}
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Default Currency</label>
                        <select
                            value={platform.defaultCurrency}
                            onChange={e => setPlatform(p => ({ ...p, defaultCurrency: e.target.value }))}
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        >
                            {CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">This currency is used across all dashboards, invoices, and reports</p>
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">These are the defaults for new agencies</p>
                    <button
                        onClick={() => handleSave("platform")}
                        disabled={!!saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                    >
                        {saving === "platform" ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            : saved === "platform" ? <><Check className="w-4 h-4" /> Saved!</>
                                : "Save Changes"}
                    </button>
                </div>
            </SectionAccordion>

            {/* Email Services */}
            <SectionAccordion
                title="Email Services"
                description="Default email settings for all agencies. Each agency can override from their Settings page."
                icon={<Mail className="h-6 w-6 text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                isOpen={!!openSections.email}
                onToggle={() => toggleSection('email')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Global Email Service</span>
                        {updatingEmail === 'global' && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                    </div>
                    <Switch
                        checked={emailGlobalEnabled}
                        onCheckedChange={handleEmailGlobalToggle}
                        disabled={updatingEmail === 'global'}
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

                {emailGlobalEnabled && (
                    <div className="space-y-1">
                        {(Object.entries(EMAIL_CATEGORY_INFO) as [EmailCategory, typeof EMAIL_CATEGORY_INFO[EmailCategory]][]).map(([key, info]) => {
                            const isOn = emailCategories[key] ?? DEFAULT_EMAIL_CATEGORIES[key];
                            const isUpdating = updatingEmail === key;
                            return (
                                <div key={key}>
                                    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`p-1.5 rounded-md ${info.priority === 'critical' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                                                {info.priority === 'critical'
                                                    ? <Shield className="h-4 w-4 text-amber-500" />
                                                    : <Zap className="h-4 w-4 text-blue-500" />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-foreground">{info.label}</span>
                                                    <span className={`text-[10px] px-1.5 py-0 rounded-full border ${
                                                        info.priority === 'critical'
                                                            ? 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                                                            : 'border-blue-500/30 text-blue-500 bg-blue-500/10'
                                                    }`}>
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
                                                onCheckedChange={(checked) => handleEmailCategoryToggle(key, checked)}
                                                disabled={!!updatingEmail}
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
                                                                {updatingEmail === `event-${eventKey}-enabled` && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                                                <Switch
                                                                    checked={eventConfig.enabled}
                                                                    onCheckedChange={(checked) => handleTaskEventToggle(eventKey, 'enabled', checked)}
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
                                                                            onCheckedChange={(checked) => handleTaskEventToggle(eventKey, 'notifyAssignee', checked)}
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
                                                                            onCheckedChange={(checked) => handleTaskEventToggle(eventKey, 'notifyClient', checked)}
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
                )}

                <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Super-Admin Email Alerts</p>
                    <p className="text-xs text-muted-foreground mb-2">Receive email notifications for important platform events.</p>
                    <div className="space-y-1">
                        {([
                            { key: "emailOnAgencyCreated", label: "New agency created", desc: "Get notified when a new agency registers on the platform" },
                            { key: "emailOnAgencySuspended", label: "Agency suspended", desc: "Get notified when an agency is suspended" },
                            { key: "weeklySummary", label: "Weekly summary report", desc: "Receive a weekly summary of platform activity (coming soon)", disabled: true },
                        ] as const).map((item) => (
                            <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="min-w-0">
                                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    {updatingEmail === `sa-${item.key}` && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    <Switch
                                        checked={notifications[item.key]}
                                        onCheckedChange={(checked) => handleSuperAdminAlertToggle(item.key, checked)}
                                        disabled={!!updatingEmail || ('disabled' in item && item.disabled)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Anti-Spam Setup (DNS)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {["SPF Record", "DKIM Signing", "DMARC Policy"].map((dns) => (
                            <div key={dns} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{dns}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Configure these in your Brevo dashboard → Settings → Senders & Domains → Authenticate domain
                    </p>
                </div>
            </SectionAccordion>

            {/* Security */}
            <SectionAccordion
                title="Security"
                description="Authentication, registration, and password policies."
                icon={<Shield className="h-6 w-6 text-green-500" />}
                iconBg="bg-green-500/10"
                isOpen={!!openSections.security}
                onToggle={() => toggleSection('security')}
            >
                <div className="space-y-4">
                    {([
                        { key: "requireEmailVerification", label: "Require email verification for new users", hint: "Always enforced — OTP required at signup", disabled: true },
                        { key: "enableTwoFactor", label: "Enable two-factor authentication globally", hint: "Coming soon", disabled: true },
                        { key: "allowSelfRegistration", label: "Allow agencies to register themselves", hint: "Controls whether the Get Started signup page accepts new registrations", disabled: false },
                        { key: "enforceStrongPasswords", label: "Enforce strong passwords", hint: "Requires 10+ chars, uppercase, lowercase, number, and special character", disabled: false },
                    ] as const).map((item) => (
                        <div key={item.key} className="flex items-start gap-3 group">
                            <input
                                type="checkbox"
                                checked={security[item.key]}
                                onChange={e => !item.disabled && setSecurity(s => ({ ...s, [item.key]: e.target.checked }))}
                                disabled={item.disabled}
                                className="w-4 h-4 mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <div>
                                <span className={`text-sm text-foreground ${item.disabled ? 'opacity-60' : 'group-hover:text-foreground'}`}>{item.label}</span>
                                {item.hint && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave("security")}
                        disabled={!!saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                    >
                        {saving === "security" ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            : saved === "security" ? <><Check className="w-4 h-4" /> Saved!</>
                                : "Save Security Settings"}
                    </button>
                </div>
            </SectionAccordion>

            {/* AI Configuration */}
            <SectionAccordion
                title="Singularity AI"
                description="Manage AI provider configuration per agency."
                icon={<Brain className="h-6 w-6 text-purple-500" />}
                iconBg="bg-purple-500/10"
                isOpen={!!openSections.ai}
                onToggle={() => toggleSection('ai')}
            >
                {/* Default AI for Signups */}
                <div className="border border-purple-500/20 rounded-lg p-4 mb-4 bg-purple-500/5">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        Default AI for New Signups
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                        This config is automatically applied when a new agency registers via signup.
                        All trial agencies will share this API key.
                    </p>

                    <div className="space-y-3">
                        {/* Provider */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Provider</label>
                            <select
                                value={defaultAi.provider}
                                onChange={e => {
                                    const p = e.target.value as AIProvider;
                                    setDefaultAi(prev => ({ ...prev, provider: p, model: AI_MODELS[p]?.[0]?.id || '', customModelId: '' }));
                                }}
                                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                <option value="gemini">Google Gemini</option>
                                <option value="openai">OpenAI</option>
                                <option value="nvidia">NVIDIA NIM</option>
                                <option value="github">GitHub Models</option>
                            </select>
                        </div>

                        {/* API Key */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">API Key</label>
                            <input
                                type="password"
                                value={defaultAi.apiKey}
                                onChange={e => setDefaultAi(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder={defaultAiConfigured ? "Key configured — enter new key to change" : "Enter API key..."}
                                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            {defaultAiConfigured && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">Leave empty to keep existing key</p>
                            )}
                        </div>

                        {/* Model */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
                            <select
                                value={defaultAi.model}
                                onChange={e => setDefaultAi(prev => ({ ...prev, model: e.target.value, customModelId: e.target.value !== 'custom' ? '' : prev.customModelId }))}
                                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                <option value="">Select a model...</option>
                                {(AI_MODELS[defaultAi.provider] || []).map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {defaultAi.model === 'custom' && (
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Custom Model ID</label>
                                <input
                                    type="text"
                                    value={defaultAi.customModelId}
                                    onChange={e => setDefaultAi(prev => ({ ...prev, customModelId: e.target.value }))}
                                    placeholder="e.g. ft:gpt-4o:custom-model"
                                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                onClick={async () => {
                                    if (!defaultAi.apiKey && !defaultAiConfigured) return;
                                    if (!defaultAi.model) return;
                                    setSavingDefaultAi(true);
                                    try {
                                        const configToSave: AIConfig = {
                                            provider: defaultAi.provider,
                                            apiKey: defaultAi.apiKey || '', // Empty = keep existing (server handles it)
                                            model: defaultAi.model,
                                        };
                                        if (defaultAi.customModelId) configToSave.customModelId = defaultAi.customModelId;
                                        await saveDefaultAiConfig(configToSave);
                                        setDefaultAiConfigured(true);
                                        setDefaultAi(prev => ({ ...prev, apiKey: '' })); // Clear after save
                                        setSavedDefaultAi('Saved!');
                                        setTimeout(() => setSavedDefaultAi(''), 3000);
                                    } catch (err) {
                                        const message = getErrorMessage(err, 'Failed to save default AI config');
                                        toast.error(message);
                                        setSavedDefaultAi(message);
                                        setTimeout(() => setSavedDefaultAi(''), 3000);
                                    } finally {
                                        setSavingDefaultAi(false);
                                    }
                                }}
                                disabled={savingDefaultAi || !defaultAi.model || (!defaultAi.apiKey && !defaultAiConfigured)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                            >
                                {savingDefaultAi ? 'Saving...' : defaultAiConfigured ? 'Update Default' : 'Set Default'}
                            </button>
                            {defaultAiConfigured && (
                                <button
                                    onClick={async () => {
                                        setSavingDefaultAi(true);
                                        try {
                                            await saveDefaultAiConfig(null);
                                            setDefaultAi({ provider: 'gemini', apiKey: '', model: '', customModelId: '' });
                                            setDefaultAiConfigured(false);
                                            setSavedDefaultAi('Removed');
                                            setTimeout(() => setSavedDefaultAi(''), 3000);
                                        } catch {
                                            toast.error('Failed to remove default AI config');
                                        } finally { setSavingDefaultAi(false); }
                                    }}
                                    className="px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-medium transition"
                                >
                                    Remove Default
                                </button>
                            )}
                            {savedDefaultAi && <span className="text-xs text-green-500">{savedDefaultAi}</span>}
                        </div>
                    </div>
                </div>

                {/* Per-Agency AI Config List */}
                {agencies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No agencies found.</p>
                ) : (
                    <div className="divide-y divide-border">
                        {agencies.map((agency) => (
                            <Link
                                key={agency.id}
                                href={`/super-admin/settings/ai/${agency.id}`}
                                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/40 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${agency.aiConfig ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                                    <div>
                                        <span className="text-sm font-medium text-foreground">{agency.name}</span>
                                        <p className="text-xs text-muted-foreground">
                                            {agency.aiConfig
                                                ? `${agency.aiConfig.provider?.charAt(0).toUpperCase()}${agency.aiConfig.provider?.slice(1)} · ${agency.aiConfig.model || "configured"}`
                                                : "Not configured"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${agency.aiConfig ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                                        {agency.aiConfig ? "Active" : "Off"}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </SectionAccordion>

            {/* Notifications */}
            <SectionAccordion
                title="Notifications"
                description="Control which in-app notification types are enabled across all agencies."
                icon={<Bell className="h-6 w-6 text-yellow-500" />}
                iconBg="bg-yellow-500/10"
                isOpen={!!openSections.notifications}
                onToggle={() => toggleSection('notifications')}
            >
                <p className="text-xs text-muted-foreground mb-3">
                    Toggle notification types on or off. When disabled, no in-app notifications of that type will
                    be created for any user across all agencies.
                </p>
                <div className="space-y-1">
                    {([
                        { key: "welcome", label: "Welcome & Onboarding", desc: "Welcome messages when new employees or clients are added", icon: "👋" },
                        { key: "project", label: "Project Updates", desc: "Project status changes, completions, and auto-completion alerts", icon: "📁" },
                        { key: "task", label: "Task Notifications", desc: "Task assignments, status updates, and comments", icon: "✅" },
                        { key: "invoice", label: "Invoice & Billing", desc: "Invoice generation, payment pending, approved, and rejected", icon: "🧾" },
                        { key: "salary", label: "Salary & Payroll", desc: "Salary payment confirmations sent to employees", icon: "💰" },
                        { key: "leave", label: "Leave Management", desc: "Leave requests, approvals, rejections, and cancellations", icon: "🏖️" },
                        { key: "refund", label: "Refunds", desc: "Refund issued notifications sent to clients", icon: "↩️" },
                        { key: "document", label: "Document Approvals", desc: "Document update requests and admin approvals/rejections", icon: "📄" },
                        { key: "security", label: "Security Alerts", desc: "Password reset notifications and security warnings", icon: "🔒" },
                    ] as const).map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-lg">{item.icon}</span>
                                <div className="min-w-0">
                                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                                    <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                                {updatingNotif === item.key && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                <Switch
                                    checked={notificationDefaults[item.key] ?? true}
                                    onCheckedChange={(checked) => handleNotifToggle(item.key, checked)}
                                    disabled={!!updatingNotif}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </SectionAccordion>

            {/* System Info */}
            <SectionAccordion
                title="System Information"
                description="Platform version and environment details."
                icon={<Database className="h-6 w-6 text-indigo-500" />}
                iconBg="bg-indigo-500/10"
                isOpen={!!openSections.system}
                onToggle={() => toggleSection('system')}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: "Platform", value: platform.name },
                        { label: "Version", value: "1.0.0" },
                        { label: "Framework", value: "Next.js 16" },
                        { label: "Database", value: "MongoDB" },
                        { label: "Environment", value: "Production" },
                        { label: "Last Restart", value: fmt.date(new Date()) },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <span className="text-sm font-medium text-foreground">{item.value}</span>
                        </div>
                    ))}
                </div>
            </SectionAccordion>
        </div>
    );
}

// Reusable collapsible section component (matches admin settings pattern)
function SectionAccordion({
    title, description, icon, iconBg, isOpen, onToggle, children
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="w-full text-left flex flex-row items-center justify-between p-6 hover:bg-accent/50 transition-colors"
            >
                <span className="flex items-center gap-4">
                    <span className={`p-2 ${iconBg} rounded-full inline-flex`}>
                        {icon}
                    </span>
                    <span>
                        <span className="block text-lg font-semibold">{title}</span>
                        <span className="block text-sm text-muted-foreground">{description}</span>
                    </span>
                </span>
                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </button>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
