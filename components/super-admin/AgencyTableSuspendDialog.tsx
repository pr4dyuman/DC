"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AgencyTableSuspendDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suspendReason: string;
    setSuspendReason: (value: string) => void;
    suspendPassword: string;
    setSuspendPassword: (value: string) => void;
    suspendError: string;
    suspending: boolean;
    suspendPasswordRef: React.RefObject<HTMLInputElement | null>;
    onSubmit: () => void;
};

export function AgencyTableSuspendDialog({
    open,
    onOpenChange,
    suspendReason,
    setSuspendReason,
    suspendPassword,
    setSuspendPassword,
    suspendError,
    suspending,
    suspendPasswordRef,
    onSubmit,
}: AgencyTableSuspendDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Suspend Agency</DialogTitle>
                    <DialogDescription>
                        This will disable access for all users in this agency.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="space-y-3">
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Reason (optional)</label>
                        <Input
                            placeholder="e.g. Non-payment, TOS violation..."
                            value={suspendReason}
                            onChange={(event) => setSuspendReason(event.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Super-admin password *</label>
                        <Input
                            ref={suspendPasswordRef}
                            type="password"
                            placeholder="Enter your password"
                            value={suspendPassword}
                            onChange={(event) => setSuspendPassword(event.target.value)}
                            autoComplete="current-password"
                        />
                    </div>
                    {suspendError && (
                        <p className="text-sm text-red-500">{suspendError}</p>
                    )}
                    <DialogFooter className="mt-4">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!suspendPassword || suspending}
                            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                        >
                            {suspending ? "Suspending..." : "Suspend Agency"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
