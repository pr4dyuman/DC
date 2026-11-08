"use client";

import { AlertTriangle, ArrowDown, ArrowUp, ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IMAGE_HELP, type FieldSpec } from "@/lib/marketing-portfolio-editor";
import { cn } from "@/lib/utils";

import { readImageSize, uploadImage, uploadVideo } from "./media";

/**
 * Draws a case study form from field definitions
 * (lib/marketing-portfolio-editor.ts): text, numbers, choices, colours,
 * images with upload, lists and optional groups. Errors from
 * validateCaseStudy show under the field they belong to.
 */

type Obj = Record<string, unknown>;
export type ErrorMap = Map<string, string[]>;

const SAMPLE_IMAGE_PREFIX = "/portfolio/samples/";
const SIMPLE_KINDS = new Set(["text", "number", "select", "boolean", "color"]);
const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function isObj(value: unknown): value is Obj {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function joinPath(path: string, key: string) {
    return path ? `${path}.${key}` : key;
}

function capitalise(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Validator errors as a lookup by field path ("proof.points[2].value"). */
export function toErrorMap(errors: string[]): ErrorMap {
    const map: ErrorMap = new Map();
    for (const error of errors) {
        const split = error.indexOf(": ");
        const path = split === -1 ? "" : error.slice(0, split);
        const message = split === -1 ? error : error.slice(split + 2);
        map.set(path, [...(map.get(path) || []), message]);
    }
    return map;
}

/** How many errors sit at or under a path. */
export function countErrors(errors: ErrorMap, path: string) {
    let count = 0;
    for (const [key, messages] of errors) {
        if (key === path || key.startsWith(`${path}.`) || key.startsWith(`${path}[`)) count += messages.length;
    }
    return count;
}

/** A readable version of an error path: proof.points[2].value → Proof › points 3 › value. */
export function describeError(error: string) {
    const split = error.indexOf(": ");
    if (split === -1) return error;
    const path = error
        .slice(0, split)
        .split(".")
        .map((part) => part.replace(/\[(\d+)\]/g, (_, index) => ` ${Number(index) + 1}`))
        .join(" › ");
    return `${capitalise(path)}: ${error.slice(split + 2)}`;
}

/** A starting value for a new optional group or list item. */
export function defaultsFor(fields: FieldSpec[]): Obj {
    const value: Obj = {};
    for (const field of fields) {
        if (field.optional) continue;
        if (field.kind === "text" || field.kind === "color") value[field.key] = field.kind === "color" ? "#000000" : "";
        else if (field.kind === "list" || field.kind === "images" || field.kind === "texts" || field.kind === "csv") value[field.key] = [];
        else if (field.kind === "group") value[field.key] = defaultsFor(field.fields);
        else if (field.kind === "select") value[field.key] = field.options[0]?.value;
        else if (field.kind === "image") value[field.key] = { src: "", alt: "" };
    }
    return value;
}

function Messages({ messages }: { messages?: string[] }) {
    if (!messages?.length) return null;
    return (
        <div className="space-y-0.5">
            {messages.map((message, index) => (
                <p key={index} className="text-xs font-medium text-destructive">
                    {capitalise(message)}
                </p>
            ))}
        </div>
    );
}

function FieldLabel({ htmlFor, field, className }: { htmlFor?: string; field: FieldSpec; className?: string }) {
    return (
        <Label htmlFor={htmlFor} className={cn("text-sm", className)}>
            {field.label}
            {field.optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
        </Label>
    );
}

function Help({ children }: { children?: ReactNode }) {
    if (!children) return null;
    return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

/** Text input that keeps what is typed until it reads as a number. */
function NumberInput({
    id,
    value,
    onChange,
    disabled,
    invalid,
}: {
    id?: string;
    value: unknown;
    onChange: (next: number | undefined) => void;
    disabled?: boolean;
    invalid?: boolean;
}) {
    const shown = typeof value === "number" && Number.isFinite(value) ? String(value) : "";
    const [draft, setDraft] = useState(shown);
    const [seen, setSeen] = useState(value);
    if (seen !== value) {
        setSeen(value);
        const parsed = Number(draft.replace(/,/g, ""));
        if (draft.trim() === "" ? shown !== "" : parsed !== value) setDraft(shown);
    }

    return (
        <Input
            id={id}
            type="text"
            inputMode="decimal"
            value={draft}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(invalid && "border-destructive")}
            onChange={(event) => {
                const next = event.target.value;
                setDraft(next);
                const cleaned = next.replace(/,/g, "").trim();
                if (cleaned === "") onChange(undefined);
                else if (!Number.isNaN(Number(cleaned))) onChange(Number(cleaned));
            }}
            onBlur={() => setDraft(shown)}
        />
    );
}

/** One entry per line; blank lines are dropped. */
function LinesInput({ id, value, onChange, max, placeholder }: { id: string; value: unknown; onChange: (next: string[] | undefined) => void; max?: number; placeholder?: string }) {
    const lines = Array.isArray(value) ? value.map(String) : [];
    const joined = lines.join("\n");
    const [draft, setDraft] = useState(joined);
    const [seen, setSeen] = useState(joined);
    if (seen !== joined) {
        setSeen(joined);
        if (draft.split("\n").map((line) => line.trim()).filter(Boolean).join("\n") !== joined) setDraft(joined);
    }

    return (
        <Textarea
            id={id}
            rows={Math.min(Math.max(lines.length + 1, 3), 9)}
            value={draft}
            placeholder={placeholder ? `e.g. ${placeholder}` : undefined}
            onChange={(event) => {
                setDraft(event.target.value);
                const next = event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .slice(0, max ?? 60);
                onChange(next.length ? next : undefined);
            }}
        />
    );
}

/** Comma-separated values, blanks kept (chart labels can be blank). */
function CsvInput({ id, value, onChange, numeric }: { id: string; value: unknown; onChange: (next: unknown[]) => void; numeric?: boolean }) {
    const joined = Array.isArray(value) ? value.map((item) => (item === null || item === undefined ? "" : String(item))).join(", ") : "";
    const [draft, setDraft] = useState(joined);
    const [seen, setSeen] = useState(joined);
    const parse = (text: string) => {
        const parts = text.split(",").map((part) => part.trim());
        return numeric ? parts.filter((part) => part !== "").map((part) => Number(part)) : parts;
    };
    if (seen !== joined) {
        setSeen(joined);
        if (JSON.stringify(parse(draft)) !== JSON.stringify(value ?? [])) setDraft(joined);
    }

    return (
        <Input
            id={id}
            value={draft}
            onChange={(event) => {
                setDraft(event.target.value);
                onChange(parse(event.target.value));
            }}
        />
    );
}

function MoveButtons({
    index,
    count,
    onMove,
    onRemove,
    label,
}: {
    index: number;
    count: number;
    onMove: (from: number, to: number) => void;
    onRemove: (index: number) => void;
    label: string;
}) {
    return (
        <div className="flex shrink-0 items-center gap-0.5">
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === 0} onClick={() => onMove(index, index - 1)} title={`Move ${label} up`}>
                <ArrowUp className="h-4 w-4" />
                <span className="sr-only">Move {label} up</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} title={`Move ${label} down`}>
                <ArrowDown className="h-4 w-4" />
                <span className="sr-only">Move {label} down</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onRemove(index)} title={`Remove ${label}`}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove {label}</span>
            </Button>
        </div>
    );
}

