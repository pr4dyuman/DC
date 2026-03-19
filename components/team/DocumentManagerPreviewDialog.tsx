/* eslint-disable @next/next/no-img-element */
"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type DocumentManagerPreviewDialogProps = {
    previewImage: string | null;
    onClose: () => void;
};

export function DocumentManagerPreviewDialog({
    previewImage,
    onClose,
}: DocumentManagerPreviewDialogProps) {
    if (!previewImage) return null;

    return (
        <Dialog open={!!previewImage} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] md:max-w-[90vw] h-[95vh] p-0 overflow-hidden bg-black/95 border-none">
                <DialogTitle className="sr-only">Document Preview</DialogTitle>
                <div className="relative w-full h-full flex items-center justify-center">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full z-50">
                        <X className="w-6 h-6" />
                    </button>
                    <img src={previewImage} alt="Document preview" className="max-w-full max-h-full object-contain" />
                </div>
            </DialogContent>
        </Dialog>
    );
}
