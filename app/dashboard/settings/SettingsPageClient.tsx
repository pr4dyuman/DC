"use client";

import { useState, useEffect, useCallback } from "react";
import { getAgencySettings, getCurrentUser } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Agency } from "@/lib/types";
import {
    ChevronDown, ChevronRight, Settings, Shield, Palette,
    Sun, Moon, Lock, Bot
} from "lucide-react";
import { toast } from "sonner";
import PermissionSettings from "@/components/settings/PermissionSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { useTheme } from "@/components/providers/ThemeProvider";
import { AISettings } from "@/components/settings/AISettings";

type AgencyEmailCategories = Agency["settings"]["emailCategories"];

type AgencySettingsData = {
    name: string;
    logo: string;
    primaryColor?: string;
    secondaryColor?: string;
    emailNotificationsEnabled: boolean;
    emailCategories?: AgencyEmailCategories;
};

export default function SettingsPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [currentRole, setCurrentRole] = useState<string | null>(null);

    // Agency settings (shared between AgencySettings + EmailSettings)
    const [agencySettings, setAgencySettings] = useState<AgencySettingsData | null>(null);
    const [agencySettingsLoading, setAgencySettingsLoading] = useState(true);

    // Section Visibility State — first section auto-opens
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            const section = url.searchParams.get('section');
            if (section) {
                return { [section]: true };
            }
        }
        return { appearance: true };
    });

    const { theme, setTheme } = useTheme();

    const toggleSection = useCallback((key: string) => {
        setOpenSections(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            queueMicrotask(() => {
                const url = new URL(window.location.href);
                const openKeys = Object.entries(newState).filter(([, v]) => v).map(([k]) => k);
                if (openKeys.length === 1) {
                    url.searchParams.set('section', openKeys[0]);
                } else {
                    url.searchParams.delete('section');
                }
                window.history.replaceState({}, '', url.pathname + url.search);
            });
            return newState;
        });
    }, []);

    const loadAgencySettings = useCallback(async () => {
        try {
            const settings = await getAgencySettings();
            setAgencySettings(settings ? {
                name: settings.name,
                logo: settings.logo,
                primaryColor: settings.primaryColor,
                secondaryColor: settings.secondaryColor,
                emailNotificationsEnabled: settings.emailNotificationsEnabled ?? true,
                emailCategories: settings.emailCategories || {}
            } : null);
        } catch (error) {
            console.error("Failed to load agency settings", error);
            toast.error("Failed to load agency settings");
        } finally {
            setAgencySettingsLoading(false);
        }
    }, []);

    // Role guard — only admin/manager can access settings
    useEffect(() => {
        getCurrentUser().then(user => {
            if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
                router.replace('/dashboard');
            } else {
                setCurrentRole(user.role);
                setAuthorized(true);
            }
        });
    }, [router]);

    useEffect(() => {
        if (!authorized) return;
        loadAgencySettings();
    }, [authorized, loadAgencySettings]);

    // Block render until role is verified
    if (!authorized) return null;

    return (
        <div className="space-y-6 p-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your agency configurations and preferences.</p>
            </div>

            {/* Appearance Section */}
            <SectionAccordion
                title="Appearance"
                description="Customize the look and feel."
                icon={<Palette className="h-6 w-6 text-sky-500" />}
                iconBg="bg-sky-500/10"
                isOpen={!!openSections.appearance}
                onToggle={() => toggleSection('appearance')}
            >
                <Label className="text-sm font-medium mb-4 block">Theme</Label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                    {/* Dark Theme Card */}
                    <button
                        onClick={() => setTheme("dark")}
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${theme === "dark"
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border hover:border-muted-foreground/30"
                            }`}
                    >
                        <div className="w-full aspect-[4/3] rounded-lg bg-black border border-neutral-800 p-2 flex flex-col gap-1">
                            <div className="h-1.5 w-8 rounded bg-neutral-700" />
                            <div className="h-1.5 w-12 rounded bg-neutral-800" />
                            <div className="flex-1 rounded bg-neutral-900 mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            <span className="text-sm font-medium">Dark</span>
                        </div>
                        {theme === "dark" && (
                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                        )}
                    </button>

                    {/* Light Theme Card */}
                    <button
                        onClick={() => setTheme("light")}
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${theme === "light"
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border hover:border-muted-foreground/30"
                            }`}
                    >
                        <div className="w-full aspect-[4/3] rounded-lg bg-gray-100 border border-gray-200 p-2 flex flex-col gap-1">
                            <div className="h-1.5 w-8 rounded bg-gray-300" />
                            <div className="h-1.5 w-12 rounded bg-gray-200" />
                            <div className="flex-1 rounded bg-white mt-1 border border-gray-200" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            <span className="text-sm font-medium">Light</span>
                        </div>
                        {theme === "light" && (
                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Your preference is saved automatically.</p>
            </SectionAccordion>

            {currentRole === 'admin' && (
                <SectionAccordion
                    title="Permission Management"
                    description="Configure user access and roles."
                    icon={<Shield className="h-6 w-6 text-purple-500" />}
                    iconBg="bg-purple-500/10"
                    isOpen={!!openSections.permissions}
                    onToggle={() => toggleSection('permissions')}
                >
                    <PermissionSettings />
                </SectionAccordion>
            )}

            {/* AI Settings Section */}
            <SectionAccordion
                title="AI Settings"
                description="Control Singularity permissions and capabilities."
                icon={<Bot className="h-6 w-6 text-violet-500" />}
                iconBg="bg-violet-500/10"
                isOpen={!!openSections.ai}
                onToggle={() => toggleSection('ai')}
            >
                <AISettings />
            </SectionAccordion>

            {/* Security Section */}
            <SectionAccordion
                title="Security"
                description="Manage passwords and account security."
                icon={<Lock className="h-6 w-6 text-red-500" />}
                iconBg="bg-red-500/10"
                isOpen={!!openSections.security}
                onToggle={() => toggleSection('security')}
            >
                <SecuritySettings />
            </SectionAccordion>

            {/* General Settings Section */}
            <SectionAccordion
                title="General Settings"
                description="Agency branding and system configuration."
                icon={<Settings className="h-6 w-6 text-muted-foreground" />}
                iconBg="bg-gray-500/10"
                isOpen={!!openSections.general}
                onToggle={() => toggleSection('general')}
            >
                <div className="space-y-6">
                    <AgencySettings
                        initialSettings={agencySettings}
                        loading={agencySettingsLoading}
                        onSaved={loadAgencySettings}
                    />
                    <EmailSettings
                        initialEnabled={agencySettings?.emailNotificationsEnabled ?? true}
                        initialCategories={agencySettings?.emailCategories}
                        loading={agencySettingsLoading}
                    />
                </div>
            </SectionAccordion>
        </div>
    );
}

// Reusable collapsible section component
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
