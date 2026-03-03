"use client";

import { useState } from "react";
import { Asset } from "@/lib/types";
import { AssetCard } from "./AssetCard";
import { deleteProjectAsset } from "@/lib/actions";
import { FileQuestionIcon, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AssetListProps {
    assets: Asset[];
}

export function AssetList({ assets }: AssetListProps) {
    const router = useRouter();
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteRequest = (id: string) => {
        setConfirmDeleteId(id);
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);
        try {
            await deleteProjectAsset(confirmDeleteId);
            toast.success("Asset deleted");
            setConfirmDeleteId(null);
            router.refresh();
        } catch (error) {
            console.error("Failed to delete asset", error);
            toast.error("Failed to delete asset");
        } finally {
            setDeleting(false);
        }
    };

    if (assets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-accent/5">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <FileQuestionIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No assets found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
                    Upload documents, images, code snippets, or link external repositories to keep everything in one place.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onDelete={handleDeleteRequest} />
                ))}
            </div>

            {/* Delete confirmation overlay */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-full">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Delete Asset</h3>
                                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-muted hover:bg-accent text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors"
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
