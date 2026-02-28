import { Asset } from "@/lib/types";
import { FileIcon, ImageIcon, CodeIcon, LinkIcon, ArchiveIcon, FolderIcon, MoreVerticalIcon, DownloadIcon, TrashIcon, EyeIcon, CalendarIcon, UserIcon, HardDriveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { AssetViewerModal } from "./AssetViewerModal";
import { Badge } from "@/components/ui/badge";

interface AssetCardProps {
    asset: Asset;
    onDelete: (id: string) => void;
}

const getIcon = (type: Asset['type']) => {
    switch (type) {
        case 'image': return <ImageIcon className="h-6 w-6 text-blue-500" />;
        case 'code': return <CodeIcon className="h-6 w-6 text-yellow-500" />;
        case 'zip': return <ArchiveIcon className="h-6 w-6 text-red-500" />;
        case 'folder': return <FolderIcon className="h-6 w-6 text-orange-500" />;
        case 'link': return <LinkIcon className="h-6 w-6 text-green-500" />;
        default: return <FileIcon className="h-6 w-6 text-muted-foreground" />;
    }
};

const getTypeLabel = (type: Asset['type']) => {
    switch (type) {
        case 'image': return 'Image';
        case 'code': return 'Code';
        case 'zip': return 'Archive';
        case 'folder': return 'Folder';
        case 'link': return 'Link';
        default: return 'File';
    }
};

export function AssetCard({ asset, onDelete }: AssetCardProps) {
    const [viewerOpen, setViewerOpen] = useState(false);

    // Can view images and text/code files
    const canView = asset.type === 'image' || asset.type === 'code' || asset.type === 'file';

    return (
        <>
            <div className="group flex items-start gap-4 p-4 border rounded-xl hover:bg-accent/5 transition-all bg-card/50 hover:shadow-md hover:border-primary/20">
                {/* Icon Container */}
                <div className="p-3 bg-secondary/30 rounded-xl flex items-center justify-center border border-white/5 shadow-sm group-hover:scale-105 transition-transform">
                    {getIcon(asset.type)}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                    <div>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground/90 truncate pr-2 text-base">{asset.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-[90%] font-light">
                            {asset.description || asset.url || "No description provided"}
                        </p>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-normal bg-secondary/50 text-secondary-foreground border-0">
                            {getTypeLabel(asset.type)}
                        </Badge>

                        {asset.size && (
                            <div className="flex items-center text-[11px] text-muted-foreground">
                                <HardDriveIcon className="mr-1 h-3 w-3 opacity-70" />
                                {asset.size}
                            </div>
                        )}

                        <div className="w-px h-3 bg-border/60 mx-1 hidden sm:block"></div>

                        <div className="flex items-center text-[11px] text-muted-foreground">
                            <CalendarIcon className="mr-1 h-3 w-3 text-yellow-500 opacity-70" />
                            {new Date(asset.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>

                        <div className="flex items-center text-[11px] text-muted-foreground">
                            <UserIcon className="mr-1 h-3 w-3 opacity-70" />
                            {asset.uploadedBy}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start pt-1">
                    {canView && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewerOpen(true)} title="View">
                            <EyeIcon className="h-4 w-4" />
                        </Button>
                    )}

                    <a href={asset.url} target="_blank" rel="noopener noreferrer" download={!asset.url.startsWith('http')}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Download">
                            <DownloadIcon className="h-4 w-4" />
                        </Button>
                    </a>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(asset.id)}>
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete Asset
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <AssetViewerModal asset={asset} open={viewerOpen} onClose={() => setViewerOpen(false)} />
        </>
    );
}
