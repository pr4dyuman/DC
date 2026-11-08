"use client";

import {
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    CheckCircle2,
    ExternalLink,
    Loader2,
    Plus,
    Save,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { saveCaseStudy, type CaseStudyForEdit } from "@/lib/actions/super-admin-case-studies";
import {
    PORTFOLIO_SERVICES,
    PROOF_TYPE_FOR_SERVICE,
    type PortfolioCaseStudy,
    type PortfolioInsight,
    type PortfolioServiceId,
} from "@/lib/marketing-portfolio";
import {
    ADDABLE_INSIGHT_TYPES,
    createInsight,
    createProof,
    getInsightFields,
    HEADLINE_FIELD,
    INSIGHT_LABELS,
    KPIS_FIELD,
    LIVE_FIELD,
    PROOF_FIELDS,
    PROOF_LABELS,
    SCOPE_FIELD,
    STORY_FIELD,
    TESTIMONIAL_FIELD,
    tidyCaseStudy,
} from "@/lib/marketing-portfolio-editor";
import { validateCaseStudy, type CaseStudyStatus } from "@/lib/marketing-portfolio-validation";
import { cn } from "@/lib/utils";

import { countErrors, describeError, Field, FieldList, toErrorMap } from "./FieldEditor";

type Draft = PortfolioCaseStudy & Record<string, unknown>;

const STATUS_OPTIONS: Array<{ value: CaseStudyStatus; label: string; description: string }> = [
    { value: "draft", label: "Draft", description: "Only on the preview, marked Draft. Use it while you fill in real numbers." },
    { value: "sample", label: "Sample", description: "An example layout, marked Sample. Never shown on the public site." },
    { value: "published", label: "Published", description: "On the portfolio, its own page and the matching service pages." },
];

const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function serviceLabel(id: string) {
    return PORTFOLIO_SERVICES.find((service) => service.id === id)?.label || id;
}

function Section({ id, title, description, errorCount = 0, children }: { id: string; title: string; description?: ReactNode; errorCount?: number; children: ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
                </div>
                {errorCount ? (
                    <Badge variant="destructive">
                        {errorCount} to fix
                    </Badge>
                ) : null}
            </div>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

export default function CaseStudyEditor({ initial }: { initial: CaseStudyForEdit }) {
    const router = useRouter();
    const [study, setStudy] = useState<Draft>(initial.caseStudy as Draft);
    const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial.caseStudy));
    const [savedSlug, setSavedSlug] = useState(initial.caseStudy.slug);
    const [savedStatus, setSavedStatus] = useState<CaseStudyStatus>(initial.caseStudy.status);
    const [saving, setSaving] = useState(false);
    const [serverErrors, setServerErrors] = useState<string[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [newInsightType, setNewInsightType] = useState<PortfolioInsight["type"]>(ADDABLE_INSIGHT_TYPES[0]);
    const [jsonDraft, setJsonDraft] = useState("");
    const [jsonProblem, setJsonProblem] = useState("");

    const check = useMemo(() => validateCaseStudy(tidyCaseStudy(study)), [study]);
    const liveErrors = useMemo(() => (check.ok ? [] : check.errors), [check]);
    const errors = useMemo(() => toErrorMap([...liveErrors, ...serverErrors]), [liveErrors, serverErrors]);
    const dirty = JSON.stringify(study) !== savedJson;
    const services = Array.isArray(study.services) ? study.services : [];
    const mainService = services[0];
    const proofType = study.proof?.type;
    const insights = Array.isArray(study.insights) ? study.insights : [];
    const servicePages = [
        ...new Map(
            PORTFOLIO_SERVICES.filter((service) => services.includes(service.id) && service.href).map((service) => [service.href, service]),
        ).values(),
    ];

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    function update(patch: Record<string, unknown>) {
        setServerErrors([]);
        setStudy((current) => {
            const next = { ...current, ...patch } as Draft;
            for (const [key, value] of Object.entries(patch)) {
                if (value === undefined) delete next[key];
            }
            return next;
        });
    }

    function setField(key: string, value: unknown) {
        update({ [key]: value });
    }

    function changeMainService(id: PortfolioServiceId) {
        if (id === mainService) return;
        const others = [mainService, ...services.slice(1)].filter((other): other is PortfolioServiceId => Boolean(other) && other !== id).slice(0, 3);
        const nextType = PROOF_TYPE_FOR_SERVICE[id];
        const patch: Record<string, unknown> = { services: [id, ...others] };
        if (proofType !== nextType) {
            const ok = window.confirm(
                `${serviceLabel(id)} case studies show "${PROOF_LABELS[nextType]}". Switching replaces the current proof with an example to edit. Continue?`,
            );
            if (!ok) return;
            patch.proof = createProof(nextType);
        }
        update(patch);
    }

    function toggleService(id: PortfolioServiceId, on: boolean) {
        const others = services.slice(1).filter((other) => other !== id);
        update({ services: [mainService, ...(on ? [...others, id] : others)].filter(Boolean) });
    }

    function setInsights(next: PortfolioInsight[]) {
        update({ insights: next.length ? next : undefined });
    }

    async function save(confirmPublish = false) {
        if (!check.ok) {
            toast.error(`Fix ${liveErrors.length === 1 ? "1 thing" : `${liveErrors.length} things`} before saving.`);
            document.getElementById("problems")?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        if (study.status === "published" && savedStatus !== "published" && !confirmPublish) {
            setConfirmed(false);
            setConfirmOpen(true);
            return;
        }

        setSaving(true);
        const snapshot = study;
        try {
            const result = await saveCaseStudy({ id: initial.id, caseStudy: snapshot, confirmPublish });
            if (!result.ok) {
                if (result.needsConfirmation) {
                    setConfirmed(false);
                    setConfirmOpen(true);
                } else {
                    setServerErrors(result.errors);
                    toast.error(describeError(result.errors[0] || "Could not save."));
                }
                return;
            }
            setSavedJson(JSON.stringify(snapshot));
            setSavedSlug(result.slug);
            setSavedStatus(result.status);
            setConfirmOpen(false);
            toast.success(result.status === "published" ? "Saved. The live pages are updated." : "Saved.");
            router.refresh();
        } catch {
            toast.error("Could not save. Check your connection and try again.");
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                document.getElementById("case-study-save")?.click();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    function applyJson() {
        try {
            const parsed = JSON.parse(jsonDraft) as Draft;
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The JSON must be one object.");
            setJsonProblem("");
            setServerErrors([]);
            setStudy(parsed);
            toast.success("Applied. Check the form, then save.");
        } catch (error) {
            setJsonProblem(error instanceof Error ? error.message : "The JSON could not be read.");
        }
    }

    const previewHref = `/portfolio/preview/${savedSlug}`;
    const liveHref = study.story ? `/portfolio/${savedSlug}` : "/portfolio";

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                    <Link href="/super-admin/case-studies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        All case studies
                    </Link>
                    <h1 className="truncate text-3xl font-bold text-foreground">{study.client || "Untitled case study"}</h1>
                    <p className="text-sm text-muted-foreground">
                        {serviceLabel(mainService)} · {PROOF_LABELS[proofType] || "Unknown proof"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <a
                        href={previewHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Preview
                    </a>
                    <Button id="case-study-save" onClick={() => save()} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {study.status === "published" && savedStatus !== "published" ? "Publish" : "Save"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 space-y-6">
                    <Section id="basics" title="Basics" errorCount={["client", "industry", "location", "period", "slug", "summary", "services", "featured"].reduce((sum, key) => sum + countErrors(errors, key), 0)}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field field={{ kind: "text", key: "client", label: "Client" }} value={study.client} onChange={(value) => setField("client", value)} path="client" errors={errors} />
                            <Field field={{ kind: "text", key: "industry", label: "Industry", placeholder: "Restaurant" }} value={study.industry} onChange={(value) => setField("industry", value)} path="industry" errors={errors} />
                            <Field field={{ kind: "text", key: "location", label: "Location", optional: true, placeholder: "Jaipur" }} value={study.location} onChange={(value) => setField("location", value)} path="location" errors={errors} />
                            <Field field={{ kind: "text", key: "period", label: "When", optional: true, placeholder: "Jan–Dec 2026" }} value={study.period} onChange={(value) => setField("period", value)} path="period" errors={errors} />
                            <Field
                                field={{ kind: "text", key: "summary", label: "Summary", multiline: true, help: "One or two sentences: what changed for the client. Shows on cards and the service page." }}
                                value={study.summary}
                                onChange={(value) => setField("summary", value)}
                                path="summary"
                                errors={errors}
                            />
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="case-study-slug">Address</Label>
                                <div className="flex items-center overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                    <span className="border-r bg-muted px-3 py-2 text-sm text-muted-foreground">/portfolio/</span>
                                    <input
                                        id="case-study-slug"
                                        value={study.slug || ""}
                                        onChange={(event) => setField("slug", event.target.value.toLowerCase().replace(/\s+/g, "-"))}
                                        className="h-10 min-w-0 flex-1 bg-background px-3 text-sm outline-none"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Lowercase words joined by hyphens. Changing it after publishing breaks links to the old address.
                                </p>
                                {(errors.get("slug") || []).map((message, index) => (
                                    <p key={index} className="text-xs font-medium text-destructive">
                                        {message}
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="case-study-main-service">Main service</Label>
                                <select
                                    id="case-study-main-service"
                                    className={selectClass}
                                    value={mainService || ""}
                                    onChange={(event) => changeMainService(event.target.value as PortfolioServiceId)}
                                >
                                    {PORTFOLIO_SERVICES.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground">Sets the filter, the label and which proof is drawn.</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Also involved</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {PORTFOLIO_SERVICES.filter((service) => service.id !== mainService).map((service) => {
                                        const on = services.includes(service.id);
                                        return (
                                            <div key={service.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`service-${service.id}`}
                                                    checked={on}
                                                    disabled={!on && services.length >= 4}
                                                    onCheckedChange={(checked) => toggleService(service.id, checked === true)}
                                                />
                                                <Label htmlFor={`service-${service.id}`} className="text-sm font-normal">
                                                    {service.label}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-muted-foreground">Up to three. It also shows on those services&apos; pages.</p>
                            </div>
                            <div className="flex items-start gap-3 sm:col-span-2">
                                <Switch id="case-study-featured" checked={study.featured === true} onCheckedChange={(checked) => setField("featured", checked ? true : undefined)} className="mt-0.5" />
                                <div>
                                    <Label htmlFor="case-study-featured">Featured</Label>
                                    <p className="text-xs text-muted-foreground">Spans the full width of the portfolio grid.</p>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section
                        id="numbers"
                        title="Headline and numbers"
                        description="Real figures from the client's own accounts. Put the source in the story."
                        errorCount={["headline", "kpis", "scope"].reduce((sum, key) => sum + countErrors(errors, key), 0)}
                    >
                        <FieldList fields={[HEADLINE_FIELD, KPIS_FIELD, SCOPE_FIELD]} value={study} onChange={(next) => update({ headline: next.headline, kpis: next.kpis, scope: next.scope })} path="" errors={errors} />
                    </Section>

                    <Section
                        id="proof"
                        title={`Proof: ${PROOF_LABELS[proofType] || "unknown"}`}
                        description="The main visual on the card, the case study page and the service page. It follows the main service."
                        errorCount={countErrors(errors, "proof")}
                    >
                        {proofType && PROOF_FIELDS[proofType] ? (
                            <FieldList
                                fields={PROOF_FIELDS[proofType]}
                                value={study.proof}
                                onChange={(next) => setField("proof", { ...next, type: proofType })}
                                path="proof"
                                errors={errors}
                            />
                        ) : (
                            <p className="text-sm text-destructive">This proof type is not known. Pick the main service again to start a new proof.</p>
                        )}
                    </Section>

                    <Section
                        id="visuals"
                        title="Extra visuals"
                        description="Charts and screens under the proof on the case study page. The first two also show on the service page."
                        errorCount={countErrors(errors, "insights")}
                    >
                        <div className="space-y-3">
                            {insights.map((insight, index) => {
                                const label = INSIGHT_LABELS[insight.type];
                                const problems = countErrors(errors, `insights[${index}]`);
                                return (
                                    <details key={index} className="group rounded-lg border" open={problems > 0 || undefined}>
                                        <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                                            <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                                            <Badge variant="secondary" className="shrink-0">
                                                {label?.name || insight.type}
                                            </Badge>
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{insight.title}</span>
                                            {problems ? <Badge variant="destructive">{problems}</Badge> : null}
                                            {index < 2 ? <Badge variant="outline" className="hidden sm:inline-flex">On service page</Badge> : null}
                                            <span className="flex shrink-0 items-center gap-0.5">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    disabled={index === 0}
                                                    title="Move up"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        const next = [...insights];
                                                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                                        setInsights(next);
                                                    }}
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                    <span className="sr-only">Move up</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    disabled={index === insights.length - 1}
                                                    title="Move down"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        const next = [...insights];
                                                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                                        setInsights(next);
                                                    }}
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                    <span className="sr-only">Move down</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    title="Remove"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        if (window.confirm(`Remove "${insight.title}"?`)) setInsights(insights.filter((_, at) => at !== index));
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Remove</span>
                                                </Button>
                                            </span>
                                        </summary>
                                        <div className="space-y-4 border-t p-4">
                                            {label ? <p className="text-sm text-muted-foreground">{label.description}</p> : null}
                                            <FieldList
                                                fields={getInsightFields(insight.type)}
                                                value={insight}
                                                onChange={(next) => setInsights(insights.map((entry, at) => (at === index ? ({ ...next, type: insight.type } as PortfolioInsight) : entry)))}
                                                path={`insights[${index}]`}
                                                errors={errors}
                                            />
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                        <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Label htmlFor="new-insight-type">Add a visual</Label>
                                <select
                                    id="new-insight-type"
                                    className={selectClass}
                                    value={newInsightType}
                                    onChange={(event) => setNewInsightType(event.target.value as PortfolioInsight["type"])}
                                >
                                    {ADDABLE_INSIGHT_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {INSIGHT_LABELS[type].name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground">{INSIGHT_LABELS[newInsightType].description} It starts with example numbers to replace.</p>
                            </div>
                            <Button type="button" variant="outline" className="gap-1.5" disabled={insights.length >= 12} onClick={() => setInsights([...insights, createInsight(newInsightType)])}>
                                <Plus className="h-4 w-4" />
                                Add
                            </Button>
                        </div>
                    </Section>

                    <Section id="story" title="Story and quote" errorCount={["story", "testimonial", "live"].reduce((sum, key) => sum + countErrors(errors, key), 0)}>
                        <FieldList
                            fields={[STORY_FIELD, TESTIMONIAL_FIELD, LIVE_FIELD]}
                            value={study}
                            onChange={(next) => update({ story: next.story, testimonial: next.testimonial, live: next.live })}
                            path=""
                            errors={errors}
                        />
                    </Section>

                    <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
                        <details
                            onToggle={(event) => {
                                if ((event.currentTarget as HTMLDetailsElement).open) {
                                    setJsonDraft(JSON.stringify(study, null, 2));
                                    setJsonProblem("");
                                }
                            }}
                        >
                            <summary className="cursor-pointer text-lg font-semibold">Advanced: edit as JSON</summary>
                            <div className="mt-4 space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    The whole case study as data, for copying between case studies or pasting many numbers at once. Apply, check the form, then save.
                                </p>
                                <Textarea value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} rows={18} className="font-mono text-xs" spellCheck={false} />
                                {jsonProblem ? <p className="text-sm font-medium text-destructive">{jsonProblem}</p> : null}
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={applyJson}>
                                        Apply JSON
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => setJsonDraft(JSON.stringify(study, null, 2))}>
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </details>
                    </section>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
                        <div className="space-y-1.5">
                            <Label htmlFor="case-study-status">Status</Label>
                            <select
                                id="case-study-status"
                                className={selectClass}
                                value={study.status}
                                onChange={(event) => setField("status", event.target.value as CaseStudyStatus)}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">{STATUS_OPTIONS.find((option) => option.value === study.status)?.description}</p>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className={cn("font-medium", dirty ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                                {dirty ? "Unsaved changes" : "All changes saved"}
                            </span>
                            <span className="text-muted-foreground">Ctrl/⌘ + S saves</span>
                        </div>

                        <Button onClick={() => save()} disabled={saving} className="w-full gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {study.status === "published" && savedStatus !== "published" ? "Publish" : "Save"}
                        </Button>

                        <div className="space-y-2 border-t pt-4 text-sm">
                            <a href={previewHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                <ExternalLink className="h-4 w-4" />
                                Open the preview
                            </a>
                            {savedStatus === "published" ? (
                                <a href={liveHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                    <ExternalLink className="h-4 w-4" />
                                    Open the live page
                                </a>
                            ) : null}
                            {dirty ? <p className="text-xs text-muted-foreground">Pages show the last saved version. Save to see your changes.</p> : null}
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <p className="text-sm font-medium">Where it shows when published</p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                                <li>/portfolio, as a {study.featured ? "featured " : ""}card</li>
                                <li>{study.story ? `/portfolio/${study.slug}, its own page` : "No page of its own yet (add a story)"}</li>
                                {servicePages.map((service) => (
                                    <li key={service.href}>{service.href}, in &ldquo;From the portfolio&rdquo;</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div id="problems" className="scroll-mt-24 rounded-lg border bg-card p-4 shadow-sm">
                        {liveErrors.length || serverErrors.length ? (
                            <div className="space-y-2">
                                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    {liveErrors.length + serverErrors.length} to fix before saving
                                </p>
                                <ul className="max-h-80 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                                    {[...serverErrors, ...liveErrors].map((error, index) => (
                                        <li key={index}>{describeError(error)}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                                Everything checks out
                            </p>
                        )}
                    </div>

                    {initial.confirmation && savedStatus === "published" ? (
                        <p className="px-1 text-xs text-muted-foreground">
                            Publishing confirmed{initial.confirmation.confirmedAt ? ` on ${new Date(initial.confirmation.confirmedAt).toLocaleDateString()}` : ""}.
                        </p>
                    ) : null}
                </aside>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Publish {study.client}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            It will appear on the portfolio{study.story ? ", on its own page" : ""}
                            {servicePages.length ? ` and on ${servicePages.map((service) => service.href).join(", ")}` : ""}. Only publish real results.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3">
                        <Checkbox id="confirm-real" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} className="mt-0.5" />
                        <Label htmlFor="confirm-real" className="text-sm font-normal leading-5">
                            The numbers, images and quotes are real, from the client&apos;s own accounts, and the client has agreed to us showing them.
                        </Label>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                        <Button onClick={() => save(true)} disabled={!confirmed || saving} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Publish
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
