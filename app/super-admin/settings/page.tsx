"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Bell, Database, Globe, Check, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { useDateFormat } from "@/context/TimezoneContext";
import { getSystemSettings, updateSystemSettings } from "@/lib/actions/super-admin";

export default function SystemSettingsPage() {
    const fmt = useDateFormat();
    const [saving, setSaving] = useState("");
    const [saved, setSaved] = useState("");
    const [loading, setLoading] = useState(true);

    // Platform state
    const [platform, setPlatform] = useState({
        name: "AgencyOS",
        supportEmail: "support@agencyos.com",
        defaultTimezone: "UTC",
        defaultCurrency: "USD",
    });

    // Security state
    const [security, setSecurity] = useState({
        requireEmailVerification: false,
        enableTwoFactor: false,
        allowSelfRegistration: false,
        enforceStrongPasswords: true,
    });

    // Notifications state
    const [notifications, setNotifications] = useState({
        emailOnAgencyCreated: true,
        emailOnAgencySuspended: true,
        weeklySummary: false,
    });

    // Load settings from DB
    useEffect(() => {
        (async () => {
            try {
                const settings = await getSystemSettings();
                if (settings?.platform) setPlatform(prev => ({ ...prev, ...settings.platform }));
                if (settings?.security) setSecurity(prev => ({ ...prev, ...settings.security }));
                if (settings?.notifications) setNotifications(prev => ({ ...prev, ...settings.notifications }));
            } catch (e) {
                console.error("Failed to load settings:", e);
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
        } finally {
            setSaving("");
        }
    }, [platform, security, notifications]);

    const emailCategories = [
        { name: "Account Creation", description: "Login credentials for new employees & clients", priority: "critical", defaultOn: true },
        { name: "Invoice & Payment", description: "Invoice created, payment approved/rejected", priority: "critical", defaultOn: true },
        { name: "Salary & Payroll", description: "Salary payment confirmations", priority: "critical", defaultOn: true },
        { name: "Refund", description: "Refund issued notifications", priority: "critical", defaultOn: true },
        { name: "Project Updates", description: "Project created, status changed, completed", priority: "optional", defaultOn: false },
        { name: "Task Updates", description: "Task assigned, status changed, comments", priority: "optional", defaultOn: false },
        { name: "Leave Management", description: "Leave requested, approved, rejected", priority: "optional", defaultOn: false },
        { name: "Document Approval", description: "Document update requests and responses", priority: "optional", defaultOn: false },
    ];

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
            <div className="bg-card rounded-lg shadow border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-bold text-foreground">Platform Information</h2>
                </div>
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
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Default Timezone</label>
                        <select
                            value={platform.defaultTimezone}
                            onChange={e => setPlatform(p => ({ ...p, defaultTimezone: e.target.value }))}
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        >
                            <option value="UTC">UTC</option>
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Default Currency</label>
                        <select
                            value={platform.defaultCurrency}
                            onChange={e => setPlatform(p => ({ ...p, defaultCurrency: e.target.value }))}
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                        </select>
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
            </div>

            {/* Email Services (read-only reference) */}
            <div className="bg-card rounded-lg shadow border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Mail className="w-5 h-5 text-emerald-500" />
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Email Services</h2>
                        <p className="text-xs text-muted-foreground">Each agency can toggle these categories independently from their Settings page</p>
                    </div>
                </div>

                <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200/80">
                        <strong>Brevo Free Tier:</strong> 300 emails/day. Critical categories (credentials, payments) are ON by default. Optional categories (task/project/leave updates) are OFF to conserve volume.
                    </div>
                </div>

                <div className="space-y-1">
                    {emailCategories.map((cat) => (
                        <div key={cat.name}>
                            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${cat.priority === "critical" ? "bg-amber-500" : "bg-blue-500"}`} />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">{cat.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0 rounded-full border ${cat.priority === "critical"
                                                ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                                                : "border-blue-500/30 text-blue-500 bg-blue-500/10"
                                                }`}>
                                                {cat.priority}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-medium ${cat.defaultOn ? "text-green-500" : "text-muted-foreground"}`}>
                                    {cat.defaultOn ? "ON" : "OFF"}
                                </span>
                            </div>
                            {cat.name === "Task Updates" && (
                                <div className="ml-8 pl-3 border-l-2 border-blue-500/20 py-1 mb-1 space-y-0.5">
                                    <p className="text-[10px] text-muted-foreground mb-1">By priority (agency can toggle per-level):</p>
                                    {[
                                        { label: "High", color: "bg-red-500", on: true },
                                        { label: "Medium", color: "bg-yellow-500", on: false },
                                        { label: "Low", color: "bg-green-500", on: false },
                                    ].map(p => (
                                        <div key={p.label} className="flex items-center justify-between py-0.5 px-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                                                <span className="text-[11px] text-muted-foreground">{p.label}</span>
                                            </div>
                                            <span className={`text-[10px] font-medium ${p.on ? "text-green-500" : "text-muted-foreground"}`}>
                                                {p.on ? "ON" : "OFF"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
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
            </div>

            {/* Security */}
            <div className="bg-card rounded-lg shadow border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    <h2 className="text-lg font-bold text-foreground">Security</h2>
                </div>
                <div className="space-y-4">
                    {([
                        { key: "requireEmailVerification", label: "Require email verification for new users" },
                        { key: "enableTwoFactor", label: "Enable two-factor authentication globally" },
                        { key: "allowSelfRegistration", label: "Allow agencies to register themselves" },
                        { key: "enforceStrongPasswords", label: "Enforce strong passwords" },
                    ] as const).map((item) => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={security[item.key]}
                                onChange={e => setSecurity(s => ({ ...s, [item.key]: e.target.checked }))}
                                className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-foreground group-hover:text-foreground">{item.label}</span>
                        </label>
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
            </div>

            {/* Notifications */}
            <div className="bg-card rounded-lg shadow border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Bell className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-bold text-foreground">Notifications</h2>
                </div>
                <div className="space-y-4">
                    {([
                        { key: "emailOnAgencyCreated", label: "Email alerts when a new agency is created" },
                        { key: "emailOnAgencySuspended", label: "Email alerts when an agency is suspended" },
                        { key: "weeklySummary", label: "Weekly summary report to super-admin email" },
                    ] as const).map((item) => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={notifications[item.key]}
                                onChange={e => setNotifications(n => ({ ...n, [item.key]: e.target.checked }))}
                                className="w-4 h-4 rounded border-border text-yellow-500 focus:ring-yellow-500"
                            />
                            <span className="text-sm text-foreground">{item.label}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave("notifications")}
                        disabled={!!saving}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                    >
                        {saving === "notifications" ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            : saved === "notifications" ? <><Check className="w-4 h-4" /> Saved!</>
                                : "Save Notification Settings"}
                    </button>
                </div>
            </div>

            {/* System Info */}
            <div className="bg-card rounded-lg shadow border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="w-5 h-5 text-purple-500" />
                    <h2 className="text-lg font-bold text-foreground">System Information</h2>
                </div>
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
            </div>
        </div>
    );
}
