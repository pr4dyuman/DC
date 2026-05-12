"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetType } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface AddAssetDetailsFieldsProps {
    inputMode: "link" | "file";
    type: AssetType;
    name: string;
    url: string;
    description: string;
    loading: boolean;
    isScanning: boolean;
    hasFile: boolean;
    onTypeChange: (value: AssetType) => void;
    onNameChange: (value: string) => void;
    onUrlChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
}

export function AddAssetDetailsFields({
    inputMode,
    type,
    name,
    url,
    description,
    loading,
    isScanning,
    hasFile,
    onTypeChange,
    onNameChange,
    onUrlChange,
    onDescriptionChange,
}: AddAssetDetailsFieldsProps) {
    return (
        <>
            <div className={inputMode === "file" ? "hidden" : "block"}>
                <div className="space-y-2">
                    <Label htmlFor="asset-url">URL / Link</Label>
                    <Input
                        id="asset-url"
                        value={url}
                        onChange={(event) => onUrlChange(event.target.value)}
                        placeholder="https://github.com/..."
                        required={inputMode === "link"}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="asset-type">Type</Label>
                <Select id="asset-type" value={type} onValueChange={(value: AssetType) => onTypeChange(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        {inputMode === "link" ? (
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
                <Label htmlFor="asset-name">Name</Label>
                <Input
                    id="asset-name"
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                    placeholder="e.g. Project Specs"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="asset-description">Description (Optional)</Label>
                <Textarea
                    id="asset-description"
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    placeholder="Brief description..."
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading || isScanning || (inputMode === "file" && !hasFile)}>
                    {loading || isScanning ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : "Add Asset"}
                </Button>
            </div>
        </>
    );
}
