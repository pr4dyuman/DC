"use client";

import { Invoice, Project } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { createInvoice, clientMarkInvoiceAsPaid, adminApproveInvoicePayment, adminRejectInvoicePayment } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

interface InvoiceManagerProps {
    invoices: Invoice[];
    isClient?: boolean;
    projects?: Project[];
}

export function InvoiceManager({ invoices, isClient = false, projects = [] }: InvoiceManagerProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    const [formData, setFormData] = useState({
        projectId: "",
        amount: "",
        date: "",
    });

    useEffect(() => {
        setMounted(true);
        setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.projectId) return;
        setLoading(true);
        try {
            await createInvoice({
                projectId: formData.projectId,
                amount: parseFloat(formData.amount),
                date: formData.date
            });
            toast.success("Invoice created successfully");
            setOpen(false);
            setFormData({ projectId: "", amount: "", date: new Date().toISOString().split('T')[0] });
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    const handleClientSubmitPayment = async (invoiceId: string) => {
        setActionLoadingId(invoiceId);
        try {
            await clientMarkInvoiceAsPaid(invoiceId);
            toast.success("Payment submitted for review");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit payment");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleAdminApprove = async (invoiceId: string) => {
        setActionLoadingId(invoiceId);
        try {
            await adminApproveInvoicePayment(invoiceId);
            toast.success("Payment approved");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to approve payment");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleAdminReject = async (invoiceId: string) => {
        setActionLoadingId(invoiceId);
        try {
            await adminRejectInvoicePayment(invoiceId);
            toast.success("Payment rejected");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to reject payment");
        } finally {
            setActionLoadingId(null);
        }
    };

    const getProjectName = (projectId: string) => {
        return projects.find(p => p.id === projectId)?.name || projectId;
    };

    return (
        <Card className="col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription>Manage your sent invoices.</CardDescription>
                </div>
                {!isClient && (
                    mounted ? (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Invoice
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={handleSubmit}>
                                    <DialogHeader>
                                        <DialogTitle>Create Invoice</DialogTitle>
                                        <DialogDescription>Create a new invoice for a project.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Project</Label>
                                            <Select
                                                value={formData.projectId}
                                                onValueChange={(val) => setFormData({ ...formData, projectId: val })}
                                            >
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue placeholder="Select Project" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {projects.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="amount" className="text-right">Amount</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                min="1"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="date" className="text-right">Date</Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={loading || !formData.projectId}>
                                            {loading ? "Creating..." : "Create Invoice"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Invoice
                        </Button>
                    )
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">No invoices found.</TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{getProjectName(invoice.projectId)}</TableCell>
                                    <TableCell>{format(new Date(invoice.date), "MMM d, yyyy")}</TableCell>
                                    <TableCell>{formatter.format(invoice.amount)}</TableCell>
                                    <TableCell>
                                        <Badge variant={invoice.status === 'Paid' ? 'secondary' : 'default'} className={
                                            invoice.status === 'Paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                                invoice.status === 'Pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                    invoice.status === 'Processing' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                        }>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {isClient ? (
                                            invoice.status === 'Pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actionLoadingId === invoice.id}
                                                    onClick={() => handleClientSubmitPayment(invoice.id)}
                                                >
                                                    {actionLoadingId === invoice.id ? (
                                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                                                    ) : "Submit Payment"}
                                                </Button>
                                            )
                                        ) : (
                                            invoice.status === 'Processing' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                        disabled={actionLoadingId === invoice.id}
                                                        onClick={() => handleAdminApprove(invoice.id)}
                                                    >
                                                        {actionLoadingId === invoice.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : "Approve"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={actionLoadingId === invoice.id}
                                                        onClick={() => handleAdminReject(invoice.id)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
