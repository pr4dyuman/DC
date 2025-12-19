import { getFinanceChartData, getFinanceStats, getInvoices, getTransactions, getPayrollStatus, getProjects, getUsers, getClients } from "@/lib/actions";
import { Transaction } from "@/lib/db";
import { StatsCards } from "@/components/finance/StatsCards";
import { RevenueChart } from "@/components/finance/RevenueChart";
import { TransactionList } from "@/components/finance/TransactionList";
import { InvoiceManager } from "@/components/finance/InvoiceManager";
import { PayrollManager } from "@/components/finance/PayrollManager";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectFinanceSummary } from "@/components/finance/ProjectFinanceSummary";
import { TeamFinanceSummary } from "@/components/finance/TeamFinanceSummary";
import { CategoryMemberSummary } from "@/components/finance/CategoryMemberSummary";
import { getCategoryMemberSummary } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { TotalBalance } from "@/components/finance/TotalBalance";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const projectId = typeof params.projectId === 'string' ? params.projectId : undefined;
    const userId = typeof params.userId === 'string' ? params.userId : undefined;
    const category = typeof params.category === 'string' ? params.category : undefined;
    const memberId = typeof params.memberId === 'string' ? params.memberId : undefined;

    const stats = await getFinanceStats(projectId, userId, category);
    const chartData = await getFinanceChartData(projectId, userId, category);
    const transactions = await getTransactions(projectId, userId, category);
    const invoices = await getInvoices(projectId);
    const payroll = await getPayrollStatus(userId);
    const categorySummary = category ? await getCategoryMemberSummary(category) : [];

    // Filter logic for clicking a member profile
    let memberTransactions: Transaction[] = [];
    if (category && memberId) {
        if (category === 'Internal Transfer') {
            const users = await getUsers();
            const member = users.find(u => u.id === memberId);
            if (member) {
                memberTransactions = transactions.filter(t => t.description.toLowerCase().includes(member.name.toLowerCase()));
            }
        } else if (category === 'Investor') {
            // For investor, memberId is the name itself
            memberTransactions = transactions.filter(t => t.description === memberId || t.description.includes(memberId));
        }
    }

    const rawProjects = await getProjects();
    const clients = await getClients();
    const users = await getUsers();

    const projects = rawProjects.map(p => {
        const clientName = clients.find(c => c.id === p.clientId || c.name === p.client)?.name || p.client;
        return {
            id: p.id,
            title: `${clientName} Project`,
            client: clientName || ""
        };
    });

    const selectedProjectName = projectId
        ? projects.find(p => p.id === projectId)?.title || "Project"
        : null;

    const selectedUser = userId
        ? users.find(u => u.id === userId)
        : null;

    // Team Stats Calculation
    const teamStats = {
        totalSalary: 0,
        totalInvestment: 0
    };


    let salaryTransactions: Transaction[] = [];
    let investmentTransactions: Transaction[] = [];

    if (userId && selectedUser) {
        // Filter transactions for this user
        // Salary: Expense + Category 'Salary' + Description/User match
        salaryTransactions = transactions.filter(t =>
            t.type === 'expense' &&
            t.category === 'Salary' &&
            (t.description.toLowerCase().includes(selectedUser.name.toLowerCase()) || true)
        );

        // Investment: Income + Description match (assuming user 'invested' or paid into company)
        investmentTransactions = transactions.filter(t =>
            t.type === 'income' &&
            t.description.toLowerCase().includes(selectedUser.name.toLowerCase())
        );

        teamStats.totalSalary = salaryTransactions.reduce((sum, t) => sum + t.amount, 0);
        teamStats.totalInvestment = investmentTransactions.reduce((sum, t) => sum + t.amount, 0);
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Finance</h2>
                <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2">
                        <AddTransactionModal users={users} projects={rawProjects} />
                    </div>
                    <TotalBalance amount={stats.netProfit} />
                </div>
            </div>

            <FinanceFilters projects={projects} users={users} />

            {/* TEAM VIEW */}
            {userId && selectedUser ? (
                <div className="space-y-6">
                    <TeamFinanceSummary
                        stats={teamStats}
                        userName={selectedUser.name}
                        salary={selectedUser.salary || 5000}
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-indigo-600">Salary History</CardTitle>
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
            ) : projectId && selectedProjectName ? (
                <div className="space-y-6">
                    <ProjectFinanceSummary stats={stats} projectName={selectedProjectName} />

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-green-600">Incoming Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TransactionList
                                    transactions={transactions.filter(t => t.type === 'income')}
                                    title="Received from Client"
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-red-600">Project Expenses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TransactionList
                                    transactions={transactions.filter(t => t.type === 'expense')}
                                    title="Spent on Project"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : category ? (
                <div className="space-y-6">
                    {/* Summary for "Others" category or drill-down to specific member */}
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
                                            {memberTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
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
                                    <TransactionList
                                        transactions={memberTransactions}
                                    />
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
                                <TransactionList
                                    transactions={transactions}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="invoices">Invoices</TabsTrigger>
                        <TabsTrigger value="payroll">Payroll</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <StatsCards stats={stats} />
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <div className="col-span-4">
                                <RevenueChart data={chartData} />
                            </div>
                            <div className="col-span-3">
                                <TransactionList transactions={transactions.slice(0, 5)} title="Recent Activity" />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="transactions" className="space-y-4">
                        <TransactionList transactions={transactions} />
                    </TabsContent>

                    <TabsContent value="invoices" className="space-y-4">
                        <InvoiceManager invoices={invoices} />
                    </TabsContent>

                    <TabsContent value="payroll" className="space-y-4">
                        <PayrollManager items={payroll} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

