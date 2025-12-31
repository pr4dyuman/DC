"use client";

import { Asset } from "@/lib/types";
import { AssetCard } from "./AssetCard";
import { deleteProjectAsset } from "@/lib/actions";
import { FileQuestionIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface AssetListProps {
    assets: Asset[];
}

export function AssetList({ assets }: AssetListProps) {
    const router = useRouter();

    const handleDelete = async (id: string) => {
        try {
            await deleteProjectAsset(id);
            router.refresh();
        } catch (error) {
            console.error("Failed to delete asset", error);
            alert("Failed to delete asset");
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
            ))}
        </div>
    );
}
