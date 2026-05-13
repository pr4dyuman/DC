"use client";

import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileIcon, Loader2, ShieldCheck } from "lucide-react";

interface AddAssetSecureUploadPanelProps {
    inputMode: "link" | "file";
    loading: boolean;
    isScanning: boolean;
    scanResult: "clean" | "infected" | null;
    uploadProgress: number;
    uploadSpeed: string;
    remainingTime: string;
    fileName: string | null;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function AddAssetSecureUploadPanel({
    inputMode,
    loading,
    isScanning,
    scanResult,
    uploadProgress,
    uploadSpeed,
    remainingTime,
    fileName,
    onFileChange,
}: AddAssetSecureUploadPanelProps) {
    return (
        <div className={inputMode === "file" ? "block space-y-4" : "hidden"}>
            {!loading && !scanResult && (
                <div className="space-y-2">
                    <Label htmlFor="file">Select File</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                        <Input
                            id="file"
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,.html,.css,.js,.ts,.tsx,.jsx,.py,.zip,.rar"
                            onChange={onFileChange}
                            required={inputMode === "file"}
                        />
                        <div className="flex flex-col items-center gap-2">
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                            {fileName ? (
                                <div className="text-sm font-medium text-primary break-all">{fileName}</div>
                            ) : (
                                <>
                                    <span className="text-sm font-medium">Click to upload or drag and drop</span>
                                    <span className="text-xs text-muted-foreground">Images, docs, code, ZIP, CSV, TXT - Max 50MB</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {(loading || isScanning || scanResult === "clean") && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">
                            {isScanning ? "Running Virus Scan..." : scanResult === "clean" ? "Scan Passed. Finalizing..." : "Uploading..."}
                        </span>
                        <span className="text-muted-foreground">
                            {isScanning ? <ShieldCheck className="h-4 w-4 animate-pulse text-indigo-500 inline mr-1" /> : null}
                            {uploadProgress}%
                        </span>
                    </div>

                    <Progress value={isScanning ? 100 : uploadProgress} className={isScanning ? "h-2 bg-indigo-100" : "h-2"} />

                    {!isScanning && !scanResult && (
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Speed: {uploadSpeed}</span>
                            <span>Remaining: {remainingTime}</span>
                        </div>
                    )}

                    {isScanning && (
                        <div className="flex items-center gap-2 text-xs text-indigo-400 mt-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Checking file integrity and signatures...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
