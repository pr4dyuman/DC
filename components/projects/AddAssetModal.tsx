"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon } from "lucide-react";
import { addProjectAsset } from "@/lib/actions";
import { AssetType } from "@/lib/db";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AddAssetModalProps {
    projectId: string;
}

export function AddAssetModal({ projectId }: AddAssetModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [inputMode, setInputMode] = useState<"link" | "file">("link");

    // Reset type when switching modes
    const handleModeChange = (mode: "link" | "file") => {
        setInputMode(mode);
        if (mode === "link") {
            setFormData(prev => ({ ...prev, type: "link", url: "" }));
            setFile(null);
        } else {
            setFormData(prev => ({ ...prev, type: "file", url: "" }));
        }
    };

    const [formData, setFormData] = useState({
        name: "",
        type: "link" as AssetType,
        url: "",
        description: "",
        content: "" as string | undefined
    });

    const [file, setFile] = useState<File | null>(null);
    const [base64Data, setBase64Data] = useState<string | null>(null);

    // Helper to format file size
    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        try {
            let finalUrl = formData.url;
            let finalSize = "0KB";
            let finalName = formData.name;

            if (inputMode === "file" && file) {
                // Mock upload logic
                if (formData.type === 'image' && base64Data) {
                    finalUrl = base64Data;
                } else {
                    finalUrl = `/uploads/${file.name}`; // Mock URL
                }

                // If user didn't provide a name, use filename
                if (!finalName) {
                    finalName = file.name;
                }
                finalSize = formatBytes(file.size);
            } else if (inputMode === "link") {
                if (!finalName) {
                    finalName = "New Link";
                }
            }

            await addProjectAsset({
                projectId,
                name: finalName,
                type: formData.type,
                url: finalUrl,
                description: formData.description,
                size: finalSize,
                uploadedBy: "Admin", // Should be current user
                content: formData.content,
            });

            setOpen(false);
            setFormData({
                name: "",
                type: "link",
                url: "",
                description: "",
                content: ""
            });
            setInputMode("link"); // Reset to default
            setFile(null);
            setBase64Data(null);
            router.refresh();
        } catch (error) {
            console.error("Failed to add asset", error);
            alert("Failed to add asset"); // Simple fallback
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Asset
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Project Asset</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="link" value={inputMode} onValueChange={(v) => handleModeChange(v as "link" | "file")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="link">External Link</TabsTrigger>
                        <TabsTrigger value="file">File Upload</TabsTrigger>
                    </TabsList>

                    <form onSubmit={onSubmit} className="space-y-4 pt-4">
                        <TabsContent value="link" className="space-y-4 data-[state=inactive]:hidden mt-0">
                            <div className="space-y-2">
                                <Label htmlFor="url">URL / Link</Label>
                                <Input
                                    id="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://github.com/..."
                                    required={inputMode === "link"}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="file" className="space-y-4 data-[state=inactive]:hidden mt-0">
                            <div className="space-y-2">
                                <Label htmlFor="file">Select File</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const f = e.target.files[0];
                                            setFile(f);
                                            // Reset content states immediately to prevent leaks
                                            setBase64Data(null);
                                            setFormData(prev => ({ ...prev, content: "" }));

                                            // Auto-detect type roughly
                                            let type: AssetType = 'file';
                                            const lowerName = f.name.toLowerCase();

                                            if (f.type.startsWith('image/')) type = 'image';
                                            else if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar')) type = 'zip';
                                            else if (lowerName.endsWith('.txt')) type = 'file';
                                            else if (['.js', '.ts', '.tsx', '.jsx', '.md', '.json', '.html', '.css', '.py'].some(ext => lowerName.endsWith(ext))) type = 'code';

                                            // Read content if text/code
                                            if (type === 'file' || type === 'code') {
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    const text = e.target?.result;
                                                    if (typeof text === 'string') {
                                                        setFormData(prev => ({ ...prev, content: text }));
                                                    }
                                                };
                                                reader.readAsText(f);
                                            } else if (type === 'image') {
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    const result = e.target?.result;
                                                    if (typeof result === 'string') {
                                                        setBase64Data(result);
                                                    }
                                                };
                                                reader.readAsDataURL(f);
                                            }

                                            setFormData(prev => ({ ...prev, type: type, name: prev.name || f.name }));
                                        }
                                    }}
                                    required={inputMode === "file"}
                                />
                                <p className="text-[0.8rem] text-muted-foreground">
                                    Files are "mock uploaded" (stored as metadata only).
                                </p>
                            </div>
                        </TabsContent>

                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: AssetType) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {inputMode === 'link' ? (
                                        <>
                                            <SelectItem value="link">Link</SelectItem>
                                            <SelectItem value="code">Code (Repository)</SelectItem>
                                            <SelectItem value="image">Image (URL)</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="file">File</SelectItem>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="code">Code</SelectItem>
                                            <SelectItem value="folder">Folder</SelectItem>
                                            <SelectItem value="zip">Zip Archive</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Project Specs"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description..."
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading}>
                                {loading ? "Adding..." : "Add Asset"}
                            </Button>
                        </div>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
