/**
 * Structured logger for AI Blogger workflow.
 * 
 * All output goes to the server console via `console.log` / `console.error`.
 * Every log line starts with `[AI-BLOGGER]` so you can easily filter in the
 * terminal:   npm run dev 2>&1 | grep "AI-BLOGGER"
 */

const PREFIX = "[AI-BLOGGER]";

function shortId(id?: string): string {
    if (!id) return "???";
    return id.length > 8 ? `…${id.slice(-6)}` : id;
}

function ts(): string {
    return new Date().toISOString();
}

function fmtMeta(meta?: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) return "";
    const parts = Object.entries(meta).map(([k, v]) => {
        if (typeof v === "string" && v.length > 80) return `${k}:"${v.slice(0, 77)}…"`;
        if (typeof v === "string") return `${k}:"${v}"`;
        return `${k}:${JSON.stringify(v)}`;
    });
    return ` | ${parts.join(" ")}`;
}

/**
 * Log the START of a workflow action.
 * Example: `[AI-BLOGGER] [CREATE-DRAFT] Starting | agency:…abc123 title:"My Post"`
 */
export function blogLog(action: string, message: string, meta?: Record<string, unknown>): void {
    console.log(`${PREFIX} [${action}] ${message}${fmtMeta(meta)} (${ts()})`);
}

/**
 * Log a SUB-STEP within a workflow action.
 * Example: `[AI-BLOGGER] [GENERATE] → Trends fetched | signals:5 source:"live-api"`
 */
export function blogLogStep(action: string, step: string, meta?: Record<string, unknown>): void {
    console.log(`${PREFIX} [${action}] → ${step}${fmtMeta(meta)} (${ts()})`);
}

/**
 * Log the successful END of a workflow action with elapsed time.
 * Example: `[AI-BLOGGER] [GENERATE] ✓ Done in 2340ms`
 */
export function blogLogDone(action: string, startMs: number, meta?: Record<string, unknown>): void {
    const elapsed = Date.now() - startMs;
    console.log(`${PREFIX} [${action}] ✓ Done in ${elapsed}ms${fmtMeta(meta)} (${ts()})`);
}

/**
 * Log an ERROR in a workflow action.
 * Example: `[AI-BLOGGER] [PUBLISH] ✗ ERROR: Schema validation failed`
 */
export function blogLogError(action: string, message: string, error?: unknown): void {
    const errMsg = error instanceof Error ? error.message : String(error ?? "");
    console.error(`${PREFIX} [${action}] ✗ ERROR: ${message}${errMsg ? ` — ${errMsg}` : ""} (${ts()})`);
}

/**
 * Log the INPUT of a pipeline stage (prompt preview).
 * Truncates to keep terminal readable.
 */
export function blogLogInput(stage: string, prompt: string): void {
    const preview = prompt.replace(/\s+/g, " ").slice(0, 300);
    console.log(`${PREFIX} [${stage}] ⮕ INPUT: ${preview}${prompt.length > 300 ? "…" : ""} (${ts()})`);
}

/**
 * Log the OUTPUT of a pipeline stage (response preview + tokens).
 */
export function blogLogOutput(
    stage: string,
    output: string,
    meta?: { tokens?: { inputTokens?: number; outputTokens?: number; totalTokens?: number; input_tokens?: number; output_tokens?: number; total_tokens?: number }; usedFallback?: boolean },
): void {
    const preview = output.replace(/\s+/g, " ").slice(0, 400);
    const t = meta?.tokens;
    const inTok = t?.inputTokens ?? t?.input_tokens;
    const outTok = t?.outputTokens ?? t?.output_tokens;
    const totTok = t?.totalTokens ?? t?.total_tokens;
    const tokenInfo = t
        ? ` | tokens: in=${inTok ?? "?"},out=${outTok ?? "?"},total=${totTok ?? "?"}`
        : "";
    const fallbackLabel = meta?.usedFallback ? " | ⚠ FALLBACK KEY" : "";
    console.log(`${PREFIX} [${stage}] ⮐ OUTPUT: ${preview}${output.length > 400 ? "…" : ""}${tokenInfo}${fallbackLabel} (${ts()})`);
}

/**
 * Shortens an agencyId for log readability.
 */
export { shortId as blogShortId };

