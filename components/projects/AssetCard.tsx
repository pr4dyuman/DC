import { Asset } from "@/lib/db";
import { FileIcon, ImageIcon, CodeIcon, LinkIcon, ArchiveIcon, FolderIcon, MoreVerticalIcon, DownloadIcon, TrashIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { AssetViewerModal } from "./AssetViewerModal";

interface AssetCardProps {
    asset: Asset;
    onDelete: (id: string) => void;
}

const getIcon = (type: Asset['type']) => {
    switch (type) {
        case 'image': return <ImageIcon className="h-8 w-8 text-blue-500" />;
        case 'code': return <CodeIcon className="h-8 w-8 text-yellow-500" />;
        case 'zip': return <ArchiveIcon className="h-8 w-8 text-red-500" />;
        case 'folder': return <FolderIcon className="h-8 w-8 text-orange-500" />;
        case 'link': return <LinkIcon className="h-8 w-8 text-green-500" />;
        default: return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
};

export function AssetCard({ asset, onDelete }: AssetCardProps) {
    const [viewerOpen, setViewerOpen] = useState(false);

    // Can view images and text/code files
    const canView = asset.type === 'image' || asset.type === 'code' || asset.type === 'file';

    return (
        <>
            <div className="group relative flex items-center gap-4 p-4 border rounded-xl hover:bg-accent/5 transition-colors bg-card">
                <div className="p-3 bg-secondary/20 rounded-lg">
                    {getIcon(asset.type)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{asset.name}</h3>
                        {asset.size && <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{asset.size}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{asset.description || asset.url}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{new Date(asset.uploadedAt).toLocaleDateString('en-GB')}</span>
                        <span>•</span>
                        <span>by {asset.uploadedBy}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canView && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewerOpen(true)}>
                            <EyeIcon className="h-4 w-4" />
                        </Button>
                    )}

                    <a href={asset.url} target="_blank" rel="noopener noreferrer" download={!asset.url.startsWith('http')}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <DownloadIcon className="h-4 w-4" />
                        </Button>
                    </a>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(asset.id)}>
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <AssetViewerModal asset={asset} open={viewerOpen} onClose={() => setViewerOpen(false)} />
        </>
    );
}
