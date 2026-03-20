import { InvoiceManager } from "@/components/finance/InvoiceManager";
import { TransactionList } from "@/components/finance/TransactionList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";
import { Transaction, Invoice } from "@/lib/types";
import { Project } from "@/lib/types";

interface FinanceClientViewProps {
    activeTab: string;
    invoices: Invoice[];
    transactions: Transaction[];
    pendingTotal: number;
    currency: string;
    projects?: Project[];
}

export function FinanceClientView({
    activeTab,
    invoices,
    transactions,
    pendingTotal,
    currency,
    projects = [],
}: FinanceClientViewProps) {
    const defaultTab = ['invoices', 'history'].includes(activeTab) ? activeTab : 'invoices';

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Invoices</h2>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Due</p>
                    <p className="text-2xl font-bold text-emerald-500">{formatCurrency(pendingTotal, currency)}</p>
                </div>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="history">Payment History</TabsTrigger>
                </TabsList>
                <TabsContent value="invoices" className="space-y-4">
                    <InvoiceManager invoices={invoices} isClient={true} projects={projects} />
                </TabsContent>
                <TabsContent value="history" className="space-y-4">
                    <TransactionList transactions={transactions} title="Payments Made" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
