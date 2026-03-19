"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Asset } from "@/lib/types";
import { Brain, Check, Code, FileText, ImageIcon } from "lucide-react";

interface ProjectSettingsAITabProps {
    aiConfigured: boolean;
    assets: Asset[];
    onToggleAsset: (assetId: string, currentState: boolean | undefined) => void;
}

function getAssetIcon(type: string) {
    switch (type) {
        case "image":
            return <ImageIcon className="h-4 w-4 text-purple-500" />;
        case "code":
            return <Code className="h-4 w-4 text-blue-500" />;
        case "file":
            return <FileText className="h-4 w-4 text-orange-500" />;
        default:
            return <FileText className="h-4 w-4" />;
    }
}

export function ProjectSettingsAITab({ aiConfigured, assets, onToggleAsset }: ProjectSettingsAITabProps) {
    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
            <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-indigo-500" />
                            Singularity AI
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-[400px]">
                            {aiConfigured
                                ? "AI is configured for your organization. Select which assets to include in AI context below."
                                : "AI is not configured. Contact your system administrator to set up Singularity."}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-md border border-border">
                        {aiConfigured ? <Check className="h-3 w-3 text-green-500" /> : <Brain className="h-3 w-3 text-amber-500" />}
                        <span className="text-xs font-medium text-indigo-900 dark:text-indigo-100">
                            {aiConfigured ? "Active" : "Not Configured"}
                        </span>
                    </div>
                </div>
            </div>

            <div className={`space-y-4 ${!aiConfigured ? "opacity-50 pointer-events-none grayscale" : ""}`}>
                <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                        Context Manager
                        <Badge variant="secondary" className="text-[10px] font-normal">
                            Select assets for AI understanding
                        </Badge>
                    </h3>
                </div>

                <ScrollArea className="h-[300px] rounded-lg border bg-muted/20 p-4">
                    {assets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-60">
                            <Code className="h-8 w-8" />
                            <p className="text-sm">No assets uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className={`
                                        group relative cursor-pointer rounded-lg border p-3 transition-all
                                        hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700
                                        ${asset.aiEnabled
                                            ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                                            : "bg-background border-border"}
                                    `}
                                    onClick={() => onToggleAsset(asset.id, asset.aiEnabled)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="p-1.5 rounded-md bg-muted">{getAssetIcon(asset.type)}</div>
                                        {asset.aiEnabled && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white shadow-sm">
                                                <Check className="h-3 w-3" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium truncate" title={asset.name}>
                                            {asset.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase">{asset.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
