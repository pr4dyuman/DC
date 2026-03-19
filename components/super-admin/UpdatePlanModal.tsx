"use client";

import { Shield, X } from "lucide-react";
import type { Agency } from "@/lib/types";
import { AgencyActionAgency, AgencyPlanDuration } from "./agency-actions-shared";

type UpdatePlanModalProps = {
    agency: AgencyActionAgency;
    selectedPlan: Agency["plan"];
    selectedDuration: AgencyPlanDuration;
    loading: boolean;
    error: string;
    setSelectedPlan: (plan: Agency["plan"]) => void;
    setSelectedDuration: (duration: AgencyPlanDuration) => void;
    resetModal: () => void;
    handleUpdatePlan: () => void;
};

export function UpdatePlanModal({
    agency,
    selectedPlan,
    selectedDuration,
    loading,
    error,
    setSelectedPlan,
    setSelectedDuration,
    resetModal,
    handleUpdatePlan,
}: UpdatePlanModalProps) {
    const planUnchanged = selectedPlan === agency.plan && selectedDuration === (agency.planDuration || "lifetime");

    return (
        <>
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Shield className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Change Plan</h3>
                        <p className="text-sm text-muted-foreground">Update plan for {agency.name}</p>
                    </div>
                    <button onClick={resetModal} className="ml-auto p-1 hover:bg-muted rounded-lg">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>
            <div className="p-6 space-y-3">
                {[
                    { value: "free", label: "Free", desc: "3 users, 5 projects", color: "border-muted-foreground/20" },
                    { value: "starter", label: "Starter", desc: "10 users, 50 projects", color: "border-emerald-500/30" },
                    { value: "pro", label: "Pro", desc: "50 users, 500 projects", color: "border-blue-500/30" },
                    { value: "enterprise", label: "Enterprise", desc: "Unlimited everything", color: "border-purple-500/30" },
                ].map((plan) => (
                    <label
                        key={plan.value}
                        className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition-all ${selectedPlan === plan.value
                            ? `${plan.color} bg-muted/50 ring-1 ring-current`
                            : "border-border hover:bg-muted/30"
                            }`}
                    >
                        <input
                            type="radio"
                            name="plan"
                            value={plan.value}
                            checked={selectedPlan === plan.value}
                            onChange={(e) => setSelectedPlan(e.target.value as Agency["plan"])}
                            className="w-4 h-4 accent-blue-500"
                        />
                        <div>
                            <p className="font-medium text-foreground">{plan.label}</p>
                            <p className="text-sm text-muted-foreground">{plan.desc}</p>
                        </div>
                        {agency.plan === plan.value && (
                            <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Current</span>
                        )}
                    </label>
                ))}

                {error && (
                    <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="mt-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Subscription Duration</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: "monthly", label: "1 Month" },
                            { value: "3months", label: "3 Months" },
                            { value: "6months", label: "6 Months" },
                            { value: "yearly", label: "1 Year" },
                            { value: "lifetime", label: "Lifetime" },
                        ].map((duration) => (
                            <button
                                key={duration.value}
                                type="button"
                                onClick={() => setSelectedDuration(duration.value as AgencyPlanDuration)}
                                className={`px-3 py-2 text-sm rounded-lg border transition-all font-medium ${
                                    selectedDuration === duration.value
                                        ? "border-blue-500 bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/30"
                                        : "border-border text-muted-foreground hover:bg-muted/30"
                                } ${duration.value === "lifetime" ? "col-span-2" : ""}`}
                            >
                                {duration.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
                <button
                    onClick={handleUpdatePlan}
                    disabled={loading || planUnchanged}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Updating..." : "Update Plan"}
                </button>
                <button onClick={resetModal} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm">
                    Cancel
                </button>
            </div>
        </>
    );
}