function moveItem<T>(list: T[], from: number, to: number) {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

function ImageField({
    field,
    value,
    onChange,
    path,
    errors,
    extra = [],
    compact = false,
}: {
    field: FieldSpec;
    value: unknown;
    onChange: (next: unknown) => void;
    path: string;
    errors: ErrorMap;
    extra?: FieldSpec[];
    /** Inside an image list: the list shows the label and help once. */
    compact?: boolean;
}) {
    const id = useId();
    const fileRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [problem, setProblem] = useState("");
    const image = isObj(value) ? value : {};
    const src = typeof image.src === "string" ? image.src : "";
    const update = (patch: Obj) => onChange({ ...image, ...patch });

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setProblem("");
        setProgress(0);
        try {
            const url = await uploadImage(file, setProgress);
            const size = await readImageSize(url);
            update({ src: url, ...(size || {}) });
        } catch (error) {
            setProblem(error instanceof Error ? error.message : "The image could not be uploaded.");
        } finally {
            setProgress(null);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    async function detectSize() {
        if (!src) return;
        const size = await readImageSize(src);
        if (size && (size.width !== image.width || size.height !== image.height)) update(size);
    }

    return (
        <div className="space-y-2">
            <FieldLabel htmlFor={`${id}-src`} field={field} className={cn(compact && "sr-only")} />
            <div className="@container">
            <div className={cn("flex flex-col gap-3 @lg:flex-row", !compact && "rounded-lg border bg-muted/20 p-3")}>
                <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted @lg:w-44">
                    {src ? (
                        // Admin preview of any link, local or uploaded.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-full w-full object-contain" />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    )}
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                    <div className="col-span-2 flex gap-2">
                        <Input
                            id={`${id}-src`}
                            value={src}
                            placeholder="Upload, or paste /portfolio/… or https://…"
                            onChange={(event) => update({ src: event.target.value })}
                            onBlur={detectSize}
                            className={cn(errors.get(`${path}.src`) && "border-destructive")}
                        />
                        <Button type="button" variant="outline" className="shrink-0 gap-2" disabled={progress !== null} onClick={() => fileRef.current?.click()}>
                            {progress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {progress !== null ? `${progress}%` : "Upload"}
                        </Button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(event) => handleFile(event.target.files?.[0])}
                        />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                        <Label htmlFor={`${id}-alt`} className="text-xs text-muted-foreground">
                            Describe the image (for screen readers and search)
                        </Label>
                        <Input id={`${id}-alt`} value={typeof image.alt === "string" ? image.alt : ""} onChange={(event) => update({ alt: event.target.value })} />
                        <Messages messages={errors.get(`${path}.alt`)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor={`${id}-w`} className="text-xs text-muted-foreground">
                            Width (px)
                        </Label>
                        <NumberInput id={`${id}-w`} value={image.width} onChange={(next) => update({ width: next })} invalid={Boolean(errors.get(`${path}.width`))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor={`${id}-h`} className="text-xs text-muted-foreground">
                            Height (px)
                        </Label>
                        <NumberInput id={`${id}-h`} value={image.height} onChange={(next) => update({ height: next })} invalid={Boolean(errors.get(`${path}.height`))} />
                    </div>
                    {extra.length ? (
                        <div className="col-span-2">
                            <FieldList fields={extra} value={image} onChange={(next) => onChange(next)} path={path} errors={errors} />
                        </div>
                    ) : null}
                </div>
            </div>
            </div>
            {src.startsWith(SAMPLE_IMAGE_PREFIX) ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Sample image. Replace it with the client&apos;s own before publishing.
                </p>
            ) : null}
            {problem ? <p className="text-xs font-medium text-destructive">{problem}</p> : null}
            {compact ? null : <Help>{field.help || IMAGE_HELP}</Help>}
            <Messages messages={[...(errors.get(path) || []), ...(errors.get(`${path}.src`) || []), ...(errors.get(`${path}.width`) || []), ...(errors.get(`${path}.height`) || [])]} />
        </div>
    );
}

function VideoLinkField({ field, value, onChange, path, errors }: { field: FieldSpec; value: unknown; onChange: (next: unknown) => void; path: string; errors: ErrorMap }) {
    const id = useId();
    const fileRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [problem, setProblem] = useState("");
    const src = typeof value === "string" ? value : "";

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setProblem("");
        setProgress(0);
        try {
            onChange(await uploadVideo(file, setProgress));
        } catch (error) {
            setProblem(
                `${error instanceof Error ? error.message : "The video could not be uploaded."} You can also upload it elsewhere and paste its link.`,
            );
        } finally {
            setProgress(null);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    return (
        <div className="space-y-2">
            <FieldLabel htmlFor={id} field={field} />
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={src}
                    placeholder="Upload, or paste a link to an MP4 or WebM file"
                    onChange={(event) => onChange(event.target.value)}
                    className={cn(errors.get(path) && "border-destructive")}
                />
                <Button type="button" variant="outline" className="shrink-0 gap-2" disabled={progress !== null} onClick={() => fileRef.current?.click()}>
                    {progress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {progress !== null ? `${progress}%` : "Upload"}
                </Button>
                <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            </div>
            {src ? (
                <video src={src} className="max-h-48 rounded-md border bg-black" controls muted preload="metadata" />
            ) : null}
            {problem ? <p className="text-xs font-medium text-destructive">{problem}</p> : null}
            <Help>{field.help}</Help>
            <Messages messages={errors.get(path)} />
        </div>
    );
}

function ListField({ field, value, onChange, path, errors }: { field: Extract<FieldSpec, { kind: "list" }>; value: unknown; onChange: (next: unknown) => void; path: string; errors: ErrorMap }) {
    const items = Array.isArray(value) ? (value as Obj[]) : [];
    const full = field.max !== undefined && items.length >= field.max;
    const simple = field.item.every((item) => SIMPLE_KINDS.has(item.kind) && !(item.kind === "text" && item.multiline));
    const twoUp = simple && field.item.length <= 2;
    const set = (next: Obj[]) => onChange(next.length || !field.optional ? next : undefined);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <FieldLabel field={field} />
                <span className="text-xs text-muted-foreground">
                    {items.length}
                    {field.max ? ` of ${field.max}` : ""}
                </span>
            </div>
            <Help>{field.help}</Help>
            <div className="@container">
                <div className={cn("grid gap-2", twoUp && "@3xl:grid-cols-2")}>
                {items.map((item, index) => (
                    <div key={index} className={cn("min-w-0 rounded-lg border bg-muted/20", simple ? "flex items-start gap-2 p-2" : "p-3")}>
                        {simple ? (
                            <>
                                <span className="mt-2 w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <FieldList
                                        fields={field.item}
                                        value={item}
                                        onChange={(next) => set(items.map((entry, at) => (at === index ? next : entry)))}
                                        path={`${path}[${index}]`}
                                        errors={errors}
                                        dense
                                        firstRow={index < (twoUp ? 2 : 1)}
                                    />
                                </div>
                                <MoveButtons index={index} count={items.length} label={`${field.itemName} ${index + 1}`} onMove={(from, to) => set(moveItem(items, from, to))} onRemove={(at) => set(items.filter((_, i) => i !== at))} />
                            </>
                        ) : (
                            <>
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {capitalise(field.itemName)} {index + 1}
                                    </span>
                                    <MoveButtons index={index} count={items.length} label={`${field.itemName} ${index + 1}`} onMove={(from, to) => set(moveItem(items, from, to))} onRemove={(at) => set(items.filter((_, i) => i !== at))} />
                                </div>
                                <FieldList fields={field.item} value={item} onChange={(next) => set(items.map((entry, at) => (at === index ? next : entry)))} path={`${path}[${index}]`} errors={errors} />
                            </>
                        )}
                    </div>
                ))}
                </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={full} onClick={() => set([...items, field.newItem()])}>
                <Plus className="h-4 w-4" />
                Add {field.itemName}
            </Button>
            <Messages messages={errors.get(path)} />
        </div>
    );
}

function ImagesField({ field, value, onChange, path, errors }: { field: Extract<FieldSpec, { kind: "images" }>; value: unknown; onChange: (next: unknown) => void; path: string; errors: ErrorMap }) {
    const items = Array.isArray(value) ? (value as Obj[]) : [];
    const full = field.max !== undefined && items.length >= field.max;
    const set = (next: Obj[]) => onChange(next);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <FieldLabel field={field} />
                <span className="text-xs text-muted-foreground">
                    {items.length}
                    {field.max ? ` of ${field.max}` : ""}
                </span>
            </div>
            <Help>{[field.help, IMAGE_HELP].filter(Boolean).join(" ")}</Help>
            <div className="@container">
                <div className="grid gap-3 @3xl:grid-cols-2 @6xl:grid-cols-3">
                {items.map((item, index) => (
                    <div key={index} className="min-w-0 rounded-lg border bg-muted/20 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image {index + 1}</span>
                            <MoveButtons index={index} count={items.length} label={`image ${index + 1}`} onMove={(from, to) => set(moveItem(items, from, to))} onRemove={(at) => set(items.filter((_, i) => i !== at))} />
                        </div>
                        <ImageField
                            field={{ kind: "image", key: String(index), label: `${field.label.replace(/\s*\(.*\)$/, "")} ${index + 1}` }}
                            value={item}
                            onChange={(next) => set(items.map((entry, at) => (at === index ? (next as Obj) : entry)))}
                            path={`${path}[${index}]`}
                            errors={errors}
                            extra={field.extra}
                            compact
                        />
                    </div>
                ))}
                </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={full} onClick={() => set([...items, { src: "", alt: "" }])}>
                <Plus className="h-4 w-4" />
                Add image
            </Button>
            <Messages messages={errors.get(path)} />
        </div>
    );
}

function GroupField({ field, value, onChange, path, errors }: { field: Extract<FieldSpec, { kind: "group" }>; value: unknown; onChange: (next: unknown) => void; path: string; errors: ErrorMap }) {
    if (field.optional && !isObj(value)) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{field.label}</p>
                    <Help>{field.help}</Help>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onChange(defaultsFor(field.fields))}>
                    <Plus className="h-4 w-4" />
                    Add
                </Button>
            </div>
        );
    }

    return (
        <fieldset className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <legend className="text-sm font-medium">{field.label}</legend>
                    <Help>{field.help}</Help>
                </div>
                {field.optional ? (
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => onChange(undefined)}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                    </Button>
                ) : null}
            </div>
            <FieldList fields={field.fields} value={isObj(value) ? value : {}} onChange={onChange} path={path} errors={errors} />
            <Messages messages={errors.get(path)} />
        </fieldset>
    );
}

function isWide(field: FieldSpec) {
    return !SIMPLE_KINDS.has(field.kind) || (field.kind === "text" && field.multiline);
}

export function Field({
    field,
    value,
    onChange,
    path,
    errors,
    dense = false,
    first = true,
}: {
    field: FieldSpec;
    value: unknown;
    onChange: (next: unknown) => void;
    path: string;
    errors: ErrorMap;
    dense?: boolean;
    first?: boolean;
}) {
    const id = useId();
    const messages = errors.get(path);
    const invalid = Boolean(messages?.length);

    let complex: ReactNode = null;
    switch (field.kind) {
        case "group":
            complex = <GroupField field={field} value={value} onChange={onChange} path={path} errors={errors} />;
            break;
        case "list":
            complex = <ListField field={field} value={value} onChange={onChange} path={path} errors={errors} />;
            break;
        case "images":
            complex = <ImagesField field={field} value={value} onChange={onChange} path={path} errors={errors} />;
            break;
        case "image":
            complex = <ImageField field={field} value={value} onChange={onChange} path={path} errors={errors} extra={field.extra} />;
            break;
        case "text":
            if (field.key === "video") {
                complex = <VideoLinkField field={field} value={value} onChange={onChange} path={path} errors={errors} />;
            }
            break;
        default:
            break;
    }
    if (complex) {
        return <div className={cn("min-w-0", !dense && "sm:col-span-2")}>{complex}</div>;
    }

    let control: ReactNode;
    switch (field.kind) {
        case "text": {
            const text = typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);
            control = field.multiline ? (
                <Textarea id={id} rows={3} value={text} placeholder={field.placeholder ? `e.g. ${field.placeholder}` : undefined} aria-invalid={invalid || undefined} className={cn(invalid && "border-destructive")} onChange={(event) => onChange(event.target.value)} />
            ) : (
                <Input id={id} value={text} placeholder={field.placeholder ? `e.g. ${field.placeholder}` : undefined} aria-invalid={invalid || undefined} className={cn(invalid && "border-destructive")} onChange={(event) => onChange(event.target.value)} />
            );
            break;
        }
        case "number": {
            const offset = field.offset ?? 0;
            control = (
                <div className="space-y-1.5">
                    <NumberInput
                        id={id}
                        value={typeof value === "number" ? value + offset : value}
                        disabled={value === null}
                        invalid={invalid}
                        onChange={(next) => onChange(next === undefined ? undefined : next - offset)}
                    />
                    {field.nullable ? (
                        <div className="flex items-center gap-2">
                            <Checkbox id={`${id}-none`} checked={value === null} onCheckedChange={(checked) => onChange(checked === true ? null : undefined)} />
                            <Label htmlFor={`${id}-none`} className="text-xs font-normal text-muted-foreground">
                                {field.nullable}
                            </Label>
                        </div>
                    ) : null}
                </div>
            );
            break;
        }
        case "select":
            control = (
                <select id={id} className={selectClass} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)}>
                    {typeof value !== "string" || !field.options.some((option) => option.value === value) ? <option value="">Choose…</option> : null}
                    {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            );
            break;
        case "boolean":
            return (
                <div className={cn("flex items-start gap-3", !dense && "sm:col-span-2")}>
                    <Switch id={id} checked={value === true} onCheckedChange={(checked) => onChange(checked ? true : undefined)} className="mt-0.5" />
                    <div className="space-y-1">
                        <FieldLabel htmlFor={id} field={field} />
                        <Help>{field.help}</Help>
                    </div>
                </div>
            );
        case "color": {
            const hex = typeof value === "string" ? value : "";
            control = (
                <div className="flex gap-2">
                    <input
                        type="color"
                        aria-label={`${field.label} picker`}
                        value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000"}
                        onChange={(event) => onChange(event.target.value.toUpperCase())}
                        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
                    />
                    <Input id={id} value={hex} placeholder="#3B2A1E" aria-invalid={invalid || undefined} className={cn(invalid && "border-destructive")} onChange={(event) => onChange(event.target.value)} />
                </div>
            );
            break;
        }
        case "texts":
            control = <LinesInput id={id} value={value} max={field.max} placeholder={field.placeholder} onChange={(next) => onChange(next ?? (field.optional ? undefined : []))} />;
            break;
        case "csv":
            control = <CsvInput id={id} value={value} numeric={field.numeric} onChange={onChange} />;
            break;
        default:
            return null;
    }

    const helpText =
        field.kind === "texts"
            ? [field.help, `One per line${field.max ? `, up to ${field.max}` : ""}.`].filter(Boolean).join(" ")
            : field.help;
    const childMessages =
        field.kind === "texts" || field.kind === "csv"
            ? [...errors.entries()]
                  .filter(([key]) => key.startsWith(`${path}[`))
                  .flatMap(([key, list]) => {
                      const entry = Number(key.slice(path.length + 1, key.indexOf("]", path.length))) + 1;
                      return list.map((message) => `Entry ${entry}: ${message}`);
                  })
            : [];

    return (
        <div className={cn("min-w-0 space-y-1.5", isWide(field) && !dense && "sm:col-span-2")}>
            <FieldLabel htmlFor={id} field={field} className={cn(dense && !first && "sm:sr-only")} />
            {control}
            {dense ? null : <Help>{helpText}</Help>}
            <Messages messages={[...(messages || []), ...childMessages]} />
        </div>
    );
}

/** A set of fields for one object. Dense lays them out in one row, for list items. */
export function FieldList({
    fields,
    value,
    onChange,
    path,
    errors,
    dense = false,
    firstRow = true,
}: {
    fields: FieldSpec[];
    value: unknown;
    onChange: (next: Obj) => void;
    path: string;
    errors: ErrorMap;
    dense?: boolean;
    firstRow?: boolean;
}) {
    const current = isObj(value) ? value : {};
    const set = (key: string, next: unknown) => {
        const copy = { ...current };
        if (next === undefined) delete copy[key];
        else copy[key] = next;
        onChange(copy);
    };

    return (
        <div
            className={cn("grid items-start", dense ? "gap-2 sm:grid-flow-col sm:auto-cols-fr" : "gap-4 sm:grid-cols-2")}
        >
            {fields.map((field) => (
                <Field key={field.key} field={field} value={current[field.key]} onChange={(next) => set(field.key, next)} path={joinPath(path, field.key)} errors={errors} dense={dense} first={firstRow} />
            ))}
        </div>
    );
}
