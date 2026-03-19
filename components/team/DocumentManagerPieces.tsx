/* eslint-disable @next/next/no-img-element */
"use client";

import type { ChangeEvent } from "react";
import { AlertCircle, Clock, Eye, FileText, Loader2, ShieldAlert, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DocumentListType = "contracts" | "other";

type PendingBannerProps = {
    type: DocumentListType;
    pendingList?: string[];
    isAdmin: boolean;
    actionLoading: string | null;
    onApproveReject: (type: DocumentListType, approve: boolean) => void;
};

type DocumentCardProps = {
    url: string;
    index: number;
    type: DocumentListType;
    label: string;
    isPending: boolean;
    onPreview: (url: string) => void;
    onDelete: (index: number, type: DocumentListType) => void;
    isDeleting?: boolean;
};

type UploadCardProps = {
    label: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

type IdentityCardProps = {
    title: string;
    image?: string;
    pendingImage?: string;
    isRequired: boolean;
    isAdmin: boolean;
    onApprove: () => void;
    onReject: () => void;
    onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
    onPreview: (url: string) => void;
    actionLoading?: string | null;
};

export function PendingBanner({
    type,
    pendingList,
    isAdmin,
    actionLoading,
    onApproveReject,
}: PendingBannerProps) {
    if (!pendingList) return null;

    return (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                    <div>
                        <h4 className="font-medium text-yellow-700 dark:text-yellow-500">Pending Changes</h4>
                        <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80">
                            {isAdmin ? "User has proposed changes to this list." : "Your changes are awaiting approval."}
                        </p>
                    </div>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onApproveReject(type, true)}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {actionLoading === `approve-${type}` && <Loader2 className="w-3 h-3 animate-spin" />}
                            Approve All
                        </button>
                        <button
                            onClick={() => onApproveReject(type, false)}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {actionLoading === `reject-${type}` && <Loader2 className="w-3 h-3 animate-spin" />}
                            Reject
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function DocumentCard({
    url,
    index,
    type,
    label,
    isPending,
    onPreview,
    onDelete,
    isDeleting,
}: DocumentCardProps) {
    return (
        <div className={`group relative flex flex-col rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md ${isPending ? "border-yellow-500/50" : "border-border"}`}>
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                <img
                    src={url}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    alt={label}
                />

                <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <button
                        onClick={() => onPreview(url)}
                        className="px-3 py-1.5 bg-white text-black rounded-md text-xs font-bold hover:bg-gray-200 transition-colors w-24"
                    >
                        View
                    </button>
                    <button
                        onClick={() => onDelete(index, type)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-bold hover:bg-red-700 transition-colors w-24 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                        {isDeleting ? <><Loader2 className="w-3 h-3 animate-spin" /> Deleting</> : "Delete"}
                    </button>
                </div>
            </div>

            <div className="p-3 border-t border-border bg-card">
                <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${type === "contracts" ? "text-primary" : "text-purple-500"}`} />
                    <span className="text-sm font-medium truncate" title={label}>{label}</span>
                </div>
            </div>
        </div>
    );
}

export function UploadCard({ label, onChange }: UploadCardProps) {
    return (
        <label className="flex flex-col aspect-[4/3] md:aspect-auto md:h-full min-h-[140px] rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer items-center justify-center gap-2 text-muted-foreground hover:text-primary">
            <div className="p-3 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
                <Upload className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">{label}</span>
            <input type="file" accept="image/*" className="hidden" onChange={onChange} />
        </label>
    );
}

export function IdentityCard({
    title,
    image,
    pendingImage,
    isRequired,
    isAdmin,
    onApprove,
    onReject,
    onUpload,
    onPreview,
    actionLoading,
}: IdentityCardProps) {
    const hasPending = !!pendingImage;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium">{title}</h3>
                    {isRequired && (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5 py-0 h-5">
                            <AlertCircle className="w-3 h-3" /> Required
                        </Badge>
                    )}
                </div>
                {isAdmin && hasPending && (
                    <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500 bg-yellow-500/10">Pending Approval</Badge>
                        <button onClick={onApprove} disabled={!!actionLoading} className="text-xs text-green-500 font-medium hover:underline disabled:opacity-50 flex items-center gap-1">
                            {actionLoading?.startsWith("approve") && <Loader2 className="w-3 h-3 animate-spin" />}
                            Approve
                        </button>
                        <button onClick={onReject} disabled={!!actionLoading} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50 flex items-center gap-1">
                            {actionLoading?.startsWith("reject") && <Loader2 className="w-3 h-3 animate-spin" />}
                            Reject
                        </button>
                    </div>
                )}
                {!isAdmin && hasPending && (
                    <Badge variant="secondary" className="text-yellow-500 bg-yellow-500/10">Verification Pending</Badge>
                )}
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="aspect-[4/3] relative rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/5 flex items-center justify-center overflow-hidden group">
                        {image ? (
                            <>
                                <img src={image} alt={title} className="w-full h-full object-cover object-top transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => onPreview(image)}
                                        aria-label={`Preview ${title}`}
                                        className="p-2 bg-background/20 backdrop-blur text-white rounded-full hover:bg-background/40"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <ShieldAlert className="w-8 h-8 opacity-50" />
                                <span className="text-sm">No Document</span>
                            </div>
                        )}
                    </div>
                    <label className="mt-2 block">
                        <span className="sr-only">Upload {title}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                        <div className="text-xs text-center text-primary cursor-pointer hover:underline">
                            {image ? "Replace Document" : "Upload Document"}
                        </div>
                    </label>
                </div>

                {hasPending && (
                    <div className="flex-1 opacity-80 relative">
                        <div className="absolute -top-3 left-0 bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold z-10">
                            PENDING
                        </div>
                        <div className="group aspect-[4/3] relative rounded-lg border-2 border-yellow-500/30 bg-yellow-500/5 flex items-center justify-center overflow-hidden">
                            <img src={pendingImage} alt={`Pending ${title}`} className="w-full h-full object-cover object-top" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onPreview(pendingImage!)}
                                    aria-label={`Preview pending ${title}`}
                                    className="p-2 bg-black/40 text-white rounded-full"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
