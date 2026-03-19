"use client";

import { AlertTriangle, Ban, Eye, EyeOff, Lock, X } from "lucide-react";
import { AgencyActionAgency } from "./agency-actions-shared";

type SuspendAgencyModalProps = {
    agency: AgencyActionAgency;
    reason: string;
    password: string;
    showPassword: boolean;
    loading: boolean;
    error: string;
    setReason: (value: string) => void;
    setPassword: (value: string) => void;
    setShowPassword: (value: boolean) => void;
    setError: (value: string) => void;
    resetModal: () => void;
    handleSuspend: () => void;
};

export function SuspendAgencyModal({
    agency,
    reason,
    password,
    showPassword,
    loading,
    error,
    setReason,
    setPassword,
    setShowPassword,
    setError,
    resetModal,
    handleSuspend,
}: SuspendAgencyModalProps) {
    return (
        <>
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Ban className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Suspend Agency</h3>
                        <p className="text-sm text-muted-foreground">This will disable access for all users</p>
                    </div>
                    <button onClick={resetModal} className="ml-auto p-1 hover:bg-muted rounded-lg">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>
            <div className="p-6 space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-400">
                            Suspending <strong>{agency.name}</strong> will lock all users out immediately.
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Reason for suspension</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                        rows={2}
                        placeholder="e.g. Non-payment, TOS violation..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                        <Lock className="w-3.5 h-3.5 inline mr-1" />
                        Super Admin Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError("");
                            }}
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            placeholder="Enter your password"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
                <button
                    onClick={handleSuspend}
                    disabled={loading || !password}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Suspending..." : "Confirm Suspension"}
                </button>
                <button onClick={resetModal} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm">
                    Cancel
                </button>
            </div>
        </>
    );
}
