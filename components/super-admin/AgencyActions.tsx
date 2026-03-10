"use client";

import { useState } from "react";
import { suspendAgency, activateAgency, deleteAgency, updateAgencyPlan } from "@/lib/actions/super-admin";
import { Ban, CheckCircle, Trash2, Edit, X, AlertTriangle, Shield, Lock, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

type ModalType = "suspend" | "delete" | "plan" | null;

export default function AgencyActions({ agency }: { agency: any }) {
    const router = useRouter();
    const [modal, setModal] = useState<ModalType>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [reason, setReason] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [selectedPlan, setSelectedPlan] = useState(agency.plan);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const resetModal = () => {
        setModal(null);
        setPassword("");
        setShowPassword(false);
        setReason("");
        setDeleteConfirmText("");
        setError("");
        setLoading(false);
    };

    const handleSuspend = async () => {
        if (!password) { setError("Password is required"); return; }
        setLoading(true);
        setError("");
        try {
            await suspendAgency(agency.id, password, reason || undefined);
            router.refresh();
            resetModal();
        } catch (err: any) {
            setError(err.message || "Failed to suspend agency");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        setLoading(true);
        try {
            await activateAgency(agency.id);
            router.refresh();
            resetModal();
        } catch (err: any) {
            setError(err.message || "Failed to activate agency");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== "DELETE") { setError("Type DELETE to confirm"); return; }
        if (!password) { setError("Password is required"); return; }
        setLoading(true);
        setError("");
        try {
            await deleteAgency(agency.id, password);
            router.push("/super-admin/agencies");
        } catch (err: any) {
            setError(err.message || "Failed to delete agency");
            setLoading(false);
        }
    };

    const handleUpdatePlan = async () => {
        if (selectedPlan === agency.plan) { resetModal(); return; }
        setLoading(true);
        setError("");
        try {
            await updateAgencyPlan(agency.id, selectedPlan);
            router.refresh();
            resetModal();
        } catch (err: any) {
            setError(err.message || "Failed to update plan");
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => { setSelectedPlan(agency.plan); setModal("plan"); }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                    <Edit className="w-4 h-4" />
                    <span>Change Plan</span>
                </button>

                {agency.status === "active" ? (
                    <button
                        onClick={() => setModal("suspend")}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                    >
                        <Ban className="w-4 h-4" />
                        <span>Suspend</span>
                    </button>
                ) : (
                    <button
                        onClick={handleActivate}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                    >
                        <CheckCircle className="w-4 h-4" />
                        <span>{loading ? "Activating..." : "Activate"}</span>
                    </button>
                )}

                <button
                    onClick={() => setModal("delete")}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-600/20 transition-colors text-sm"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                </button>
            </div>

            {/* ═══════════ MODALS OVERLAY ═══════════ */}
            {modal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={resetModal}>
                    <div className="bg-card rounded-xl border border-border shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>

                        {/* ── SUSPEND MODAL ── */}
                        {modal === "suspend" && (
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
                                                onChange={(e) => { setPassword(e.target.value); setError(""); }}
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
                        )}

                        {/* ── DELETE MODAL ── */}
                        {modal === "delete" && (
                            <>
                                <div className="p-6 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 rounded-lg">
                                            <Trash2 className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">Delete Agency</h3>
                                            <p className="text-sm text-red-400">This action is permanent and irreversible</p>
                                        </div>
                                        <button onClick={resetModal} className="ml-auto p-1 hover:bg-muted rounded-lg">
                                            <X className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                                        <div className="flex gap-2.5">
                                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-red-300 space-y-2">
                                                <p className="font-semibold">This will PERMANENTLY delete:</p>
                                                <ul className="list-disc list-inside space-y-0.5 text-red-400/80">
                                                    <li><strong>{agency.name}</strong> and all settings</li>
                                                    <li>All users, clients, and their data</li>
                                                    <li>All projects, tasks, and assets</li>
                                                    <li>All invoices, transactions, and financial records</li>
                                                    <li>All AI chat history and notifications</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                                            Type <span className="font-mono text-red-500">DELETE</span> to confirm
                                        </label>
                                        <input
                                            type="text"
                                            value={deleteConfirmText}
                                            onChange={(e) => { setDeleteConfirmText(e.target.value.toUpperCase()); setError(""); }}
                                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono tracking-wider placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                            placeholder="DELETE"
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
                                                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
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
                                        onClick={handleDelete}
                                        disabled={loading || deleteConfirmText !== "DELETE" || !password}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {loading ? "Deleting Everything..." : "Permanently Delete Agency"}
                                    </button>
                                    <button onClick={resetModal} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm">
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── PLAN MODAL ── */}
                        {modal === "plan" && (
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
                                        { value: "free", label: "Free", desc: "5 users, 10 projects", color: "border-muted-foreground/20" },
                                        { value: "pro", label: "Pro", desc: "25 users, 100 projects", color: "border-blue-500/30" },
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
                                                onChange={(e) => setSelectedPlan(e.target.value)}
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
                                </div>
                                <div className="p-6 pt-0 flex gap-3">
                                    <button
                                        onClick={handleUpdatePlan}
                                        disabled={loading || selectedPlan === agency.plan}
                                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Updating..." : "Update Plan"}
                                    </button>
                                    <button onClick={resetModal} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm">
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
