import { TeamFinanceSummary } from "@/components/finance/TeamFinanceSummary";
import { TransactionList } from "@/components/finance/TransactionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction, User } from "@/lib/types";

interface FinanceTeamDetailViewProps {
    selectedUser: User;
    teamStats: {
        totalSalary: number;
        totalInvestment: number;
    };
    salaryTransactions: Transaction[];
    investmentTransactions: Transaction[];
}

export function FinanceTeamDetailView({
    selectedUser,
    teamStats,
    salaryTransactions,
    investmentTransactions
}: FinanceTeamDetailViewProps) {
    return (
        <div className="space-y-6">
            <TeamFinanceSummary
                stats={teamStats}
                userName={selectedUser.name}
                salary={selectedUser.salary ?? 0}
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-primary">Salary History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList
                            transactions={salaryTransactions}
                            title="Payments Received"
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-emerald-600">Investments / Contributions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList
                            transactions={investmentTransactions}
                            title="Invested in Company"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
