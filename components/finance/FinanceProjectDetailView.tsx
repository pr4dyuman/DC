import { PendingPayablesList } from "@/components/finance/PendingPayablesList";
import { ProjectFinanceSummary } from "@/components/finance/ProjectFinanceSummary";
import { TransactionList } from "@/components/finance/TransactionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, Transaction } from "@/lib/types";

interface FinanceProjectDetailViewProps {
    project: Project;
    transactions: Transaction[];
}

export function FinanceProjectDetailView({ project, transactions }: FinanceProjectDetailViewProps) {
    const completedTransactions = transactions.filter(
        (transaction) => transaction.projectId === project.id && transaction.status === 'completed'
    );
    const pendingTransactions = transactions.filter(
        (transaction) => transaction.projectId === project.id && transaction.status !== 'completed'
    );
    const incomingTransactions = completedTransactions.filter((transaction) => transaction.type === 'income');
    const expenseTransactions = completedTransactions.filter((transaction) => transaction.type === 'expense');

    return (
        <div className="space-y-6">
            <ProjectFinanceSummary
                project={project}
                transactions={completedTransactions}
            />

            <PendingPayablesList transactions={pendingTransactions} />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-emerald-500">Incoming Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList
                            transactions={incomingTransactions}
                            title="Received from Client"
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-500">Project Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList
                            transactions={expenseTransactions}
                            title="Spent on Project"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
