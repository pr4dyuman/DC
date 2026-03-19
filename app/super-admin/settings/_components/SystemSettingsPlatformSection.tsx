"use client";

import { Check, Loader2 } from "lucide-react";
import { CURRENCIES } from "@/lib/currency";

interface PlatformSettings {
    name: string;
    supportEmail: string;
    defaultCurrency: string;
}

interface SystemSettingsPlatformSectionProps {
    platform: PlatformSettings;
    onChange: (updates: Partial<PlatformSettings>) => void;
    onSave: () => void;
    saving: boolean;
    saved: boolean;
}

export function SystemSettingsPlatformSection({
    platform,
    onChange,
    onSave,
    saving,
    saved,
}: SystemSettingsPlatformSectionProps) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Platform Name</label>
                    <input
                        type="text"
                        value={platform.name}
                        onChange={(event) => onChange({ name: event.target.value })}
                        className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Support Email</label>
                    <input
                        type="email"
                        value={platform.supportEmail}
                        onChange={(event) => onChange({ supportEmail: event.target.value })}
                        className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Default Currency</label>
                    <select
                        value={platform.defaultCurrency}
                        onChange={(event) => onChange({ defaultCurrency: event.target.value })}
                        className="w-full h-10 rounded-lg border border-border bg-background px-4 text-sm text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    >
                        {CURRENCIES.map((currency) => (
                            <option key={currency.code} value={currency.code}>
                                {currency.code} ({currency.symbol}) - {currency.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">This currency is used across all dashboards, invoices, and reports</p>
                </div>
            </div>
            <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">These are the defaults for new agencies</p>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </>
                    ) : saved ? (
                        <>
                            <Check className="w-4 h-4" /> Saved!
                        </>
                    ) : (
                        "Save Changes"
                    )}
                </button>
            </div>
        </>
    );
}
