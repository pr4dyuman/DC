"use client";

import { AlertTriangle, Eye, EyeOff, Lock, Trash2, X } from "lucide-react";
import { AgencyActionAgency } from "./agency-actions-shared";

type DeleteAgencyModalProps = {
    agency: AgencyActionAgency;
    password: string;
    showPassword: boolean;
    deleteConfirmText: string;
    loading: boolean;
    error: string;
    setPassword: (value: string) => void;
    setShowPassword: (value: boolean) => void;
    setDeleteConfirmText: (value: string) => void;
    setError: (value: string) => void;
    resetModal: () => void;
    handleDelete: () => void;
};

export function DeleteAgencyModal({
    agency,
    password,
    showPassword,
    deleteConfirmText,
    loading,
    error,
    setPassword,
    setShowPassword,
    setDeleteConfirmText,
    setError,
    resetModal,
    handleDelete,
}: DeleteAgencyModalProps) {
    return (
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
                        onChange={(e) => {
                            setDeleteConfirmText(e.target.value.toUpperCase());
                            setError("");
                        }}
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
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError("");
                            }}
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
    );
}
