"use client";

import { useState } from "react";
import { User } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { payEmployee } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Check, DollarSign, Loader2 } from "lucide-react";

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
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== userId));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payroll Management</CardTitle>
                <CardDescription>Manage monthly employee salaries.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Month</TableHead>
                            <TableHead>Salary</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">No employees found.</TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.user.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {/* Avatar fallback if we had Avatar component handy, else text */}
                                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                                                {item.user.name.charAt(0)}
                                            </div>
                                            {item.user.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.user.jobTitle || item.user.role}</TableCell>
                                    <TableCell>{item.month}</TableCell>
                                    <TableCell>{formatter.format(item.salary)}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'Paid' ? 'secondary' : 'destructive'} className={
                                            item.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-red-100 text-red-800 hover:bg-red-100'
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
            </CardContent>
        </Card>
    );
}
