"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { AlertTriangle, PlusIcon } from "lucide-react";

import { addProjectAsset } from "@/lib/actions";
import { AssetType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AddAssetDetailsFields } from "./AddAssetDetailsFields";
import { AddAssetSecureUploadPanel } from "./AddAssetSecureUploadPanel";

interface AddAssetModalProps {
    projectId: string;
}

const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024;
const MAX_EXTRACTABLE_TEXT_BYTES = 1024 * 1024;
const MAX_ASSET_CONTENT_CHARS = 200_000;
const TEXT_CONTENT_EXTENSIONS = [".txt", ".md", ".json", ".html", ".css", ".js", ".ts", ".tsx", ".jsx", ".py", ".csv"];

function shouldExtractTextContent(type: AssetType, fileName: string) {
    return type === "code" || TEXT_CONTENT_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function truncateAssetContent(content: string) {
    return content.length > MAX_ASSET_CONTENT_CHARS
        ? content.slice(0, MAX_ASSET_CONTENT_CHARS)
        : content;
}

export function AddAssetModal({ projectId }: AddAssetModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [inputMode, setInputMode] = useState<"link" | "file">("link");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState("");
    const [remainingTime, setRemainingTime] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<"clean" | "infected" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "link" as AssetType,
        url: "",
        description: "",
        content: "" as string | undefined,
    });
    const [file, setFile] = useState<File | null>(null);

    const handleModeChange = (mode: "link" | "file") => {
        setInputMode(mode);
        resetState();
        if (mode === "link") {
            setFormData((prev) => ({ ...prev, type: "link", url: "" }));
            setFile(null);
        } else {
            setFormData((prev) => ({ ...prev, type: "file", url: "" }));
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
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const ALLOWED_EXTENSIONS = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
        ".md", ".json", ".html", ".css", ".js", ".ts", ".tsx", ".jsx", ".py",
        ".zip", ".rar",
    ];
    const MAX_SIZE = 50 * 1024 * 1024;

    const validateFile = (selectedFile: File): { valid: boolean; error?: string } => {
        const fileName = selectedFile.name.toLowerCase();
        const ext = "." + fileName.split(".").pop();

        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            const allowed = ALLOWED_EXTENSIONS.map((entry) => entry.replace(".", "").toUpperCase()).join(", ");
            return { valid: false, error: `Unsupported file type (${ext}). Allowed types: ${allowed}` };
        }

        if (selectedFile.size > MAX_SIZE) {
            const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
            return { valid: false, error: `File too large (${sizeMB}MB). Maximum size is 50MB.` };
        }

        return { valid: true };
    };

    const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;

        const nextFile = event.target.files[0];
        const validation = validateFile(nextFile);
        if (!validation.valid) {
            setError(validation.error || "Invalid file");
            event.target.value = "";
            return;
        }

        setError(null);
        setFile(nextFile);
        setFormData((prev) => ({ ...prev, content: "" }));

        let nextType: AssetType = "file";
        const lowerName = nextFile.name.toLowerCase();
        if (nextFile.type.startsWith("image/")) nextType = "image";
        else if (lowerName.endsWith(".zip") || lowerName.endsWith(".rar")) nextType = "zip";
        else if ([".js", ".ts", ".tsx", ".jsx", ".md", ".json", ".html", ".css", ".py"].some((ext) => lowerName.endsWith(ext))) nextType = "code";

        if (shouldExtractTextContent(nextType, lowerName) && nextFile.size <= MAX_EXTRACTABLE_TEXT_BYTES) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const text = loadEvent.target?.result;
                if (typeof text === "string") {
                    setFormData((prev) => ({ ...prev, content: truncateAssetContent(text) }));
                }
            };
            reader.readAsText(nextFile);
        }

        setFormData((prev) => ({ ...prev, type: nextType, name: prev.name || nextFile.name }));
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) resetState();
        setOpen(nextOpen);
    };

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (inputMode === "file" && file) {
            const validation = validateFile(file);
            if (!validation.valid) {
                setError(validation.error || "Invalid file");
                return;
            }

            setLoading(true);

            try {
                const startTime = Date.now();
                let uploadUrl: string;

                if (file.size > DIRECT_UPLOAD_LIMIT) {
                    setUploadProgress(10);
                    try {
                        const blob = await upload(file.name, file, {
                            access: "public",
                            clientPayload: JSON.stringify({
                                contentType: file.type || undefined,
                                fileSize: file.size,
                                projectId,
                            }),
                            handleUploadUrl: "/api/upload-blob",
                        });
                        uploadUrl = blob.url;
                        setUploadProgress(100);
                    } catch (uploadError) {
                        throw new Error(uploadError instanceof Error ? uploadError.message : "Large file upload failed. Storage may be full.");
                    }
                } else {
                    const uploadFormData = new FormData();
                    uploadFormData.append("file", file);
                    uploadFormData.append("projectId", projectId);

                    uploadUrl = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();

                        xhr.upload.addEventListener("progress", (progressEvent) => {
                            if (progressEvent.lengthComputable) {
                                const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                                setUploadProgress(progress);

                                const elapsedSeconds = (Date.now() - startTime) / 1000;
                                if (elapsedSeconds > 0) {
                                    const speed = progressEvent.loaded / elapsedSeconds;
                                    setUploadSpeed(`${formatBytes(speed)}/s`);
                                    const remainingBytes = progressEvent.total - progressEvent.loaded;
                                    const secondsLeft = Math.ceil(remainingBytes / speed);
                                    setRemainingTime(`${secondsLeft}s`);
                                }
                            }
                        });

                        xhr.addEventListener("load", () => {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                if (xhr.status >= 200 && xhr.status < 300 && data.success) {
                                    resolve(data.url);
                                } else {
                                    reject(new Error(data.error || "Upload failed"));
                                }
                            } catch {
                                reject(new Error("Upload failed"));
                            }
                        });

                        xhr.addEventListener("error", () => reject(new Error("Network error. Check your connection and try again.")));
                        xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled.")));
                        xhr.addEventListener("timeout", () => reject(new Error("Upload timed out. The file may be too large for your connection speed.")));

                        xhr.open("POST", "/api/upload-dc");
                        xhr.timeout = 120000;
                        xhr.send(uploadFormData);
                    });
                }

                setUploadProgress(100);
                setIsScanning(false);
                setScanResult("clean");

                const finalName = formData.name || file.name;
                const finalSize = formatBytes(file.size);

                await addProjectAsset({
                    projectId,
                    name: finalName,
                    type: formData.type,
                    url: uploadUrl,
                    description: formData.description,
                    size: finalSize,
                    content: formData.content,
                });

                setOpen(false);
                setFormData({ name: "", type: "link", url: "", description: "", content: "" });
                setInputMode("link");
                resetState();
                router.refresh();
            } catch (submitError) {
                const msg = submitError instanceof Error ? submitError.message : "Upload failed.";
                if (msg.includes("413") || msg.toLowerCase().includes("too large") || msg.toLowerCase().includes("body exceeded")) {
                    setError("File is too large. Maximum upload size is 50MB.");
                } else if (msg.includes("403") || msg.toLowerCase().includes("storage limit")) {
                    setError("Storage limit reached. Contact your admin to upgrade.");
                } else if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
                    setError("Session expired. Please refresh the page and try again.");
                } else {
                    setError(msg);
                }
            } finally {
                setLoading(false);
            }
        } else {
            await finalizeSubmission();
        }
    }

    const finalizeSubmission = async () => {
        try {
            const finalUrl = formData.url;
            let finalName = formData.name;

            if (inputMode === "link" && !finalName) {
                finalName = "New Link";
            }

            await addProjectAsset({
                projectId,
                name: finalName,
                type: formData.type,
                url: finalUrl,
                description: formData.description,
                size: "0KB",
                content: formData.content,
            });

            setOpen(false);
            setFormData({
                name: "",
                type: "link",
                url: "",
                description: "",
                content: "",
            });
            setInputMode("link");
            resetState();
            router.refresh();
        } catch (saveError) {
            console.error("Failed to add asset", saveError);
            setError("Failed to save asset to database.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Asset
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[85dvh] flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Add Project Asset</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="link" value={inputMode} onValueChange={(value) => handleModeChange(value as "link" | "file")} className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
                    <TabsList className="grid w-full grid-cols-2 shrink-0">
                        <TabsTrigger value="link">External Link</TabsTrigger>
                        <TabsTrigger value="file">Secure Upload</TabsTrigger>
                    </TabsList>

                    <form onSubmit={onSubmit} className="space-y-4 pt-4 overflow-y-auto flex-1 px-1 -mx-1">
                        {error && (
                            <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm border border-destructive/20">
                                <AlertTriangle className="h-4 w-4" />
                                <div>
                                    <span className="font-semibold block">Error</span>
                                    {error}
                                </div>
                            </div>
                        )}

                        <AddAssetSecureUploadPanel
                            inputMode={inputMode}
                            loading={loading}
                            isScanning={isScanning}
                            scanResult={scanResult}
                            uploadProgress={uploadProgress}
                            uploadSpeed={uploadSpeed}
                            remainingTime={remainingTime}
                            fileName={file?.name || null}
                            onFileChange={handleFileSelection}
                        />

                        <AddAssetDetailsFields
                            inputMode={inputMode}
                            type={formData.type}
                            name={formData.name}
                            url={formData.url}
                            description={formData.description}
                            loading={loading}
                            isScanning={isScanning}
                            hasFile={!!file}
                            onTypeChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                            onNameChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                            onUrlChange={(value) => setFormData((prev) => ({ ...prev, url: value }))}
                            onDescriptionChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                        />
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
