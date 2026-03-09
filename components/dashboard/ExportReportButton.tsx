"use client";

import { useState } from "react";
import { Download, Loader2, X, FileSpreadsheet, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getExportData } from "@/lib/exportActions";
import { useDateFormat } from "@/context/TimezoneContext";

function toCSV(rows: (string | number)[][]): string {
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function downloadCSV(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Default to current month
function defaultDates() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
    };
}

export function ExportReportButton() {
    const fmt = useDateFormat();
    const [open, setOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const defaults = defaultDates();
    const [startDate, setStartDate] = useState(defaults.start);
    const [endDate, setEndDate] = useState(defaults.end);
    const [exportType, setExportType] = useState<"summary" | "transactions" | "invoices" | "all">("all");

    const handleExport = async () => {
        setError("");
        if (!startDate || !endDate) { setError("Please select both dates."); return; }
        if (startDate > endDate) { setError("Start date must be before end date."); return; }

        setExporting(true);
        try {
            const data = await getExportData(startDate, endDate);
            const label = `${startDate}_to_${endDate}`;

            if (exportType === "summary" || exportType === "all") {
                const rows: (string | number)[][] = [
                    ["Dashboard Summary Report"],
                    [`Period: ${startDate} to ${endDate}`],
                    [`Generated: ${fmt.dateTime(new Date())}`],
                    [],
                    ["FINANCES"],
                    ["Total Income", `Rs ${data.summary.totalIncome.toLocaleString()}`],
                    ["Total Expenses", `Rs ${data.summary.totalExpense.toLocaleString()}`],
                    ["Net Profit", `Rs ${data.summary.netProfit.toLocaleString()}`],
                    [],
                    ["INVOICES"],
                    ["Total Invoiced", `Rs ${data.summary.totalInvoiced.toLocaleString()}`],
                    ["Total Collected", `Rs ${data.summary.totalPaid.toLocaleString()}`],
                    ["Paid", data.summary.invoicesPaid],
                    ["Pending", data.summary.invoicesPending],
                    ["Overdue", data.summary.invoicesOverdue],
                    [],
                    ["TASKS & PROJECTS"],
                    ["Tasks Completed", data.summary.tasksDone],
                    ["Tasks In Progress", data.summary.tasksInProgress],
                    ["Tasks Todo", data.summary.tasksTodo],
                    ["New Projects", data.summary.newProjects],
                ];
                downloadCSV(`summary_${label}.csv`, toCSV(rows));
            }

            if (exportType === "transactions" || exportType === "all") {
                if (data.transactions.length > 0) {
                    const rows: (string | number)[][] = [
                        ["Date", "Description", "Type", "Category", "Amount (Rs)", "Status"],
                        ...data.transactions.map(t => [t.date, t.description, t.type, t.category, t.amount, t.status]),
                    ];
                    downloadCSV(`transactions_${label}.csv`, toCSV(rows));
                }
            }

            if (exportType === "invoices" || exportType === "all") {
                if (data.invoices.length > 0) {
                    const rows: (string | number)[][] = [
                        ["Date", "Client ID", "Description", "Amount (Rs)", "Status"],
                        ...data.invoices.map(i => [i.date, i.clientId, i.description, i.amount, i.status]),
                    ];
                    downloadCSV(`invoices_${label}.csv`, toCSV(rows));
                }
            }

            setOpen(false);
        } catch (e) {
            setError("Export failed. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 transition-colors whitespace-nowrap"
            >
                <Download className="h-4 w-4" />
                Export Report
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            Export Dashboard Report
                        </DialogTitle>
                        <DialogDescription>
                            Select a date range and what to include — your CSV files will download instantly.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 pt-2">
                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> From
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    max={endDate}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> To
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>

                        {/* Quick presets */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: "This Month", fn: () => { const d = defaultDates(); setStartDate(d.start); setEndDate(d.end); } },
                                {
                                    label: "Last Month", fn: () => {
                                        const now = new Date();
                                        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                        const e = new Date(now.getFullYear(), now.getMonth(), 0);
                                        setStartDate(s.toISOString().split("T")[0]);
                                        setEndDate(e.toISOString().split("T")[0]);
                                    }
                                },
                                {
                                    label: "Last 3 Months", fn: () => {
                                        const now = new Date();
                                        const s = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                                        setStartDate(s.toISOString().split("T")[0]);
                                        setEndDate(new Date().toISOString().split("T")[0]);
                                    }
                                },
                                {
                                    label: "This Year", fn: () => {
                                        const y = new Date().getFullYear();
                                        setStartDate(`${y}-01-01`);
                                        setEndDate(`${y}-12-31`);
                                    }
                                },
                            ].map(({ label, fn }) => (
                                <button key={label} onClick={fn} className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted transition-colors">
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Export Type */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">What to export</label>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { value: "all", label: "Everything", desc: "Summary + Transactions + Invoices" },
                                    { value: "summary", label: "Summary Only", desc: "Key metrics overview" },
                                    { value: "transactions", label: "Transactions", desc: "All income & expense rows" },
                                    { value: "invoices", label: "Invoices", desc: "All invoice records" },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setExportType(opt.value)}
                                        className={`text-left rounded-lg border p-3 transition-colors ${exportType === opt.value
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:bg-muted"
                                            }`}
                                    >
                                        <p className="text-sm font-medium">{opt.label}</p>
                                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {exporting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Fetching data...</>
                            ) : (
                                <><Download className="h-4 w-4" /> Download CSV</>
                            )}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
