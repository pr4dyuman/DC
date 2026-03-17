import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Client } from "@/lib/types";
import { approveDocumentUpdate, updateUser } from "@/lib/actions";
import { AlertCircle, FileText, Clock, Eye, Upload, ShieldAlert, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface DocumentManagerProps {
    user: User | Client;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isAdmin: boolean;
    onSuccess?: () => void;
}

export function DocumentManager({ user, open, onOpenChange, isAdmin, onSuccess }: DocumentManagerProps) {
    const [activeTab, setActiveTab] = useState("identity");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'adhar' | 'pan' | 'contracts' | 'other' | 'contracts_add' | 'other_add') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast.error("File size must be under 2MB.");
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const result = reader.result as string;

            try {
                if (type === 'adhar') {
                    await updateUser(user.id, { adharCardImage: result });
                } else if (type === 'pan') {
                    await updateUser(user.id, { panCardImage: result });
                } else if (type === 'contracts_add') {
                    const currentList = user.contracts || [];
                    const newList = [...currentList, result];
                    await updateUser(user.id, { contracts: newList });
                } else if (type === 'other_add') {
                    const currentList = user.otherDocuments || [];
                    const newList = [...currentList, result];
                    await updateUser(user.id, { otherDocuments: newList });
                }
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error("Upload failed", error);
                toast.error("Failed to upload document");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = async (index: number, type: 'contracts' | 'other') => {
        const key = `delete-${type}-${index}`;
        if (actionLoading) return;
        setActionLoading(key);
        try {
            if (type === 'contracts') {
                const currentList = user.contracts || [];
                const newList = currentList.filter((_, i) => i !== index);
                await updateUser(user.id, { contracts: newList });
            } else {
                const currentList = user.otherDocuments || [];
                const newList = currentList.filter((_, i) => i !== index);
                await updateUser(user.id, { otherDocuments: newList });
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete document");
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveReject = useCallback(async (type: 'adhar' | 'pan' | 'contracts' | 'other' | 'both', approve: boolean) => {
        const key = `${approve ? 'approve' : 'reject'}-${type}`;
        if (actionLoading) return;
        setActionLoading(key);
        try {
            await approveDocumentUpdate(user.id, type, approve);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(`${approve ? 'Approve' : 'Reject'} failed`, error);
            toast.error(`Failed to ${approve ? 'approve' : 'reject'} documents`);
        } finally {
            setActionLoading(null);
        }
    }, [actionLoading, user.id, onSuccess]);

    const PendingBanner = ({ type, pendingList }: { type: 'contracts' | 'other', pendingList: string[] }) => {
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
                                onClick={() => handleApproveReject(type, true)}
                                disabled={!!actionLoading}
                                className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {actionLoading === `approve-${type}` && <Loader2 className="w-3 h-3 animate-spin" />}
                                Approve All
                            </button>
                            <button
                                onClick={() => handleApproveReject(type, false)}
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
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-card border-border p-0 gap-0">
                    <div className="p-6 border-b border-border bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Document Manager</DialogTitle>
                            <DialogDescription>
                                Manage legal and identity documents for {user.name}.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-hidden flex">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                            <div className="px-6 pt-4">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="identity">Identity Verification</TabsTrigger>
                                    <TabsTrigger value="contracts">Contracts & Agreements</TabsTrigger>
                                    <TabsTrigger value="other">Other Documents</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <TabsContent value="identity" className="mt-0 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Aadhar Section */}
                                        <IdentityCard
                                            title="Aadhar Card"
                                            image={user.adharCardImage}
                                            pendingImage={user.pendingAdharCardImage}
                                            isRequired={!user.adharCardImage && !user.pendingAdharCardImage}
                                            isAdmin={isAdmin}
                                            onApprove={() => handleApproveReject('adhar', true)}
                                            onReject={() => handleApproveReject('adhar', false)}
                                            actionLoading={actionLoading}
                                            onUpload={(e) => handleFileUpload(e, 'adhar')}
                                            onPreview={setPreviewImage}
                                        />

                                        {/* PAN Section */}
                                        <IdentityCard
                                            title="PAN Card"
                                            image={user.panCardImage}
                                            pendingImage={user.pendingPanCardImage}
                                            isRequired={!user.panCardImage && !user.pendingPanCardImage}
                                            isAdmin={isAdmin}
                                            onApprove={() => handleApproveReject('pan', true)}
                                            onReject={() => handleApproveReject('pan', false)}
                                            actionLoading={actionLoading}
                                            onUpload={(e) => handleFileUpload(e, 'pan')}
                                            onPreview={setPreviewImage}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="contracts" className="mt-0">
                                    <PendingBanner type="contracts" pendingList={user.pendingContracts!} />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {(user.pendingContracts || user.contracts || []).map((doc, idx) => (
                                            <DocumentCard
                                                key={idx}
                                                url={doc}
                                                index={idx}
                                                type="contracts"
                                                label={`Contract ${idx + 1}`}
                                                isPending={!!user.pendingContracts}
                                                onPreview={setPreviewImage}
                                                onDelete={handleDelete}
                                                isDeleting={actionLoading === `delete-contracts-${idx}`}
                                            />
                                        ))}
                                        <UploadCard label="Add Contract" onChange={(e) => handleFileUpload(e, 'contracts_add')} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="other" className="mt-0">
                                    <PendingBanner type="other" pendingList={user.pendingOtherDocuments!} />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {(user.pendingOtherDocuments || user.otherDocuments || []).map((doc, idx) => (
                                            <DocumentCard
                                                key={idx}
                                                url={doc}
                                                index={idx}
                                                type="other"
                                                label={`Document ${idx + 1}`}
                                                isPending={!!user.pendingOtherDocuments}
                                                onPreview={setPreviewImage}
                                                onDelete={handleDelete}
                                                isDeleting={actionLoading === `delete-other-${idx}`}
                                            />
                                        ))}
                                        <UploadCard label="Add Document" onChange={(e) => handleFileUpload(e, 'other_add')} />
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>

            {previewImage && (
                <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                    <DialogContent className="max-w-[95vw] md:max-w-[90vw] h-[95vh] p-0 overflow-hidden bg-black/95 border-none">
                        <DialogTitle className="sr-only">Document Preview</DialogTitle>
                        <div className="relative w-full h-full flex items-center justify-center">
                            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full z-50">
                                <X className="w-6 h-6" />
                            </button>
                            <img src={previewImage} alt="Document preview" className="max-w-full max-h-full object-contain" />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

function DocumentCard({ url, index, type, label, isPending, onPreview, onDelete, isDeleting }: { url: string, index: number, type: 'contracts' | 'other', label: string, isPending: boolean, onPreview: (url: string) => void, onDelete: (index: number, type: 'contracts' | 'other') => void, isDeleting?: boolean }) {
    return (
        <div className={`group relative flex flex-col rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md ${isPending ? 'border-yellow-500/50' : 'border-border'}`}>
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                <img
                    src={url}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    alt={label}
                />

                {/* Hover Overlay */}
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
                        {isDeleting ? <><Loader2 className="w-3 h-3 animate-spin" /> Deleting</> : 'Delete'}
                    </button>
                </div>
            </div>

            <div className="p-3 border-t border-border bg-card">
                <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${type === 'contracts' ? 'text-primary' : 'text-purple-500'}`} />
                    <span className="text-sm font-medium truncate" title={label}>{label}</span>
                </div>
            </div>
        </div>
    );
}

function UploadCard({ label, onChange }: { label: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
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

// Identity Card Helper
interface IdentityCardProps {
    title: string;
    image?: string;
    pendingImage?: string;
    isRequired: boolean;
    isAdmin: boolean;
    onApprove: () => void;
    onReject: () => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPreview: (url: string) => void;
    actionLoading?: string | null;
}

function IdentityCard({ title, image, pendingImage, isRequired, isAdmin, onApprove, onReject, onUpload, onPreview, actionLoading }: IdentityCardProps) {
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
                {/* Status Badges */}
                {isAdmin && hasPending && (
                    <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500 bg-yellow-500/10">Pending Approval</Badge>
                        <button onClick={onApprove} disabled={!!actionLoading} className="text-xs text-green-500 font-medium hover:underline disabled:opacity-50 flex items-center gap-1">
                            {actionLoading?.startsWith('approve') && <Loader2 className="w-3 h-3 animate-spin" />}
                            Approve
                        </button>
                        <button onClick={onReject} disabled={!!actionLoading} className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50 flex items-center gap-1">
                            {actionLoading?.startsWith('reject') && <Loader2 className="w-3 h-3 animate-spin" />}
                            Reject
                        </button>
                    </div>
                )}
                {!isAdmin && hasPending && (
                    <Badge variant="secondary" className="text-yellow-500 bg-yellow-500/10">Verification Pending</Badge>
                )}
            </div>

            <div className="flex gap-4">
                {/* Current Image */}
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

                {/* Pending Image (Side by Side if exists) */}
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
