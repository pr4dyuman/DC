import { getAllAgenciesWithStats } from "@/lib/actions/super-admin";
import { fmtDate, fmtTime } from "@/lib/date-utils";
import { FileText, Building2, Users, CheckCircle, XCircle, Clock } from "lucide-react";

export default async function SystemLogsPage() {
    const agencies = await getAllAgenciesWithStats();

    // Generate log entries from agency data
    const logs = agencies
        .map((agency: any) => [
            {
                id: `${agency.id}-created`,
                type: "agency",
                event: "Agency Created",
                detail: `${agency.name} (${agency.plan.toUpperCase()}) was registered`,
                status: "success",
                timestamp: agency.createdAt,
            },
            agency.status === "suspended" && agency.suspendedAt
                ? {
                    id: `${agency.id}-suspended`,
                    type: "agency",
                    event: "Agency Suspended",
                    detail: `${agency.name} was suspended${agency.suspensionReason ? `: ${agency.suspensionReason}` : ""}`,
                    status: "error",
                    timestamp: agency.suspendedAt,
                }
                : null,
        ])
        .flat()
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

    const totalActive = agencies.filter((a: any) => a.status === "active").length;
    const totalSuspended = agencies.filter((a: any) => a.status === "suspended").length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
                <p className="text-muted-foreground mt-1">Monitor system events and agency activity</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Agencies</p>
                            <p className="text-3xl font-bold text-foreground mt-2">{agencies.length}</p>
                        </div>
                        <Building2 className="w-10 h-10 text-blue-500" />
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Active</p>
                            <p className="text-3xl font-bold text-green-500 mt-2">{totalActive}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Suspended</p>
                            <p className="text-3xl font-bold text-red-500 mt-2">{totalSuspended}</p>
                        </div>
                        <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Event Log */}
            <div className="bg-card rounded-lg shadow border border-border">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-bold text-foreground">Event Log</h2>
                    <span className="ml-auto text-xs text-muted-foreground">Showing last {logs.length} events</span>
                </div>

                {logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No events recorded yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {logs.map((log: any) => (
                            <div key={log.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-muted/40 transition-colors">
                                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${log.status === "success"
                                        ? "bg-green-500/10"
                                        : log.status === "error"
                                            ? "bg-red-500/10"
                                            : "bg-blue-500/10"
                                    }`}>
                                    {log.status === "success" ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : log.status === "error" ? (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <Clock className="w-4 h-4 text-blue-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-foreground text-sm">{log.event}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.type === "agency"
                                                ? "bg-blue-500/10 text-blue-500"
                                                : "bg-purple-500/10 text-purple-500"
                                            }`}>
                                            {log.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{log.detail}</p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs text-muted-foreground">
                                        {fmtDate(log.timestamp, 'UTC', 'en-US')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {fmtTime(log.timestamp, 'UTC')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
