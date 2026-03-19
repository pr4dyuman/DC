import { InvoiceManager } from "@/components/finance/InvoiceManager";
import { PayrollManager } from "@/components/finance/PayrollManager";
import { PendingPayablesList } from "@/components/finance/PendingPayablesList";
import { RevenueChart } from "@/components/finance/RevenueChart";
import { StatsCards } from "@/components/finance/StatsCards";
import { TransactionList } from "@/components/finance/TransactionList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Invoice, Project, Transaction, User } from "@/lib/types";

interface FinanceOverviewTabsProps {
    activeTab: string;
    stats: {
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        pendingInvoicesAmount: number;
        pendingInvoicesCount?: number;
    };
    pendingPayables: Transaction[];
    chartData: {
        name: string;
        income: number;
        expense: number;
    }[];
    transactions: Transaction[];
    isUserAdmin: boolean;
    projects: Project[];
    users: User[];
    invoices: Invoice[];
    payroll: {
        user: User;
        salary: number;
        status: string;
        month: string;
    }[];
}

export function FinanceOverviewTabs({
    activeTab,
    stats,
    pendingPayables,
    chartData,
    transactions,
    isUserAdmin,
    projects,
    users,
    invoices,
    payroll
}: FinanceOverviewTabsProps) {
    return (
        <Tabs defaultValue={activeTab} className="space-y-4">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
                <StatsCards stats={stats} />
                <PendingPayablesList transactions={pendingPayables} />
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                    <div className="lg:col-span-4">
                        <RevenueChart data={chartData} />
                    </div>
                    <div className="lg:col-span-3">
                        <TransactionList
                            transactions={transactions.slice(0, 5)}
                            title="Recent Activity"
                            isAdmin={isUserAdmin}
                            projects={projects}
                            users={users}
                        />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
                <TransactionList transactions={transactions} isAdmin={isUserAdmin} projects={projects} users={users} />
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
                <InvoiceManager invoices={invoices} projects={projects} />
            </TabsContent>

            <TabsContent value="payroll" className="space-y-4">
                <PayrollManager items={payroll} />
            </TabsContent>
        </Tabs>
    );
}
