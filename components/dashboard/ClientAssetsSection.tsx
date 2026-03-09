"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Image, Code, Link as LinkIcon, Download } from "lucide-react";
import { Asset } from "@/lib/types";
import { useDateFormat } from "@/context/TimezoneContext";

interface ClientAssetsSectionProps {
    assets: Asset[];
    projects: any[];
}

export function ClientAssetsSection({ assets, projects }: ClientAssetsSectionProps) {
    const fmt = useDateFormat();
    const recentAssets = assets
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 10);

    const assetsByType = {
        image: assets.filter(a => a.type === 'image').length,
        file: assets.filter(a => a.type === 'file').length,
        code: assets.filter(a => a.type === 'code').length,
        link: assets.filter(a => a.type === 'link').length,
        zip: assets.filter(a => a.type === 'zip').length,
        folder: assets.filter(a => a.type === 'folder').length
    };

    const getProjectName = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        return project?.name || 'Unknown Project';
    };

    const getAssetIcon = (type: string) => {
        switch (type) {
            case 'image':
                return <Image className="h-4 w-4 text-purple-400" />;
            case 'code':
            case 'zip':
                return <Code className="h-4 w-4 text-blue-400" />;
            case 'link':
                return <LinkIcon className="h-4 w-4 text-green-400" />;
            default:
                return <FileText className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <Card className="col-span-1 transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>Documents & Assets</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Asset Type Distribution */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                        <Image className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                        <div className="text-lg font-bold">{assetsByType.image}</div>
                        <div className="text-xs text-muted-foreground">Images</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border text-center">
                        <FileText className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                        <div className="text-lg font-bold">{assetsByType.file}</div>
                        <div className="text-xs text-muted-foreground">Files</div>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                        <Code className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                        <div className="text-lg font-bold">{assetsByType.code + assetsByType.zip}</div>
                        <div className="text-xs text-muted-foreground">Code</div>
                    </div>
                </div>

                {/* Recent Assets */}
                <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Recent Uploads</h4>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                            {recentAssets.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No assets uploaded yet
                                </div>
                            ) : (
                                recentAssets.map((asset) => (
                                    <div
                                        key={asset.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition group"
                                    >
                                        <div className="flex-shrink-0">
                                            {getAssetIcon(asset.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{asset.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {getProjectName(asset.projectId)}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {asset.size} • {fmt.date(asset.uploadedAt)}
                                            </p>
                                        </div>
                                        <button
                                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition p-2 hover:bg-white/10 rounded"
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Total Count */}
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Assets</span>
                        <span className="font-semibold">{assets.length}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
