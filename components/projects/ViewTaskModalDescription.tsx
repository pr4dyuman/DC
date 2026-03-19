"use client";

import { AlignLeft } from "lucide-react";

type ViewTaskModalDescriptionProps = {
    description?: string;
};

export function ViewTaskModalDescription({
    description,
}: ViewTaskModalDescriptionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
                <AlignLeft className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-foreground">Description</h3>
            </div>
            {description ? (
                <div className="text-sm leading-7 text-foreground break-words whitespace-pre-wrap">
                    {description}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                    <AlignLeft className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No description provided for this task.</p>
                </div>
            )}
        </div>
    );
}
