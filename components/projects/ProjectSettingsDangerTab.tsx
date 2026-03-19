"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface ProjectSettingsDangerTabProps {
    showDeleteConfirm: boolean;
    deletePassword: string;
    deleteError: string;
    deleteLoading: boolean;
    onShowDeleteConfirm: () => void;
    onDeletePasswordChange: (value: string) => void;
    onDeleteProject: () => void;
    onCancelDelete: () => void;
}

export function ProjectSettingsDangerTab({
    showDeleteConfirm,
    deletePassword,
    deleteError,
    deleteLoading,
    onShowDeleteConfirm,
    onDeletePasswordChange,
    onDeleteProject,
    onCancelDelete,
}: ProjectSettingsDangerTabProps) {
    return (
        <div className="flex-1 p-6 mt-0">
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            Delete Project
                        </h4>
                        <p className="text-xs text-red-700">Irreversible action.</p>
                    </div>
                    {!showDeleteConfirm && (
                        <Button variant="destructive" size="sm" onClick={onShowDeleteConfirm}>
                            Delete
                        </Button>
                    )}
                </div>

                {showDeleteConfirm && (
                    <div className="mt-4 space-y-3">
                        <input
                            type="password"
                            placeholder="Admin Password"
                            className="flex h-9 w-full rounded-md border px-3 text-sm"
                            value={deletePassword}
                            onChange={(event) => onDeletePasswordChange(event.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={onDeleteProject} disabled={deleteLoading || !deletePassword}>
                                Confirm
                            </Button>
                            <Button variant="outline" onClick={onCancelDelete}>
                                Cancel
                            </Button>
                        </div>
                        {deleteError && <p className="text-xs text-red-600 font-bold">{deleteError}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
