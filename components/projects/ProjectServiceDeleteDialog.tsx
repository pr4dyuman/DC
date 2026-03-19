"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

type DeleteTarget = {
    id: string;
    name: string;
    taskCount: number;
} | null;

type ProjectServiceDeleteDialogProps = {
    deleteTarget: DeleteTarget;
    onClose: () => void;
    onConfirm: () => void;
};

export function ProjectServiceDeleteDialog({
    deleteTarget,
    onClose,
    onConfirm,
}: ProjectServiceDeleteDialogProps) {
    return (
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Service</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            {deleteTarget && deleteTarget.taskCount > 0 ? (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-amber-600 dark:text-amber-400">
                                            Cannot delete &quot;{deleteTarget.name}&quot;
                                        </p>
                                        <p className="text-muted-foreground mt-1">
                                            <strong>{deleteTarget.taskCount} task{deleteTarget.taskCount !== 1 ? "s" : ""}</strong> {deleteTarget.taskCount === 1 ? "is" : "are"} still assigned to this service.
                                            Please reassign those tasks to another service first.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p>Are you sure you want to delete <strong>&quot;{deleteTarget?.name}&quot;</strong>? This action cannot be undone.</p>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {deleteTarget && deleteTarget.taskCount === 0 && (
                        <AlertDialogAction
                            onClick={onConfirm}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
