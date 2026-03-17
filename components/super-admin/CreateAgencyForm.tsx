"use client";

import { useState, useEffect, useRef } from "react";
import { createAgency, getPublicSecuritySettings } from "@/lib/actions/super-admin";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Upload, X, CheckCircle, XCircle } from "lucide-react";
import type { AgencyPlan } from "@/lib/types";

type StrongPasswordChecks = {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
};

type SimplePasswordChecks = {
    length: boolean;
    hasLetterAndNumber: boolean;
};

export default function CreateAgencyForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [enforceStrong, setEnforceStrong] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string>("");
    const fileRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
        confirmPassword: "",
        ownerPhone: "",
        plan: "free" as AgencyPlan,
        logo: "" as string,
        createdAt: new Date().toISOString().split('T')[0], // Default today, can backdate
    });

    useEffect(() => {
        getPublicSecuritySettings().then((s) => setEnforceStrong(s.enforceStrongPasswords));
    }, []);

    // Password strength checks
    const pw = formData.ownerPassword;
    const strongPwChecks: StrongPasswordChecks = {
        length: pw.length >= 10,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        number: /\d/.test(pw),
        special: /[^A-Za-z0-9]/.test(pw),
    };
    const simplePwChecks: SimplePasswordChecks = {
        length: pw.length >= 6,
        hasLetterAndNumber: /[a-zA-Z]/.test(pw) && /\d/.test(pw),
    };
    const pwChecks = enforceStrong ? strongPwChecks : simplePwChecks;
    const pwValid = Object.values(pwChecks).every(Boolean);
    const passwordsMatch = pw && formData.confirmPassword && pw === formData.confirmPassword;

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError("Logo file is too large. Max 2MB.");
            return;
        }
        // Only allow safe raster image types — block SVG (can contain scripts)
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setError("Unsupported format. Please use PNG, JPG, GIF, or WebP.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setFormData((prev) => ({ ...prev, logo: result }));
            setLogoPreview(result);
        };
        reader.readAsDataURL(file);
    };

    const removeLogo = () => {
        setFormData((prev) => ({ ...prev, logo: "" }));
        setLogoPreview("");
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.name.trim()) { setError("Agency name is required"); return; }
        if (!formData.ownerName.trim()) { setError("Owner name is required"); return; }
        if (!formData.ownerEmail.trim()) { setError("Owner email is required"); return; }
        if (!pwValid) { setError("Password does not meet requirements"); return; }
        if (pw !== formData.confirmPassword) { setError("Passwords do not match"); return; }

        setLoading(true);
        try {
            await createAgency({
                name: formData.name,
                ownerName: formData.ownerName,
                ownerEmail: formData.ownerEmail,
                ownerPassword: formData.ownerPassword,
                ownerPhone: formData.ownerPhone || undefined,
                plan: formData.plan,
                logo: formData.logo || undefined,
                createdAt: formData.createdAt || undefined,
            });
            router.push("/super-admin/agencies");
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to create agency");
        } finally {
            setLoading(false);
        }
    };

    const Check = ({ ok }: { ok: boolean }) =>
        ok ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/40" />;

    return (
        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow border border-border p-6 space-y-6">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* ── Agency Info ── */}
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agency Info</h3>
                <div className="h-px bg-border" />
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Agency Name *</label>
                <input
                    type="text"
                    required
                    maxLength={200}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                    placeholder="Your Agency Name"
                />
            </div>

            {/* Logo Upload */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Agency Logo</label>
                {logoPreview ? (
                    <div className="flex items-center gap-4">
                        <img src={logoPreview} alt="Logo preview" className="w-16 h-16 rounded-lg object-contain border border-border bg-muted/30" />
                        <button
                            type="button"
                            onClick={removeLogo}
                            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-400"
                        >
                            <X className="w-4 h-4" /> Remove
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    >
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload logo</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, GIF, or WebP — max 2MB</p>
                    </div>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleLogoChange} className="hidden" />
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Plan *</label>
                <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as AgencyPlan })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    <option value="free">Free (3 users, 5 projects)</option>
                    <option value="starter">Starter (10 users, 50 projects)</option>
                    <option value="pro">Pro (50 users, 500 projects)</option>
                    <option value="enterprise">Enterprise (Unlimited)</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Created Date</label>
                <input
                    type="date"
                    value={formData.createdAt}
                    onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave as today or set a past date for backdating</p>
            </div>

            {/* ── Owner Account ── */}
            <div className="space-y-1 pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Owner Account</h3>
                <div className="h-px bg-border" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Owner Name *</label>
                    <input
                        type="text"
                        required
                        maxLength={200}
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                        placeholder="Admin / Owner Name"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                    <input
                        type="tel"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                        placeholder="+91 98765 43210"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Owner Email *</label>
                <input
                    type="email"
                    required
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                    placeholder="owner@company.com"
                />
                <p className="text-xs text-muted-foreground mt-1">This will be the admin login email for the agency</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Password *</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.ownerPassword}
                            onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                            className="w-full px-4 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                            placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm Password *</label>
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground ${
                            formData.confirmPassword
                                ? passwordsMatch ? "border-green-500/50" : "border-red-500/50"
                                : "border-border"
                        }`}
                        placeholder="Re-enter password"
                    />
                </div>
            </div>

            {/* Password requirements */}
            {pw && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Password requirements:</p>
                    {enforceStrong ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="flex items-center gap-1.5 text-xs"><Check ok={strongPwChecks.length} /> <span>10+ characters</span></div>
                            <div className="flex items-center gap-1.5 text-xs"><Check ok={strongPwChecks.upper} /> <span>Uppercase letter</span></div>
                            <div className="flex items-center gap-1.5 text-xs"><Check ok={strongPwChecks.lower} /> <span>Lowercase letter</span></div>
                            <div className="flex items-center gap-1.5 text-xs"><Check ok={strongPwChecks.number} /> <span>Number</span></div>
                            <div className="flex items-center gap-1.5 text-xs"><Check ok={strongPwChecks.special} /> <span>Special character</span></div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs"><Check ok={simplePwChecks.length} /> <span>6+ characters</span></div>
                            <div className="flex items-center gap-1.5 text-xs"><Check ok={simplePwChecks.hasLetterAndNumber} /> <span>Letter + number</span></div>
                        </div>
                    )}
                    {formData.confirmPassword && (
                        <div className="flex items-center gap-1.5 text-xs pt-1 border-t border-border/50 mt-1">
                            <Check ok={!!passwordsMatch} /> <span>Passwords match</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-border">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {loading ? "Creating Agency..." : "Create Agency"}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
