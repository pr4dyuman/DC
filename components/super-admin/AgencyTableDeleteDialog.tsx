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

type AgencyTableDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deletePassword: string;
    setDeletePassword: (value: string) => void;
    deleteError: string;
    deleting: boolean;
    passwordRef: React.RefObject<HTMLInputElement | null>;
    onSubmit: () => void;
};

export function AgencyTableDeleteDialog({
    open,
    onOpenChange,
    deletePassword,
    setDeletePassword,
    deleteError,
    deleting,
    passwordRef,
    onSubmit,
}: AgencyTableDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Agency</DialogTitle>
                    <DialogDescription>
                        This action is permanent. All agency data will be deleted.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="space-y-3">
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Super-admin password *</label>
                        <Input
                            ref={passwordRef}
                            type="password"
                            placeholder="Enter your password"
                            value={deletePassword}
                            onChange={(event) => setDeletePassword(event.target.value)}
                            autoComplete="current-password"
                        />
                    </div>
                    {deleteError && (
                        <p className="text-sm text-red-500">{deleteError}</p>
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
                            disabled={!deletePassword || deleting}
                            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            {deleting ? "Deleting..." : "Delete Agency"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
