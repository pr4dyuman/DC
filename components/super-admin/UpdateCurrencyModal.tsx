"use client";

import { DollarSign, X } from "lucide-react";
import { CURRENCIES } from "@/lib/currency";
import type { AgencyActionAgency } from "./agency-actions-shared";

type UpdateCurrencyModalProps = {
    agency: AgencyActionAgency;
    selectedCurrency: string;
    loading: boolean;
    error: string;
    setSelectedCurrency: (currency: string) => void;
    resetModal: () => void;
    handleUpdateCurrency: () => void;
};

export function UpdateCurrencyModal({
    agency,
    selectedCurrency,
    loading,
    error,
    setSelectedCurrency,
    resetModal,
    handleUpdateCurrency,
}: UpdateCurrencyModalProps) {
    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Change Currency</h2>
                        <p className="text-sm text-muted-foreground">{agency.name}</p>
                    </div>
                </div>
                <button onClick={resetModal} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Currency Select */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Select Currency</label>
                <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                    {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol}) — {c.name}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                    This currency will be used for all financial data in this agency&apos;s dashboard.
                </p>
            </div>

            {/* Error */}
            {error && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={handleUpdateCurrency}
                    disabled={loading}
                    className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                >
                    {loading ? "Saving..." : "Save Currency"}
                </button>
                <button
                    onClick={resetModal}
                    className="flex-1 h-10 border border-border hover:bg-muted text-foreground rounded-lg text-sm font-medium transition"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
