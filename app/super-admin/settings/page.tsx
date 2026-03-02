"use client";

import { useState } from "react";
import { Settings, Shield, Bell, Database, Globe, Check } from "lucide-react";

export default function SystemSettingsPage() {
    const [saved, setSaved] = useState("");

    const handleSave = (section: string) => {
        setSaved(section);
        setTimeout(() => setSaved(""), 2500);
    };

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
                            defaultValue="AgencyOS"
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Support Email</label>
                        <input
                            type="email"
                            defaultValue="support@agencyos.com"
                            className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Default Timezone</label>
                        <select className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                            <option value="UTC">UTC</option>
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Default Currency</label>
                        <select className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                    >
                        {saved === "platform" ? <><Check className="w-4 h-4" /> Saved!</> : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* Security */}
            <div className="bg-card rounded-lg shadow border border-border p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    <h2 className="text-lg font-bold text-foreground">Security</h2>
                </div>
                <div className="space-y-4">
                    {[
                        { label: "Require email verification for new users", defaultChecked: false },
                        { label: "Enable two-factor authentication globally", defaultChecked: false },
                        { label: "Allow agencies to register themselves", defaultChecked: false },
                        { label: "Enforce strong passwords", defaultChecked: true },
                    ].map((item) => (
                        <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                defaultChecked={item.defaultChecked}
                                className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-foreground group-hover:text-foreground">{item.label}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave("security")}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                    >
                        {saved === "security" ? <><Check className="w-4 h-4" /> Saved!</> : "Save Security Settings"}
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
                    {[
                        { label: "Email alerts when a new agency is created", defaultChecked: true },
                        { label: "Email alerts when an agency is suspended", defaultChecked: true },
                        { label: "Weekly summary report to super-admin email", defaultChecked: false },
                    ].map((item) => (
                        <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                defaultChecked={item.defaultChecked}
                                className="w-4 h-4 rounded border-border text-yellow-500 focus:ring-yellow-500"
                            />
                            <span className="text-sm text-foreground">{item.label}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => handleSave("notifications")}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition"
                    >
                        {saved === "notifications" ? <><Check className="w-4 h-4" /> Saved!</> : "Save Notification Settings"}
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
                        { label: "Platform", value: "AgencyOS" },
                        { label: "Version", value: "1.0.0" },
                        { label: "Framework", value: "Next.js 15" },
                        { label: "Database", value: "MongoDB" },
                        { label: "Environment", value: process.env.NODE_ENV || "development" },
                        { label: "Last Restart", value: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
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
