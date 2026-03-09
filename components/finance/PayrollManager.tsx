"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { payEmployee } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Check, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PayrollItem {
    user: User;
    salary: number;
    status: string;
    month: string;
}

interface PayrollManagerProps {
    items: PayrollItem[];
}

export function PayrollManager({ items }: PayrollManagerProps) {
    const router = useRouter();
    const [loadingIds, setLoadingIds] = useState<string[]>([]);
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    const handlePay = async (userId: string, salary: number, month: string, userName: string) => {
        setLoadingIds(prev => [...prev, userId]);
        try {
            await payEmployee(userId, salary, month, userName);
            toast.success(`${userName} paid successfully`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(`Failed to pay ${userName}`);
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== userId));
        }
    };

    const handlePayAll = async () => {
        const pending = items.filter(i => i.status !== 'Paid');
        if (pending.length === 0) return;
        const results = await Promise.allSettled(
            pending.map(item => handlePay(item.user.id, item.salary, item.month, item.user.name))
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) toast.error(`${failed} of ${pending.length} payments failed`);
    };

    const paidCount = items.filter(i => i.status === 'Paid').length;
    const pendingCount = items.length - paidCount;
    const totalPayroll = items.reduce((sum, i) => sum + i.salary, 0);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle>Payroll Management</CardTitle>
                        <CardDescription>
                            {items.length > 0 ? (
                                <>
                                    {items[0]?.month} · Total: {formatter.format(totalPayroll)} ·
                                    <span className="text-emerald-500">{paidCount} paid</span>
                                    {pendingCount > 0 && <>, <span className="text-amber-500">{pendingCount} pending</span></>}
                                </>
                            ) : 'Manage monthly employee salaries.'}
                        </CardDescription>
                    </div>
                    {pendingCount > 1 && (
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={loadingIds.length > 0}
                            onClick={handlePayAll}
                        >
                            {loadingIds.length > 0 ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Paying...</>
                            ) : (
                                <><DollarSign className="mr-2 h-4 w-4" />Pay All ({pendingCount})</>
                            )}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table className="min-w-[550px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Salary</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No employees found.</TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {/* Avatar fallback if we had Avatar component handy, else text */}
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                    {item.user.name.charAt(0)}
                                                </div>
                                                {item.user.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{item.user.jobTitle || item.user.role}</TableCell>
                                        <TableCell>{formatter.format(item.salary)}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'Paid' ? 'secondary' : 'destructive'} className={
                                                item.status === 'Paid' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/15' : 'bg-red-500/15 text-red-500 border border-red-500/20 hover:bg-red-500/15'
                                            }>
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.status === 'Paid' ? (
                                                <Button disabled variant="ghost" size="sm" className="ml-auto">
                                                    <Check className="mr-2 h-4 w-4 text-emerald-500" />
                                                    Paid
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    disabled={loadingIds.includes(item.user.id)}
                                                    onClick={() => handlePay(item.user.id, item.salary, item.month, item.user.name)}
                                                >
                                                    {loadingIds.includes(item.user.id) ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <DollarSign className="mr-2 h-4 w-4" />
                                                            Pay Now
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
