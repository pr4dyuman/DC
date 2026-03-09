"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter, useSearchParams } from "next/navigation";

interface CategoryMemberSummaryProps {
    category: string;
    data: {
        id: string;
        name: string;
        total: number;
        count: number;
        avatar?: string;
    }[];
}

export function CategoryMemberSummary({ category, data }: CategoryMemberSummaryProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const totalAmount = data.reduce((sum, item) => sum + item.total, 0);

    const handleMemberClick = (memberId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("memberId", memberId);
        router.push(`/dashboard/finance?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total {category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across {data.length} {category === 'Investor' ? 'investors' : 'members'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{category} Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div
                                key={index}
                                onClick={() => handleMemberClick(item.id)}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={item.avatar} alt={item.name} />
                                        <AvatarFallback>{item.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium leading-none hover:underline">{item.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{item.count} transactions</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">
                                        {item.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                    </p>
                                    <div className="h-1 w-full bg-muted mt-1 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${totalAmount > 0 ? (item.total / totalAmount) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
