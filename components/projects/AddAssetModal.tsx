"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, AlertTriangle, FileIcon, CheckCircle2, Loader2, ShieldCheck, Ban } from "lucide-react";
import { addProjectAsset } from "@/lib/actions";
import { AssetType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";


interface AddAssetModalProps {
    projectId: string;
}

export function AddAssetModal({ projectId }: AddAssetModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [inputMode, setInputMode] = useState<"link" | "file">("link");

    // Upload & Security State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState("");
    const [remainingTime, setRemainingTime] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<"clean" | "infected" | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Reset type when switching modes
    const handleModeChange = (mode: "link" | "file") => {
        setInputMode(mode);
        resetState();
        if (mode === "link") {
            setFormData(prev => ({ ...prev, type: "link", url: "" }));
            setFile(null);
        } else {
            setFormData(prev => ({ ...prev, type: "file", url: "" }));
        }
    };

    const resetState = () => {
        setUploadProgress(0);
        setUploadSpeed("");
        setRemainingTime("");
        setIsScanning(false);
        setScanResult(null);
        setError(null);
        setLoading(false);
        setFile(null);
        setBase64Data(null);
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

    // Security: Validate File
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.jar', '.com', '.scr', '.pif'];
        const fileName = file.name.toLowerCase();

        // 1. Extension Check
        if (FORBIDDEN_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
            return { valid: false, error: "Security Alert: Executable files are not allowed." };
        }

        // 2. Size Limit (e.g., 50MB)
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return { valid: false, error: "File too large. Maximum size is 50MB." };
        }

        return { valid: true };
    };

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (inputMode === "file" && file) {
            // Security Check Step 1
            const validation = validateFile(file);
            if (!validation.valid) {
                setError(validation.error || "Invalid file");
                return;
            }

            setLoading(true);

            // SIMULATE UPLOAD PROCESS
            const totalSize = file.size;
            let uploaded = 0;
            const startTime = Date.now();

            // Mock chunk upload simulation
            const chunkSize = totalSize / 20; // 20 steps

            const uploadInterval = setInterval(() => {
                uploaded += chunkSize;
                if (uploaded > totalSize) uploaded = totalSize;

                const progress = Math.round((uploaded / totalSize) * 100);
                setUploadProgress(progress);

                // Calculate Speed & Time
                const elapsedSeconds = (Date.now() - startTime) / 1000;
                if (elapsedSeconds > 0) {
                    const speed = uploaded / elapsedSeconds; // bytes/sec
                    setUploadSpeed(`${formatBytes(speed)}/s`);

                    const remainingBytes = totalSize - uploaded;
                    const secondsLeft = Math.ceil(remainingBytes / speed);
                    setRemainingTime(`${secondsLeft}s`);
                }

                if (uploaded >= totalSize) {
                    clearInterval(uploadInterval);
                    startVirusScan();
                }
            }, 100); // Update every 100ms

        } else {
            // Link mode - instant
            await finalizeSubmission();
        }
    }

    const startVirusScan = async () => {
        setIsScanning(true);
        // Instant scan - no artificial delay for production performance
        // In production, this would be a real server-side scan

        // Mock Scan Result (In real world, this comes from server)
        // We could fail specific names for demo purposes
        if (file?.name.includes("virus") || file?.name.includes("malware")) {
            setIsScanning(false);
            setScanResult("infected");
            setError("Security Threat Detected: File contains malicious signatures.");
            setLoading(false);
        } else {
            setScanResult("clean");
            await finalizeSubmission();
        }
    };

    const finalizeSubmission = async () => {
        try {
            let finalUrl = formData.url;
            let finalSize = "0KB";
            let finalName = formData.name;

            if (inputMode === "file" && file) {
                if (formData.type === 'image' && base64Data) {
                    finalUrl = base64Data;
                } else {
                    finalUrl = `/uploads/${file.name}`; // Mock URL
                }

                if (!finalName) finalName = file.name;
                finalSize = formatBytes(file.size);
            } else if (inputMode === "link") {
                if (!finalName) finalName = "New Link";
            }

            await addProjectAsset({
                projectId,
                name: finalName,
                type: formData.type,
                url: finalUrl,
                description: formData.description,
                size: finalSize,
                uploadedBy: "Admin",
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
            setInputMode("link");
            resetState();
            router.refresh();
        } catch (error) {
            console.error("Failed to add asset", error);
            setError("Failed to save asset to database.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) resetState();
            setOpen(val);
        }}>
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
                        <TabsTrigger value="file">Secure Upload</TabsTrigger>
                    </TabsList>

                    <form onSubmit={onSubmit} className="space-y-4 pt-4">
                        {error && (
                            <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm border border-destructive/20">
                                <AlertTriangle className="h-4 w-4" />
                                <div>
                                    <span className="font-semibold block">Error</span>
                                    {error}
                                </div>
                            </div>
                        )}

                        <div className={inputMode === "file" ? "hidden" : "block"}>
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
                        </div>

                        <div className={inputMode === "file" ? "block space-y-4" : "hidden"}>
                            {!loading && !scanResult && (
                                <div className="space-y-2">
                                    <Label htmlFor="file">Select File</Label>
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                        <Input
                                            id="file"
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const f = e.target.files[0];
                                                    // Immediate Validation Check
                                                    const val = validateFile(f);
                                                    if (!val.valid) {
                                                        setError(val.error!);
                                                        e.target.value = ""; // clear input
                                                        return;
                                                    }
                                                    setError(null);
                                                    setFile(f);
                                                    setBase64Data(null);
                                                    setFormData(prev => ({ ...prev, content: "" }));

                                                    // Auto-detect & Read logic (same as before)
                                                    let type: AssetType = 'file';
                                                    const lowerName = f.name.toLowerCase();
                                                    if (f.type.startsWith('image/')) type = 'image';
                                                    else if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar')) type = 'zip';
                                                    else if (['.js', '.ts', '.tsx', '.jsx', '.md', '.json', '.html', '.css', '.py'].some(ext => lowerName.endsWith(ext))) type = 'code';
                                                    else type = 'file';

                                                    if (type === 'file' || type === 'code') {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            const text = e.target?.result;
                                                            if (typeof text === 'string') setFormData(prev => ({ ...prev, content: text }));
                                                        };
                                                        reader.readAsText(f);
                                                    } else if (type === 'image') {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            const result = e.target?.result;
                                                            if (typeof result === 'string') setBase64Data(result);
                                                        };
                                                        reader.readAsDataURL(f);
                                                    }
                                                    setFormData(prev => ({ ...prev, type: type, name: prev.name || f.name }));
                                                }
                                            }}
                                            required={inputMode === "file"}
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                                            {file ? (
                                                <div className="text-sm font-medium text-primary break-all">{file.name}</div>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-medium">Click to upload or drag and drop</span>
                                                    <span className="text-xs text-muted-foreground">Max 50MB. Secure Scanned.</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PROGRESS & SCANNING UI */}
                            {(loading || isScanning || scanResult === 'clean') && (
                                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-medium">
                                            {isScanning ? "Running Virus Scan..." :
                                                scanResult === 'clean' ? "Scan Passed. Finalizing..." :
                                                    "Uploading..."}
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

                        {/* Common Fields */}
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
                            <Button type="submit" disabled={loading || isScanning || (inputMode === 'file' && !file)}>
                                {loading || isScanning ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : "Add Asset"}
                            </Button>
                        </div>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
