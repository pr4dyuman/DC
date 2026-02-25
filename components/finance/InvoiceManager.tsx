"use client";

import { Invoice } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { createInvoice, updateInvoiceStatus } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface InvoiceManagerProps {
    invoices: Invoice[];
    isClient?: boolean;
}

export function InvoiceManager({ invoices, isClient = false }: InvoiceManagerProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    const [formData, setFormData] = useState({
        projectId: "", // Force user to select a project
        amount: "",
        date: "", // Initialize empty to avoid hydration mismatch
    });

    useEffect(() => {
        setMounted(true);
        // Set default date on client side
        setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createInvoice({
                projectId: formData.projectId,
                amount: parseFloat(formData.amount),
                date: formData.date
            });
            setOpen(false);
            setFormData({ projectId: "", amount: "", date: new Date().toISOString().split('T')[0] });
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: 'Paid' | 'Pending' | 'Overdue' | 'Processing') => {
        try {
            await updateInvoiceStatus(id, newStatus);
            router.refresh();
        } catch (error) {
            console.error(error);
        }
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
                                            <Label htmlFor="amount" className="text-right">Amount</Label>
                                            <Input
                                                id="amount"
                                                type="number"
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
                                        <Button type="submit" disabled={loading}>
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
                            <TableHead>ID</TableHead>
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
                                    <TableCell className="font-medium">{invoice.id}</TableCell>
                                    <TableCell>{format(new Date(invoice.date), "MMM d, yyyy")}</TableCell>
                                    <TableCell>{formatter.format(invoice.amount)}</TableCell>
                                    <TableCell>
                                        <Badge variant={invoice.status === 'Paid' ? 'secondary' : 'default'} className={
                                            invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                                                invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    invoice.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                        }>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {isClient ? (
                                            invoice.status === 'Pending' && (
                                                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(invoice.id, 'Processing')}>
                                                    Submit Payment
                                                </Button>
                                            )
                                        ) : (
                                            invoice.status === 'Processing' && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusUpdate(invoice.id, 'Paid')}>
                                                        Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(invoice.id, 'Pending')}>
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
