"use client";

import { Image as ImageIcon } from "lucide-react";

export function SingularityDragOverlay() {
    return (
        <div className="absolute inset-0 z-50 bg-white/80 dark:bg-white/5 backdrop-blur-sm border-2 border-dashed border-neutral-400 dark:border-neutral-600 rounded-xl flex items-center justify-center">
            <div className="text-center space-y-2">
                <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto" />
                <p className="text-neutral-600 dark:text-neutral-300 font-medium">Drop files here</p>
            </div>
        </div>
    );
}
