"use client";

import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Copy,
    Database,
    Edit2,
    ExternalLink,
    Eye,
    Loader2,
    MoreHorizontal,
    Plus,
    RotateCcw,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    createCaseStudy,
    deleteCaseStudy,
    duplicateCaseStudy,
    reorderCaseStudies,
    restoreExampleCaseStudies,
    setUpCaseStudies,
    type CaseStudyList as CaseStudyListData,
    type CaseStudyListItem,
} from "@/lib/actions/super-admin-case-studies";
import { PORTFOLIO_SERVICES, PROOF_TYPE_FOR_SERVICE } from "@/lib/marketing-portfolio";
import { PROOF_LABELS } from "@/lib/marketing-portfolio-editor";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    published: { label: "Published", className: "border-transparent bg-emerald-600 text-white hover:bg-emerald-600" },
    draft: { label: "Draft", className: "" },
    sample: { label: "Sample", className: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

function serviceLabel(id: string) {
    return PORTFOLIO_SERVICES.find((service) => service.id === id)?.label || id;
}

function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
    const badge = STATUS_BADGE[status] || STATUS_BADGE.draft;
    return (
        <Badge variant="outline" className={badge.className}>
            {badge.label}
        </Badge>
    );
}

function NewCaseStudyMenu({ disabled, onCreate }: { disabled: boolean; onCreate: (service: string) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="gap-2" disabled={disabled}>
                    {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    New case study
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Main service</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PORTFOLIO_SERVICES.map((service) => (
                    <DropdownMenuItem key={service.id} onSelect={() => onCreate(service.id)} className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{service.label}</span>
                        <span className="text-xs text-muted-foreground">{PROOF_LABELS[PROOF_TYPE_FOR_SERVICE[service.id]]}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function CaseStudyList({ initial }: { initial: CaseStudyListData }) {
    const router = useRouter();
    const [items, setItems] = useState<CaseStudyListItem[]>(initial.items);
    const [seen, setSeen] = useState(initial.items);
    const [busy, setBusy] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CaseStudyListItem | null>(null);

    if (seen !== initial.items) {
        setSeen(initial.items);
        setItems(initial.items);
    }

    const published = items.filter((item) => item.status === "published").length;

    async function run<T extends { ok: boolean }>(key: string, action: () => Promise<T>, success?: string) {
        setBusy(key);
        try {
            const result = await action();
            if (!result.ok) {
                toast.error(("errors" in result && Array.isArray(result.errors) && result.errors[0]) || "Something went wrong.");
                return null;
            }
            if (success) toast.success(success);
            return result;
        } catch {
            toast.error("Something went wrong. Check your connection and try again.");
            return null;
        } finally {
            setBusy(null);
        }
    }

    async function handleCreate(service: string) {
        const result = await run("create", () => createCaseStudy(service));
        if (result && "id" in result) router.push(`/super-admin/case-studies/${result.id}`);
    }

    async function handleDuplicate(item: CaseStudyListItem) {
        const result = await run(`copy-${item.id}`, () => duplicateCaseStudy(item.id), `Copied ${item.client} as a draft.`);
        if (result && "id" in result) router.push(`/super-admin/case-studies/${result.id}`);
    }

    async function handleMove(index: number, to: number) {
        if (to < 0 || to >= items.length) return;
        const next = [...items];
        const [item] = next.splice(index, 1);
        next.splice(to, 0, item);
        setItems(next);
        const result = await run("order", () => reorderCaseStudies(next.map((entry) => entry.id)));
        if (!result) setItems(items);
        else router.refresh();
    }

    async function handleDelete(item: CaseStudyListItem) {
        const result = await run(`delete-${item.id}`, () => deleteCaseStudy(item.id), `Deleted ${item.client}.`);
        if (result) {
            setItems((current) => current.filter((entry) => entry.id !== item.id));
            router.refresh();
        }
    }

    async function handleSetUp() {
        const result = await run("setup", () => setUpCaseStudies(), "Case studies are ready to edit.");
        if (result) router.refresh();
    }

    async function handleRestore() {
        const result = await run("restore", () => restoreExampleCaseStudies());
        if (result && "added" in result) {
            toast.success(result.added ? `Added back ${result.added} example${result.added === 1 ? "" : "s"}.` : "All the examples are already here.");
            router.refresh();
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold text-foreground">Case Studies</h1>
                    <p className="mt-1 text-muted-foreground">
                        The work on /portfolio, each case study&apos;s own page and the &ldquo;From the portfolio&rdquo; section of the service pages.
                        Only published case studies show on the public site.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="/portfolio/preview"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <Eye className="h-4 w-4" />
                        Open the preview
                    </a>
                    {initial.setUp ? <NewCaseStudyMenu disabled={busy === "create"} onCreate={handleCreate} /> : null}
                </div>
            </div>

            {initial.error ? (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p>{initial.error}</p>
                </div>
            ) : null}

            {!initial.setUp && !initial.error ? (
                <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <Database className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold">Set up case studies to edit them</h2>
                            <p className="text-sm text-muted-foreground">
                                The site is showing the {initial.builtIn.length} case studies built into its code. Setting up copies them here so you
                                can edit them, add your own and publish real results. Nothing changes on the site until you publish or edit.
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleSetUp} disabled={busy === "setup"} className="gap-2">
                        {busy === "setup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                        Set up case studies
                    </Button>
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Client</TableHead>
                                    <TableHead>Services</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Own page</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initial.builtIn.map((study) => (
                                    <TableRow key={study.slug}>
                                        <TableCell className="font-medium">{study.client}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{study.services.map(serviceLabel).join(", ")}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={study.status} />
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{study.hasPage ? "Yes" : "Card only"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : null}

            {initial.setUp ? (
                <>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-2xl font-bold tabular-nums">{published}</p>
                            <p className="text-sm text-muted-foreground">Published, on the public site</p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-2xl font-bold tabular-nums">{items.filter((item) => item.status === "draft").length}</p>
                            <p className="text-sm text-muted-foreground">Drafts, on the preview only</p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-2xl font-bold tabular-nums">{items.filter((item) => item.status === "sample").length}</p>
                            <p className="text-sm text-muted-foreground">Samples, examples on the preview only</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border bg-card">
                        {items.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No case studies yet. Create one with <span className="font-medium text-foreground">New case study</span>.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-20">Order</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Services</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-0.5">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === 0 || busy !== null} onClick={() => handleMove(index, index - 1)} title="Move up">
                                                        <ArrowUp className="h-4 w-4" />
                                                        <span className="sr-only">Move {item.client} up</span>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === items.length - 1 || busy !== null} onClick={() => handleMove(index, index + 1)} title="Move down">
                                                        <ArrowDown className="h-4 w-4" />
                                                        <span className="sr-only">Move {item.client} down</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-56">
                                                <Link href={`/super-admin/case-studies/${item.id}`} className="font-medium hover:underline">
                                                    {item.client}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    {[item.industry, `/${item.slug}`, item.hasPage ? "own page" : "card only"].filter(Boolean).join(" · ")}
                                                </p>
                                                {item.problems ? (
                                                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        {item.problems} to fix; hidden from the site until fixed
                                                    </p>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <span className="font-medium">{serviceLabel(item.services[0])}</span>
                                                {item.services.length > 1 ? (
                                                    <span className="text-muted-foreground"> + {item.services.slice(1).map(serviceLabel).join(", ")}</span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={item.status} />
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(item.updatedAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" title="Edit" onClick={() => router.push(`/super-admin/case-studies/${item.id}`)}>
                                                        <Edit2 className="h-4 w-4" />
                                                        <span className="sr-only">Edit {item.client}</span>
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" title="More" disabled={busy?.endsWith(item.id)}>
                                                                {busy?.endsWith(item.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                                <span className="sr-only">More for {item.client}</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => window.open(`/portfolio/preview/${item.slug}`, "_blank", "noopener")}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Preview
                                                            </DropdownMenuItem>
                                                            {item.status === "published" ? (
                                                                <DropdownMenuItem
                                                                    onSelect={() => window.open(item.hasPage ? `/portfolio/${item.slug}` : "/portfolio", "_blank", "noopener")}
                                                                >
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    View live
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                            <DropdownMenuItem onSelect={() => handleDuplicate(item)}>
                                                                <Copy className="mr-2 h-4 w-4" />
                                                                Duplicate as draft
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => setDeleteTarget(item)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground lg:flex-row lg:items-start lg:justify-between">
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Order here is the order on /portfolio and on service pages.</li>
                            <li>
                                Service pages show up to two published case studies with their charts, then website cards. A service with nothing
                                published shows no section.
                            </li>
                            <li>Samples and drafts only appear on the preview, which search engines do not index.</li>
                        </ul>
                        <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={handleRestore} disabled={busy === "restore"}>
                            {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            Add back deleted examples
                        </Button>
                    </div>
                </>
            ) : null}

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (open ? null : setDeleteTarget(null))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.client}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.status === "published"
                                ? "It comes off the portfolio, its own page and the service pages straight away. "
                                : ""}
                            This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (deleteTarget) handleDelete(deleteTarget);
                                setDeleteTarget(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
