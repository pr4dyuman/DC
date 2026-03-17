"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Loader2, Clock } from "lucide-react";

interface PermanentDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityName: string;
    entityType: "user" | "client";
    warningItems: string[];
    onConfirm: (password: string) => Promise<void>;
}

type PermanentDeleteDialogContentProps = Omit<PermanentDeleteDialogProps, "open">;

function PermanentDeleteDialogContent({
    onOpenChange,
    entityName,
    entityType,
    warningItems,
    onConfirm,
}: PermanentDeleteDialogContentProps) {
    const [password, setPassword] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [timerStarted, setTimerStarted] = useState(false);
    const [error, setError] = useState("");

    // Start countdown when password is entered
    useEffect(() => {
        if (!timerStarted || countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timerStarted, countdown]);

    const handleStartTimer = useCallback(() => {
        if (!password) return;
        setTimerStarted(true);
        setCountdown(10);
    }, [password]);

    const handleConfirm = async () => {
        if (countdown > 0 || !password) return;
        setDeleting(true);
        setError("");
        try {
            await onConfirm(password);
            onOpenChange(false);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to delete");
            setDeleting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-[480px] bg-card border-border p-6">
            <DialogHeader className="pb-0 mb-2">
                <DialogTitle className="flex items-center gap-2 text-red-500">
                    <Trash2 className="h-5 w-5" />
                    Permanently Delete {entityType === "user" ? "User" : "Client"}
                </DialogTitle>
                <DialogDescription>
                    This action is <strong className="text-red-500">irreversible</strong>. All data will be permanently destroyed.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
                {/* Danger warning */}
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-red-500">
                                You are about to permanently delete &quot;{entityName}&quot;
                            </p>
                            <p className="text-xs text-muted-foreground">
                                The following data will be <strong className="text-red-400">permanently destroyed</strong>:
                            </p>
                            <ul className="text-xs text-red-400 space-y-1 list-disc pl-4">
                                {warningItems.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Password input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Enter Admin Password to confirm
                    </label>
                    <input
                        type="password"
                        placeholder="Admin Password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (timerStarted) {
                                setTimerStarted(false);
                                setCountdown(10);
                            }
                        }}
                        className="flex h-10 w-full rounded-md border border-red-500/30 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        autoFocus
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
                )}

                {/* Countdown timer */}
                {timerStarted && (
                    <div className="flex items-center justify-center gap-2 py-3">
                        <Clock className="h-4 w-4 text-red-500 animate-pulse" />
                        <span className="text-sm font-mono font-bold text-red-500">
                            {countdown > 0 ? (
                                <>Delete enabled in {countdown}s</>
                            ) : (
                                <span className="text-red-400">You can now delete</span>
                            )}
                        </span>
                    </div>
                )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2">
                <button
                    onClick={() => onOpenChange(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                >
                    Cancel
                </button>
                {!timerStarted ? (
                    <button
                        onClick={handleStartTimer}
                        disabled={!password}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        I understand, proceed
                    </button>
                ) : (
                    <button
                        onClick={handleConfirm}
                        disabled={countdown > 0 || deleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[180px] justify-center"
                    >
                        {deleting ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
                        ) : countdown > 0 ? (
                            <><Clock className="h-4 w-4" /> Wait {countdown}s...</>
                        ) : (
                            <><Trash2 className="h-4 w-4" /> Delete Permanently</>
                        )}
                    </button>
                )}
            </DialogFooter>
        </DialogContent>
    );
}

export function PermanentDeleteDialog({
    open,
    onOpenChange,
    entityName,
    entityType,
    warningItems,
    onConfirm,
}: PermanentDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open ? (
                <PermanentDeleteDialogContent
                    onOpenChange={onOpenChange}
                    entityName={entityName}
                    entityType={entityType}
                    warningItems={warningItems}
                    onConfirm={onConfirm}
                />
            ) : null}
        </Dialog>
    );
}
