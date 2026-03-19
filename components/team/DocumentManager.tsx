import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Client } from "@/lib/types";
import { approveDocumentUpdate, updateUser } from "@/lib/actions";
import { DocumentManagerPreviewDialog } from "./DocumentManagerPreviewDialog";
import {
    DocumentCard,
    IdentityCard,
    PendingBanner,
    UploadCard,
} from "./DocumentManagerPieces";
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
                                    <PendingBanner
                                        type="contracts"
                                        pendingList={user.pendingContracts}
                                        isAdmin={isAdmin}
                                        actionLoading={actionLoading}
                                        onApproveReject={handleApproveReject}
                                    />
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
                                    <PendingBanner
                                        type="other"
                                        pendingList={user.pendingOtherDocuments}
                                        isAdmin={isAdmin}
                                        actionLoading={actionLoading}
                                        onApproveReject={handleApproveReject}
                                    />
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

            <DocumentManagerPreviewDialog
                previewImage={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </>
    );
}
