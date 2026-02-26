"use client";

import { User, LeaveRequest } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLeaveStatus } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface LeaveRequestsListProps {
    requests: LeaveRequest[];
    mode: 'admin' | 'user';
    users?: User[]; // Optional list of users for lookup
}

export function LeaveRequestsList({ requests, mode, users = [] }: LeaveRequestsListProps) {
    const router = useRouter();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

    async function handleAction(id: string, status: 'Approved' | 'Rejected') {
        setProcessingId(id);
        try {
            // Optimistically hide the request immediately
            setProcessedIds(prev => new Set(prev).add(id));

            await updateLeaveStatus(id, status);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to process leave request. Please try again.");
            // Revert if error (remove from processedIds)
            setProcessedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } finally {
            setProcessingId(null);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/20';
            case 'Rejected': return 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/20';
            default: return 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-amber-500/20';
        }
    };

    const getUserName = (userId: string) => {
        return users.find(u => u.id === userId)?.name || userId;
    };

    // Filter out processed requests optimistically
    const visibleRequests = requests.filter(r => !processedIds.has(r.id));

    if (visibleRequests.length === 0) {
        return null;
    }

    return (
        <Card className="bg-card border-border mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Pending Leave Requests
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {visibleRequests.map((request) => (
                        <Card key={request.id} className="bg-card border-border">
                            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={getStatusColor(request.status)}>
                                            {request.status}
                                        </Badge>
                                        <span className="text-slate-200 font-medium">
                                            {request.type} Leave
                                        </span>
                                        {mode === 'admin' && (
                                            <span className="text-muted-foreground text-sm">
                                                by <span className="text-foreground font-medium">{getUserName(request.userId)}</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(request.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(request.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {request.reason}
                                    </p>
                                </div>

                                {mode === 'admin' && request.status === 'Pending' && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => handleAction(request.id, 'Approved')}
                                            disabled={!!processingId}
                                        >
                                            {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleAction(request.id, 'Rejected')}
                                            disabled={!!processingId}
                                        >
                                            {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                )}
                                {mode === 'admin' && request.status !== 'Pending' && (
                                    <div className="text-xs text-muted-foreground">
                                        Reviewed
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
