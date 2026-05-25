import Link from "next/link";
import type { ElementType } from "react";
import { Mail, MailWarning, Search, Inbox, CheckCircle2 } from "lucide-react";
import {
    getContactSubmissions,
    getContactSubmissionStats,
    markContactSubmissionRead,
    type ContactEmailStatus,
} from "@/lib/actions/super-admin-contact-submissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { fmtDate } from "@/lib/date-utils";

type ContactSubmissionSearchParams = {
    page?: string;
    search?: string;
    status?: "all" | "unread" | "email_failed";
};

type ContactSubmissionsPageProps = {
    searchParams?: Promise<ContactSubmissionSearchParams> | ContactSubmissionSearchParams;
};

const PAGE_SIZE = 25;

function getParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value || "";
}

function getStatusBadge(status: ContactEmailStatus) {
    if (status === "sent") {
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10">Sent</Badge>;
    }

    if (status === "failed") {
        return <Badge variant="destructive">Failed</Badge>;
    }

    if (status === "skipped") {
        return <Badge variant="secondary">Skipped</Badge>;
    }

    return <Badge variant="outline">Pending</Badge>;
}

function buildHref(page: number, search: string, status: string) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    const query = params.toString();
    return `/super-admin/contact-submissions${query ? `?${query}` : ""}`;
}

const outlineButtonClass =
    "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function statCard(label: string, value: number, icon: ElementType, tone: string) {
    const Icon = icon;
    return (
        <div className="bg-card border border-border rounded-lg shadow p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
                </div>
                <div className={`${tone} p-3 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );
}

export default async function ContactSubmissionsPage({ searchParams }: ContactSubmissionsPageProps) {
    const params = await searchParams;
    const page = Math.max(1, Number(getParam(params?.page)) || 1);
    const search = getParam(params?.search).trim();
    const statusParam = getParam(params?.status);
    const status = statusParam === "unread" || statusParam === "email_failed" ? statusParam : "all";

    const [stats, result] = await Promise.all([
        getContactSubmissionStats(),
        getContactSubmissions({ page, pageSize: PAGE_SIZE, search, status }),
    ]);

    async function markRead(formData: FormData) {
        "use server";

        const id = String(formData.get("id") || "");
        if (id) {
            await markContactSubmissionRead(id);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Contact Submissions</h1>
                <p className="text-muted-foreground mt-1">
                    Saved contact form messages, independent of external email delivery.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCard("Total Submissions", stats.total, Inbox, "bg-blue-500")}
                {statCard("Unread", stats.unread, Mail, "bg-amber-500")}
                {statCard("Email Failures", stats.emailFailures, MailWarning, "bg-red-500")}
            </div>

            <form className="bg-card border border-border rounded-lg p-4" action="/super-admin/contact-submissions">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                            name="search"
                            defaultValue={search}
                            placeholder="Search name, email, phone, company, message..."
                            className="pl-10"
                        />
                    </div>
                    <select
                        name="status"
                        defaultValue={status}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    >
                        <option value="all">All submissions</option>
                        <option value="unread">Unread only</option>
                        <option value="email_failed">Email failures</option>
                    </select>
                    <div className="flex gap-2">
                        <Button type="submit">Filter</Button>
                        {(search || status !== "all") && (
                            <Link className={outlineButtonClass} href="/super-admin/contact-submissions">
                                Clear
                            </Link>
                        )}
                    </div>
                </div>
            </form>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
                {result.submissions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No contact submissions found.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Contact</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>User Email</TableHead>
                                <TableHead>Admin Email</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.submissions.map((submission) => (
                                <TableRow key={submission.id} className={!submission.readAt ? "bg-amber-500/5" : undefined}>
                                    <TableCell className="min-w-64">
                                        <div className="font-medium text-foreground">{submission.fullName}</div>
                                        <a className="text-sm text-primary hover:underline" href={`mailto:${submission.email}`}>
                                            {submission.email}
                                        </a>
                                        <div className="text-sm text-muted-foreground">{submission.phone}</div>
                                    </TableCell>
                                    <TableCell className="max-w-44 text-sm text-muted-foreground">
                                        {submission.companyName || "No company"}
                                    </TableCell>
                                    <TableCell className="min-w-[420px] max-w-2xl">
                                        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-sm leading-6 text-foreground">
                                            {submission.message}
                                            {submission.emailError && (
                                                <div className="mt-3 border-t border-border pt-3 text-xs leading-5 text-destructive">
                                                    Email error: {submission.emailError}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(submission.userEmailStatus)}</TableCell>
                                    <TableCell>{getStatusBadge(submission.adminEmailStatus)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                        {submission.createdAt ? fmtDate(submission.createdAt, "UTC", "en-US") : "Unknown"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {submission.readAt ? (
                                            <Badge variant="outline" className="gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Read
                                            </Badge>
                                        ) : (
                                            <form action={markRead}>
                                                <input type="hidden" name="id" value={submission.id} />
                                                <Button size="sm" variant="outline" type="submit">
                                                    Mark read
                                                </Button>
                                            </form>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {result.totalPages > 1 && (
                    <div className="border-t border-border p-4 flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            Page {result.page} of {result.totalPages} ({result.total} submissions)
                        </p>
                        <div className="flex gap-2">
                            {result.page > 1 ? (
                                <Link className={outlineButtonClass} href={buildHref(result.page - 1, search, status)}>
                                    Previous
                                </Link>
                            ) : (
                                <span className={`${outlineButtonClass} pointer-events-none opacity-50`}>Previous</span>
                            )}
                            {result.page < result.totalPages ? (
                                <Link className={outlineButtonClass} href={buildHref(result.page + 1, search, status)}>
                                    Next
                                </Link>
                            ) : (
                                <span className={`${outlineButtonClass} pointer-events-none opacity-50`}>Next</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
