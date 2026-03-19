"use client";

import { Archive, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

type EditUserDialogDeletePanelProps = {
    deletePassword: string;
    onDeletePasswordChange: (value: string) => void;
    archiving: boolean;
    onArchive: () => void;
    onOpenPermanentDelete: () => void;
    onBack: () => void;
};

export function EditUserDialogDeletePanel({
    deletePassword,
    onDeletePasswordChange,
    archiving,
    onArchive,
    onOpenPermanentDelete,
    onBack,
}: EditUserDialogDeletePanelProps) {
    return (
        <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">Choose how to handle this account</p>
            </div>

            <div className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                    <Archive className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-foreground">Deactivate (Archive)</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Account is disabled but all data (tasks, transactions, history) is preserved. Can be restored anytime.
                        </p>
                    </div>
                </div>
                <div className="space-y-2 pl-8">
                    <input
                        type="password"
                        placeholder="Admin Password"
                        value={deletePassword}
                        onChange={(event) => onDeletePasswordChange(event.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <button
                        onClick={onArchive}
                        disabled={!deletePassword || archiving}
                        className="w-full px-4 py-2 text-sm font-medium text-amber-700 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                        {archiving ? "Archiving..." : "Archive User"}
                    </button>
                </div>
            </div>

            <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5 space-y-3">
                <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-500">Permanently Delete</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            <strong className="text-red-400">Irreversible.</strong> Removes user account and all associated data including transactions, leave requests, and notifications.
                        </p>
                    </div>
                </div>
                <div className="pl-8">
                    <button
                        onClick={onOpenPermanentDelete}
                        className="w-full px-4 py-2 text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md flex items-center justify-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Permanently...
                    </button>
                </div>
            </div>

            <DialogFooter className="flex justify-end pt-2">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                >
                    Back
                </button>
            </DialogFooter>
        </div>
    );
}
