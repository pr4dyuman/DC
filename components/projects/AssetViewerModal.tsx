"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Asset } from "@/lib/types";
import { updateProjectAsset } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { PencilIcon, SaveIcon, XIcon } from "lucide-react";

interface AssetViewerModalProps {
    asset: Asset;
    open: boolean;
    onClose: () => void;
}

export function AssetViewerModal({ asset, open, onClose }: AssetViewerModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(asset.content || "");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const isInternalImage = asset.type === 'image' && !asset.url.startsWith('blob:') && !asset.url.startsWith('/uploads/');
    const isTextFile = asset.type === 'file' || asset.type === 'code' || (asset.type === 'link' && false); // Links aren't editable content usually

    // Simple check if it's an image we can display directly
    // Ideally we'd check mime type or extension
    const canViewImage = asset.type === 'image';
    const canEditText = ['file', 'code'].includes(asset.type) && asset.content !== undefined;

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProjectAsset(asset.id, { content });
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            console.error("Failed to update asset", error);
            alert("Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className={`flex flex-col ${canViewImage ? 'max-w-4xl max-h-[90vh]' : 'max-w-3xl h-[80vh]'}`}>
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle className="truncate pr-8">{asset.name}</DialogTitle>
                    <div className="flex items-center gap-2">
                        {canEditText && !isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <PencilIcon className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                        )}
                        {isEditing && (
                            <Button size="sm" onClick={handleSave} disabled={loading}>
                                <SaveIcon className="w-4 h-4 mr-2" />
                                Save
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto min-h-0 bg-muted/20 rounded-md p-4 flex items-center justify-center">
                    {canViewImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={asset.url}
                            alt={asset.name}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        isEditing ? (
                            <Textarea
                                className="w-full h-full font-mono text-sm resize-none border-0 focus-visible:ring-0 bg-transparent p-0"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        ) : (
                            <pre className="w-full h-full font-mono text-sm overflow-auto whitespace-pre-wrap">
                                {asset.content || "(No content available to preview)"}
                            </pre>
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
