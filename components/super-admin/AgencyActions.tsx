"use client";

import { useState } from "react";
import { suspendAgency, activateAgency, deleteAgency, updateAgencyPlan } from "@/lib/actions/super-admin";
import { Ban, CheckCircle, Trash2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AgencyActions({ agency }: { agency: any }) {
    const router = useRouter();
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(agency.plan);

    const handleSuspend = async () => {
        if (!confirm("Are you sure you want to suspend this agency?")) return;
        const reason = prompt("Reason for suspension:");
        await suspendAgency(agency.id, reason || undefined);
        router.refresh();
    };

    const handleActivate = async () => {
        await activateAgency(agency.id);
        router.refresh();
    };

    const handleDelete = async () => {
        if (!confirm("⚠️ WARNING: This will permanently delete the agency and ALL its data. This cannot be undone. Are you absolutely sure?")) return;
        const confirmation = prompt("Type 'DELETE' to confirm:");
        if (confirmation !== 'DELETE') return;
        const password = prompt("Enter your super-admin password to confirm deletion:");
        if (!password) return;
        try {
            await deleteAgency(agency.id, password);
            router.push('/super-admin/agencies');
        } catch (err: any) {
            alert(err.message || 'Failed to delete agency');
        }
    };

    const handleUpdatePlan = async () => {
        await updateAgencyPlan(agency.id, selectedPlan);
        setShowPlanModal(false);
        router.refresh();
    };

    return (
        <>
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setShowPlanModal(true)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                    <Edit className="w-4 h-4" />
                    <span>Change Plan</span>
                </button>

                {agency.status === 'active' ? (
                    <button
                        onClick={handleSuspend}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                        <Ban className="w-4 h-4" />
                        <span>Suspend</span>
                    </button>
                ) : (
                    <button
                        onClick={handleActivate}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                        <CheckCircle className="w-4 h-4" />
                        <span>Activate</span>
                    </button>
                )}

                <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                </button>
            </div>

            {/* Plan Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-lg p-6 max-w-md w-full border border-border">
                        <h3 className="text-xl font-bold text-foreground mb-4">Change Plan</h3>
                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted">
                                <input
                                    type="radio"
                                    name="plan"
                                    value="free"
                                    checked={selectedPlan === 'free'}
                                    onChange={(e) => setSelectedPlan(e.target.value as any)}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <p className="font-medium text-foreground">Free</p>
                                    <p className="text-sm text-muted-foreground">5 users, 10 projects</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted">
                                <input
                                    type="radio"
                                    name="plan"
                                    value="pro"
                                    checked={selectedPlan === 'pro'}
                                    onChange={(e) => setSelectedPlan(e.target.value as any)}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <p className="font-medium text-foreground">Pro</p>
                                    <p className="text-sm text-muted-foreground">25 users, 100 projects</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted">
                                <input
                                    type="radio"
                                    name="plan"
                                    value="enterprise"
                                    checked={selectedPlan === 'enterprise'}
                                    onChange={(e) => setSelectedPlan(e.target.value as any)}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <p className="font-medium text-foreground">Enterprise</p>
                                    <p className="text-sm text-muted-foreground">Unlimited everything</p>
                                </div>
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleUpdatePlan}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Update Plan
                            </button>
                            <button
                                onClick={() => setShowPlanModal(false)}
                                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
