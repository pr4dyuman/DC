
import { getFinanceChartData, getFinanceStats, getInvoices, getTransactions, getPayrollStatus, getProjects, getUsers, getUser, getClients, getCategoryMemberSummary, getSessionId } from "@/lib/actions";
import { Transaction } from "@/lib/types";
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
import { TotalBalance } from "@/components/finance/TotalBalance";
import { PendingPayablesList } from "@/components/finance/PendingPayablesList";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getDefaultCurrency } from "@/lib/actions/super-admin";

interface FinanceContentProps {
    searchParams: { [key: string]: string | string[] | undefined };
    currentUser: any; // Passed from parent to avoid re-fetching if possible, but page.tsx might not have it.
    // Actually page.tsx doesn't have currentUser easily available without blocking.
    // So FinanceContent should fetch it. It's cached.
}

function normalizeFinanceLabel(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

export async function FinanceContent({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const currency = await getDefaultCurrency();
    const params = searchParams;
    const projectId = typeof params.projectId === 'string' ? params.projectId : undefined;
    const username = typeof params.username === 'string' ? params.username : undefined;
    let userId = typeof params.userId === 'string' ? params.userId : undefined;
    const category = typeof params.category === 'string' ? params.category : undefined;
    const memberId = typeof params.memberId === 'string' ? params.memberId : undefined;
    const activeTab = typeof params.tab === 'string' && ['overview', 'transactions', 'invoices', 'payroll'].includes(params.tab)
        ? params.tab
        : 'overview';

    // Resolve username to userId if provided
    if (username && !userId) {
        const users = await getUsers();
        // Check users first
        const user = users.find(u => u.username === username);
        if (user) {
            userId = user.id;
        } else {
            // If not in users, check clients (since clients might have usernames too)
            const clients = await getClients();
            const client = clients.find(c => c.username === username);
            if (client) {
                userId = client.id;
            }
        }
    }

    // STRICT CLIENT CHECK: Perform this FIRST
    const currentUserId = await getSessionId();
    // Optimization: Use getUser which handles both Users and Clients tables
    // getUsers() ONLY returns employees, which is why the previous check failed for clients.
    const currentUser = currentUserId ? await getUser(currentUserId) : null;
    const isUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const isRestricted = currentUser?.role === 'employee';

    if (isRestricted) {
        redirect("/dashboard");
    }

    if (currentUser?.role === 'client') {
        // Force Client View immediately - Do not execute Admin logic
        const clientInvoices = await getInvoices(); // internally filters for client
        const clientTransactions = await getTransactions(); // internally filters for client

        const pendingTotal = clientInvoices
            .filter(i => i.status === 'Pending' || i.status === 'Overdue')
            .reduce((acc, curr) => acc + curr.amount, 0);

        return (
            <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Invoices</h2>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Due</p>
                        <p className="text-2xl font-bold text-emerald-500">{formatCurrency(pendingTotal, currency)}</p>
                    </div>
                </div>

                <Tabs defaultValue={['invoices', 'history'].includes(activeTab) ? activeTab : 'invoices'} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="invoices">Invoices</TabsTrigger>
                        <TabsTrigger value="history">Payment History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="invoices" className="space-y-4">
                        <InvoiceManager invoices={clientInvoices} isClient={true} />
                    </TabsContent>
                    <TabsContent value="history" className="space-y-4">
                        <TransactionList transactions={clientTransactions} title="Payments Made" />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // --- ADMIN / EMPLOYEE LOGIC BELOW (Only runs if NOT client) ---

    // Parallelize all independent data fetching
    const [
        stats,
        chartData,
        transactions,
        teamScopeTransactions,
        invoices,
        payroll,
        rawProjects,
        clients,
        users
    ] = await Promise.all([
        getFinanceStats(projectId, userId, category),
        getFinanceChartData(projectId, userId, category),
        getTransactions(projectId, userId, category),
        userId ? getTransactions(projectId, undefined, category) : Promise.resolve([] as Transaction[]),
        getInvoices(projectId),
        getPayrollStatus(userId),
        getProjects(),
        getClients(),
        getUsers()
    ]);

    // Filter pending transactions (both income and expense)
    const pendingPayables = transactions.filter(t => t.status === 'pending');

    const categorySummary = category ? await getCategoryMemberSummary(category) : [];

    // Filter logic for clicking a member profile
    let memberTransactions: Transaction[] = [];
    if (category && memberId) {
        if (category === 'Internal Transfer') {
            memberTransactions = memberId === 'unknown'
                ? transactions.filter(t => !t.userId)
                : transactions.filter(t => t.userId === memberId);
        } else if (category === 'Investor') {
            memberTransactions = memberId === 'Unknown Investor'
                ? transactions.filter(t => !String(t.description || '').trim())
                : transactions.filter(t => t.description === memberId);
        }
    }

    const projects = rawProjects.map(p => {
        const clientName = p.clientId
            ? clients.find(c => c.id === p.clientId)?.name
            : p.client;
        return {
            id: p.id,
            title: p.name,
            client: clientName || 'Unknown'
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
        const normalizedSelectedUserName = normalizeFinanceLabel(selectedUser.name);
        const teamTransactionPool = teamScopeTransactions.length > 0 ? teamScopeTransactions : transactions;

        // Filter transactions for this user
        // Salary: Expense + Category 'Salary' + Description/User match
        salaryTransactions = teamTransactionPool.filter(t =>
            t.type === 'expense' &&
            t.category === 'Salary' &&
            t.userId === selectedUser.id &&
            t.status === 'completed'
        );

        // Investor contributions may be linked by userId or stored only in the description label.
        investmentTransactions = teamTransactionPool.filter(t =>
            t.type === 'income' &&
            t.category === 'Investor' &&
            (
                t.userId === selectedUser.id ||
                (!t.userId && normalizeFinanceLabel(t.description) === normalizedSelectedUserName)
            ) &&
            t.status === 'completed'
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
            ) : projectId && selectedProjectName ? (
                <div className="space-y-6">
                    <ProjectFinanceSummary
                        project={rawProjects.find(p => p.id === projectId)!}
                        transactions={transactions.filter(t => t.projectId === projectId && t.status === 'completed')}
                    />

                    <PendingPayablesList transactions={transactions.filter(t => t.projectId === projectId && t.status !== 'completed')} />

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-emerald-500">Incoming Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TransactionList
                                    transactions={transactions.filter(t => t.projectId === projectId && t.type === 'income' && t.status === 'completed')}
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
                                    transactions={transactions.filter(t => t.projectId === projectId && t.type === 'expense' && t.status === 'completed')}
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
                                            {formatCurrency(memberTransactions.reduce((sum, t) => sum + t.amount, 0), currency)}
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
                                <TransactionList transactions={transactions.slice(0, 5)} title="Recent Activity" isAdmin={isUserAdmin} projects={rawProjects} users={users} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="transactions" className="space-y-4">
                        <TransactionList transactions={transactions} isAdmin={isUserAdmin} projects={rawProjects} users={users} />
                    </TabsContent>

                    <TabsContent value="invoices" className="space-y-4">
                        <InvoiceManager invoices={invoices} projects={rawProjects} />
                    </TabsContent>

                    <TabsContent value="payroll" className="space-y-4">
                        <PayrollManager items={payroll} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
