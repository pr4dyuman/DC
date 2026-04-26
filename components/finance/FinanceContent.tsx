
import { getFinanceChartData, getFinanceStats, getInvoices, getTransactions, getPayrollStatus, getProjects, getUsers, getUser, getClients, getCategoryMemberSummary, getSessionId } from "@/lib/actions";
import { Transaction } from "@/lib/types";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { TotalBalance } from "@/components/finance/TotalBalance";
import { redirect } from "next/navigation";
import { getDefaultCurrency } from "@/lib/actions/super-admin";
import { FinanceClientView } from "@/components/finance/FinanceClientView";
import { FinanceTeamDetailView } from "@/components/finance/FinanceTeamDetailView";
import { FinanceProjectDetailView } from "@/components/finance/FinanceProjectDetailView";
import { FinanceCategoryDetailView } from "@/components/finance/FinanceCategoryDetailView";
import { FinanceOverviewTabs } from "@/components/finance/FinanceOverviewTabs";

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
    const requestedTab = typeof params.tab === 'string' ? params.tab : undefined;

    const currentUserId = await getSessionId();
    const currentUser = currentUserId ? await getUser(currentUserId) : null;
    const isUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const isRestricted = currentUser?.role === 'employee';

    if (isRestricted) {
        redirect("/dashboard");
    }

    if (currentUser?.role === 'client') {
        const activeTab = requestedTab && ['invoices', 'history'].includes(requestedTab)
            ? requestedTab
            : 'invoices';
        // Force Client View immediately - Do not execute Admin logic
        const [clientInvoices, clientTransactions, clientProjects] = await Promise.all([
            getInvoices(),         // internally filters for client
            getTransactions(),      // internally filters for client
            getProjects(),          // returns only this client's projects
        ]);

        const pendingTotal = clientInvoices
            .filter(i => i.status === 'Pending' || i.status === 'Overdue')
            .reduce((acc, curr) => acc + curr.amount, 0);

        return <FinanceClientView activeTab={activeTab} invoices={clientInvoices} transactions={clientTransactions} pendingTotal={pendingTotal} currency={currency} projects={clientProjects} />;
    }

    const activeTab = requestedTab && ['overview', 'transactions', 'invoices', 'payroll'].includes(requestedTab)
        ? requestedTab
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

    const selectedProject = projectId
        ? rawProjects.find((project) => project.id === projectId) || null
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
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Finance</h2>
                <div className="flex flex-col items-start sm:items-end gap-1">
                    <div className="flex items-center space-x-2">
                        <AddTransactionModal users={users} projects={rawProjects} />
                    </div>
                    <TotalBalance amount={stats.netProfit} />
                </div>
            </div>

            <FinanceFilters projects={projects} users={users} />

            {/* TEAM VIEW */}
            {userId && selectedUser ? (
                <FinanceTeamDetailView
                    selectedUser={selectedUser}
                    teamStats={teamStats}
                    salaryTransactions={salaryTransactions}
                    investmentTransactions={investmentTransactions}
                />
            ) : selectedProject ? (
                <FinanceProjectDetailView project={selectedProject} transactions={transactions} />
            ) : category ? (
                <FinanceCategoryDetailView
                    category={category}
                    memberId={memberId}
                    memberTransactions={memberTransactions}
                    categorySummary={categorySummary}
                    transactions={transactions}
                    currency={currency}
                />
            ) : (
                <FinanceOverviewTabs
                    activeTab={activeTab}
                    stats={stats}
                    pendingPayables={pendingPayables}
                    chartData={chartData}
                    transactions={transactions}
                    isUserAdmin={isUserAdmin}
                    projects={rawProjects}
                    users={users}
                    invoices={invoices}
                    payroll={payroll}
                />
            )}
        </div>
    );
}
