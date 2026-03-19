"use client";

import { Clock, X } from "lucide-react";
import { AgencyActionAgency } from "./agency-actions-shared";

type ExtendTrialModalProps = {
    agency: AgencyActionAgency;
    trialDays: number;
    loading: boolean;
    error: string;
    setTrialDays: (days: number) => void;
    resetModal: () => void;
    handleExtendTrial: () => void;
};

export function ExtendTrialModal({
    agency,
    trialDays,
    loading,
    error,
    setTrialDays,
    resetModal,
    handleExtendTrial,
}: ExtendTrialModalProps) {
    return (
        <>
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Clock className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Extend Trial</h3>
                        <p className="text-sm text-muted-foreground">Extend trial for {agency.name}</p>
                    </div>
                    <button onClick={resetModal} className="ml-auto p-1 hover:bg-muted rounded-lg">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>
            <div className="p-6 space-y-4">
                {agency.trialEndsAt && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                        <p className="text-muted-foreground">
                            Current trial ends: <span className="text-foreground font-medium">{new Date(agency.trialEndsAt).toLocaleDateString()}</span>
                            {new Date(agency.trialEndsAt) < new Date() && (
                                <span className="text-red-500 ml-2">(expired)</span>
                            )}
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Extend by (days)</label>
                    <div className="flex gap-2">
                        {[7, 14, 30].map((days) => (
                            <button
                                key={days}
                                type="button"
                                onClick={() => setTrialDays(days)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                    trialDays === days
                                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                                        : "border-border text-muted-foreground hover:bg-muted/30"
                                }`}
                            >
                                {days} days
                            </button>
                        ))}
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={trialDays}
                            onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                            className="w-20 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
                <button
                    onClick={handleExtendTrial}
                    disabled={loading || !trialDays || trialDays < 1}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Extending..." : `Extend by ${trialDays} Days`}
                </button>
                <button onClick={resetModal} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm">
                    Cancel
                </button>
            </div>
        </>
    );
}
