import { CategoryMemberSummary } from "@/components/finance/CategoryMemberSummary";
import { TransactionList } from "@/components/finance/TransactionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { Transaction } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface FinanceCategorySummaryRow {
    id: string;
    name: string;
    total: number;
    count: number;
    avatar?: string;
}

interface FinanceCategoryDetailViewProps {
    category: string;
    memberId?: string;
    memberTransactions: Transaction[];
    categorySummary: FinanceCategorySummaryRow[];
    transactions: Transaction[];
    currency: string;
}

export function FinanceCategoryDetailView({
    category,
    memberId,
    memberTransactions,
    categorySummary,
    transactions,
    currency
}: FinanceCategoryDetailViewProps) {
    return (
        <div className="space-y-6">
            {!memberId ? (
                <CategoryMemberSummary category={category} data={categorySummary} />
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <Link
                            href={`/dashboard/finance?category=${category}`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to {category} Summary
                        </Link>
                        <h3 className="text-xl font-bold">
                            {category === "Internal Transfer"
                                ? `Transfers to ${memberTransactions[0]?.description.split('To ')[1] || 'Member'}`
                                : `${memberId} - Investor Details`}
                        </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(memberTransactions.reduce((sum, transaction) => sum + transaction.amount, 0), currency)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {memberTransactions.length} transactions
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TransactionList transactions={memberTransactions} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {!memberId && (
                <Card>
                    <CardHeader>
                        <CardTitle>All {category} Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList transactions={transactions} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
