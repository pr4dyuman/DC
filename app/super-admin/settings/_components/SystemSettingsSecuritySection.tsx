"use client";

import { Check, Loader2 } from "lucide-react";

interface SecuritySettings {
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
    allowSelfRegistration: boolean;
    enforceStrongPasswords: boolean;
}

interface SystemSettingsSecuritySectionProps {
    security: SecuritySettings;
    onChange: (key: keyof SecuritySettings, checked: boolean) => void;
    onSave: () => void;
    saving: boolean;
    saved: boolean;
}

export function SystemSettingsSecuritySection({
    security,
    onChange,
    onSave,
    saving,
    saved,
}: SystemSettingsSecuritySectionProps) {
    return (
        <>
            <div className="space-y-4">
                {([
                    { key: "requireEmailVerification", label: "Require email verification for new users", hint: "Always enforced - OTP required at signup", disabled: true },
                    { key: "enableTwoFactor", label: "Enable two-factor authentication globally", hint: "Coming soon", disabled: true },
                    { key: "allowSelfRegistration", label: "Allow agencies to register themselves", hint: "Controls whether the Get Started signup page accepts new registrations", disabled: false },
                    { key: "enforceStrongPasswords", label: "Enforce strong passwords", hint: "Requires 10+ chars, uppercase, lowercase, number, and special character", disabled: false },
                ] as const).map((item) => (
                    <div key={item.key} className="flex items-start gap-3 group">
                        <input
                            type="checkbox"
                            checked={security[item.key]}
                            onChange={(event) => !item.disabled && onChange(item.key, event.target.checked)}
                            disabled={item.disabled}
                            className="w-4 h-4 mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div>
                            <span className={`text-sm text-foreground ${item.disabled ? "opacity-60" : "group-hover:text-foreground"}`}>{item.label}</span>
                            {item.hint && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-end pt-2">
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
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
                        "Save Security Settings"
                    )}
                </button>
            </div>
        </>
    );
}
