/**
 * Comprehensive logging system for blog generation pipeline
 * Logs the full staged workflow with INPUT-PROCESS-OUTPUT to both console and files
 */

import { AsyncLocalStorage } from "async_hooks";
import * as fs from "fs/promises";
import * as path from "path";

type StepStatus = "pending" | "in-progress" | "completed" | "failed" | "skipped";
type StepCompletionStatus = "completed" | "failed" | "skipped";

export interface StepLog {
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  input: Record<string, any>;
  process: {
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    details: Record<string, any>;
  };
  output: {
    summary: string;
    data?: Record<string, any>;
    metrics?: Record<string, any>;
    rawText?: string;
  };
  errors?: string[];
}

export interface GenerationRunLog {
  jobId: string;
  agencyId: string;
  createdBy: string;
  agencyName: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  input: {
    mode: string;
    sourceValue: string;
    wordCount: number;
    title?: string;
  };
  steps: StepLog[];
  metrics: {
    totalDurationMs: number;
    totalTokensIn: number;
    totalTokensOut: number;
    stepsCompleted: number;
    stepsFailed: number;
    stepsPending: number;
    fallbacksUsed: number;
  };
  finalDraft?: {
    title: string;
    wordCount: number;
    seoScore: number;
    internalLinks: number;
    faqItems: number;
  };
  failure?: {
    message: string;
    stepName?: string;
    stepNumber?: number;
    recordedAt: string;
  };
}

type GenerationRunState = {
  logsDir: string;
  currentRun: GenerationRunLog;
};

export class AIBloggerGenerationLogger {
  private readonly runs = new Map<string, GenerationRunState>();
  private readonly runContext = new AsyncLocalStorage<{ jobId: string }>();
  private enableFileLogging: boolean;

  constructor(enableFileLogging: boolean = true) {
    this.enableFileLogging = enableFileLogging;
  }

  private resolveJobId(jobId?: string): string | null {
    const explicitJobId = jobId || this.runContext.getStore()?.jobId;
    if (explicitJobId) {
      return explicitJobId;
    }

    if (this.runs.size === 1) {
      return this.runs.keys().next().value ?? null;
    }

    return null;
  }

  runWithJob<T>(jobId: string, work: () => Promise<T> | T): Promise<T> | T {
    return this.runContext.run({ jobId }, work);
  }

  private getRunState(jobId?: string): GenerationRunState {
    const resolvedJobId = this.resolveJobId(jobId);
    if (!resolvedJobId) {
      throw new Error("Generation logger run context is missing.");
    }

    const state = this.runs.get(resolvedJobId);
    if (!state) {
      throw new Error(`Generation logger state is missing for job ${resolvedJobId}.`);
    }

    return state;
  }

  private tryGetRunState(jobId?: string): GenerationRunState | null {
    const resolvedJobId = this.resolveJobId(jobId);
    if (!resolvedJobId) {
      return null;
    }

    return this.runs.get(resolvedJobId) || null;
  }

  private createEmptyRun(
    jobId: string,
    agencyId: string,
    agencyName: string,
    createdBy: string,
    input: {
      mode: string;
      sourceValue: string;
      wordCount: number;
      title?: string;
    }
  ): GenerationRunLog {
    return {
      jobId,
      agencyId,
      agencyName,
      createdBy,
      startedAt: new Date().toISOString(),
      status: "running",
      input,
      steps: [],
      metrics: {
        totalDurationMs: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        stepsCompleted: 0,
        stepsFailed: 0,
        stepsPending: 0,
        fallbacksUsed: 0,
      },
    };
  }

  private recalculateMetrics(run: GenerationRunLog) {
    const nextMetrics = {
      totalDurationMs: 0,
      totalTokensIn: 0,
      totalTokensOut: 0,
      stepsCompleted: 0,
      stepsFailed: 0,
      stepsPending: 0,
      fallbacksUsed: 0,
    };

    for (const step of run.steps) {
      nextMetrics.totalTokensIn += step.output.metrics?.tokensIn ?? 0;
      nextMetrics.totalTokensOut += step.output.metrics?.tokensOut ?? 0;

      switch (step.status) {
        case "completed":
          nextMetrics.stepsCompleted += 1;
          break;
        case "failed":
          nextMetrics.stepsFailed += 1;
          break;
        case "skipped":
          nextMetrics.stepsPending += 1;
          break;
      }

      if (step.process.details?.fallbackUsed) {
        nextMetrics.fallbacksUsed += 1;
      }
    }

    const summedStepDurationMs = run.steps.reduce((sum, step) => {
      const durationMs = typeof step.process.durationMs === "number"
        ? step.process.durationMs
        : 0;
      return sum + Math.max(0, durationMs);
    }, 0);
    const startedMs = new Date(run.startedAt).getTime();
    const latestCompletedMs = run.steps.reduce((latest, step) => {
      const completedMs = step.process.completedAt
        ? new Date(step.process.completedAt).getTime()
        : Number.NaN;
      return Number.isFinite(completedMs) ? Math.max(latest, completedMs) : latest;
    }, -Infinity);
    const runCompletedMs = run.completedAt ? new Date(run.completedAt).getTime() : Number.NaN;
    const totalEndMs = Number.isFinite(runCompletedMs)
      ? runCompletedMs
      : latestCompletedMs;
    if (Number.isFinite(startedMs) && Number.isFinite(totalEndMs)) {
      nextMetrics.totalDurationMs = Math.max(0, totalEndMs - startedMs);
    }
    nextMetrics.totalDurationMs = Math.max(nextMetrics.totalDurationMs, summedStepDurationMs);

    run.metrics = nextMetrics;
  }

  private async loadExistingRun(
    logsDir: string,
    jobId: string,
    agencyId: string,
    agencyName: string,
    createdBy: string,
    input: {
      mode: string;
      sourceValue: string;
      wordCount: number;
      title?: string;
    }
  ): Promise<GenerationRunLog | null> {
    if (!this.enableFileLogging) {
      return null;
    }

    try {
      const raw = await fs.readFile(path.join(logsDir, "run.json"), "utf8");
      const parsed = JSON.parse(raw) as Partial<GenerationRunLog>;

      if (!parsed || parsed.jobId !== jobId) {
        return null;
      }

      const resumedRun: GenerationRunLog = {
        ...this.createEmptyRun(jobId, agencyId, agencyName, createdBy, input),
        ...parsed,
        agencyId,
        agencyName,
        createdBy,
        status: "running",
        completedAt: undefined,
        failure: undefined,
        input: {
          mode: parsed.input?.mode || input.mode,
          sourceValue: parsed.input?.sourceValue || input.sourceValue,
          wordCount:
            typeof parsed.input?.wordCount === "number"
              ? parsed.input.wordCount
              : input.wordCount,
          title: parsed.input?.title || input.title,
        },
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      };

      this.recalculateMetrics(resumedRun);
      return resumedRun;
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
      if (code !== "ENOENT") {
        console.warn("[LOGGER] Could not resume existing generation log:", err);
      }
      return null;
    }
  }

  private async persistCurrentRun(jobId?: string) {
    if (!this.enableFileLogging) {
      return;
    }

    const { logsDir, currentRun } = this.getRunState(jobId);

    try {
      await fs.mkdir(logsDir, { recursive: true });
      await fs.writeFile(
        path.join(logsDir, "run.json"),
        JSON.stringify(currentRun, null, 2)
      );

      const txtContent = this.generateTxtReport(currentRun);
      await fs.writeFile(path.join(logsDir, "run.txt"), txtContent);

      const timelineContent = this.generateTimeline(currentRun);
      await fs.writeFile(path.join(logsDir, "timeline.txt"), timelineContent);

      if (currentRun.status === "failed") {
        const diagnostics = {
          generationJobId: currentRun.jobId,
          agencyId: currentRun.agencyId,
          status: currentRun.status,
          failure: currentRun.failure,
          failedSteps: currentRun.steps
            .filter((step) => step.status === "failed")
            .map((step) => ({
              step: step.stepNumber,
              name: step.stepName,
              errors: step.errors,
              timestamp: step.process.completedAt,
            })),
        };
        await fs.writeFile(
          path.join(logsDir, "diagnostics.json"),
          JSON.stringify(diagnostics, null, 2)
        );
      }
    } catch (err) {
      console.error("[GENERATION-LOG] Error saving log files:", err);
    }
  }

  async startRun(
    jobId: string,
    agencyId: string,
    agencyName: string,
    createdBy: string,
    input: {
      mode: string;
      sourceValue: string;
      wordCount: number;
      title?: string;
    }
  ) {
    this.runContext.enterWith({ jobId });
    const logsDir = path.join(process.cwd(), "logs", "blog-generation", agencyId, jobId);

    if (this.enableFileLogging) {
      try {
        await fs.mkdir(logsDir, { recursive: true });
      } catch (err) {
        console.warn("[LOGGER] Could not create logs directory:", err);
      }
    }

    const inMemoryState = this.runs.get(jobId);
    const inMemoryRun =
      inMemoryState?.currentRun
        ? {
            ...inMemoryState.currentRun,
            agencyId,
            agencyName,
            createdBy,
            status: "running" as const,
            completedAt: undefined,
            failure: undefined,
            input: {
              mode: inMemoryState.currentRun.input?.mode || input.mode,
              sourceValue: inMemoryState.currentRun.input?.sourceValue || input.sourceValue,
              wordCount:
                typeof inMemoryState.currentRun.input?.wordCount === "number"
                  ? inMemoryState.currentRun.input.wordCount
                  : input.wordCount,
              title: inMemoryState.currentRun.input?.title || input.title,
            },
          }
        : null;

    const currentRun =
      inMemoryRun ||
      (await this.loadExistingRun(logsDir, jobId, agencyId, agencyName, createdBy, input)) ||
      this.createEmptyRun(jobId, agencyId, agencyName, createdBy, input);

    this.recalculateMetrics(currentRun);
    this.runs.set(jobId, { logsDir, currentRun });
    await this.persistCurrentRun(jobId);

    const isResumedRun = currentRun.steps.length > 0;
    console.log(`\n[GENERATION-LOG] ${isResumedRun ? "Resuming" : "Starting"} generation run: ${jobId}`);
    console.log(`[GENERATION-LOG] Agency: ${agencyName} (${agencyId})`);
    console.log(`[GENERATION-LOG] Mode: ${input.mode} | Source: ${input.sourceValue}`);
    console.log(`[GENERATION-LOG] Word target: ${input.wordCount}`);
    if (isResumedRun) {
      console.log(`[GENERATION-LOG] Loaded ${currentRun.steps.length} existing step logs`);
    }
  }

  async logStep(
    stepNumber: number,
    stepName: string,
    input: Record<string, any>,
    process: {
      startedAt: string;
      completedAt: string;
      durationMs: number;
      details?: Record<string, any>;
    },
    output: {
      summary: string;
      data?: Record<string, any>;
      metrics?: Record<string, any>;
      rawText?: string;
      status?: StepCompletionStatus;
    },
    errors?: string[]
  ) {
    const { currentRun } = this.getRunState();
    const status: StepStatus =
      output.status || (errors?.length ? "failed" : output?.data ? "completed" : "skipped");

    const step: StepLog = {
      stepNumber,
      stepName,
      status,
      input,
      process: {
        startedAt: process.startedAt,
        completedAt: process.completedAt,
        durationMs: process.durationMs,
        details: process.details || {},
      },
      output: {
        summary: output.summary,
        data: output.data,
        metrics: output.metrics,
        rawText: output.rawText,
      },
      errors,
    };

    const existingIndex = currentRun.steps.findIndex(
      (existingStep) =>
        existingStep.stepNumber === stepNumber && existingStep.stepName === stepName
    );

    if (existingIndex >= 0) {
      currentRun.steps[existingIndex] = step;
    } else {
      currentRun.steps.push(step);
    }

    currentRun.steps.sort((left, right) => left.stepNumber - right.stepNumber);
    this.recalculateMetrics(currentRun);

    const statusLabel =
      status === "completed"
        ? "OK"
        : status === "failed"
          ? "FAILED"
          : status === "skipped"
            ? "SKIPPED"
            : "RUNNING";
    console.log(`\n[STEP ${stepNumber}] [${statusLabel}] ${stepName} | Duration: ${process.durationMs}ms`);
    console.log(`  INPUT: ${this.truncateForConsole(JSON.stringify(input), 180)}`);
    console.log(`  SUMMARY: ${output.summary}`);
    if (output.metrics) {
      console.log(`  METRICS: Tokens IN=${output.metrics.tokensIn} OUT=${output.metrics.tokensOut}`);
    }
    if (output.rawText) {
      console.log(`  RAW OUTPUT: ${this.truncateForConsole(output.rawText, 180)}`);
    }
    if (errors?.length) {
      console.log(`  ERRORS: ${errors.join(" | ")}`);
    }

    await this.persistCurrentRun();
  }

  setFinalDraft(data: {
    title: string;
    wordCount: number;
    seoScore: number;
    internalLinks: number;
    faqItems: number;
  }) {
    this.getRunState().currentRun.finalDraft = data;
  }

  setFailure(data: {
    message: string;
    stepName?: string;
    stepNumber?: number;
  }) {
    this.getRunState().currentRun.failure = {
      ...data,
      recordedAt: new Date().toISOString(),
    };
  }

  getBlogStudioRunSteps(jobId?: string) {
    const state = this.tryGetRunState(jobId);
    if (!state?.currentRun.steps?.length) {
      return [];
    }

    return state.currentRun.steps.map((step) => ({
      key: `generation-${step.stepNumber}-${this.slugify(step.stepName)}`,
      label: step.stepName,
      status: this.toBlogStudioStepStatus(step.status),
      notes: step.output.summary,
      startedAt: step.process.startedAt,
      completedAt: step.process.completedAt,
      input: step.input,
      process: {
        durationMs: step.process.durationMs,
        details: step.process.details,
      },
      output: step.output,
      errors: step.errors,
    }));
  }

  async finalize(status: "completed" | "failed") {
    const { logsDir, currentRun } = this.getRunState();
    currentRun.completedAt = new Date().toISOString();
    currentRun.status = status;
    this.recalculateMetrics(currentRun);

    console.log("\n" + "=".repeat(80));
    console.log("FINAL METRICS");
    console.log("=".repeat(80));
    console.log(`Status: ${status === "completed" ? "SUCCESS" : "FAILED"}`);
    console.log(`Total duration: ${this.formatMs(currentRun.metrics.totalDurationMs)}`);
    console.log(`Steps completed: ${currentRun.metrics.stepsCompleted}/${currentRun.steps.length}`);
    console.log(`Steps failed: ${currentRun.metrics.stepsFailed}`);
    console.log(
      `Total tokens: IN=${currentRun.metrics.totalTokensIn} OUT=${currentRun.metrics.totalTokensOut} TOTAL=${currentRun.metrics.totalTokensIn + currentRun.metrics.totalTokensOut}`
    );
    console.log(`Fallbacks used: ${currentRun.metrics.fallbacksUsed}`);

    if (currentRun.finalDraft) {
      console.log(`\nDRAFT STATS:`);
      console.log(`  Title: "${currentRun.finalDraft.title}"`);
      console.log(`  Word count: ${currentRun.finalDraft.wordCount}`);
      console.log(`  SEO score: ${currentRun.finalDraft.seoScore}/100`);
      console.log(`  Internal links: ${currentRun.finalDraft.internalLinks}`);
      console.log(`  FAQ items: ${currentRun.finalDraft.faqItems}`);
    }

    if (currentRun.failure) {
      console.log(`\nFAILURE: ${currentRun.failure.message}`);
      if (currentRun.failure.stepName) {
        console.log(`Failure step: ${currentRun.failure.stepName}`);
      }
    }

    console.log("=".repeat(80) + "\n");

    if (this.enableFileLogging) {
      await this.persistCurrentRun();
      console.log(`[GENERATION-LOG] Logs saved to: ${logsDir}`);
    }

    console.log(`[GENERATION-LOG] Generation run completed (${currentRun.jobId})`);
  }

  private generateTxtReport(run: GenerationRunLog): string {
    const lines: string[] = [];

    lines.push("=".repeat(80));
    lines.push("  AI BLOGGER GENERATION RUN");
    lines.push("=".repeat(80));
    lines.push("");
    lines.push(`Job ID:      ${run.jobId}`);
    lines.push(`Agency:      ${run.agencyName} (${run.agencyId})`);
    lines.push(`Started:     ${run.startedAt}`);
    lines.push(`Completed:   ${run.completedAt}`);
    lines.push(`Status:      ${run.status === "completed" ? "SUCCESS" : "FAILED"}`);
    if (run.failure) {
      lines.push(`Failure:     ${run.failure.message}`);
      if (run.failure.stepName) {
        lines.push(`Failed at:   ${run.failure.stepName}`);
      }
    }
    lines.push("");

    lines.push("INPUT");
    lines.push("-".repeat(80));
    lines.push(`  Mode:          ${run.input.mode}`);
    lines.push(`  Source:        ${run.input.sourceValue}`);
    lines.push(`  Word target:   ${run.input.wordCount}`);
    if (run.input.title) {
      lines.push(`  Title:         ${run.input.title}`);
    }
    lines.push("");

    for (const step of run.steps) {
      lines.push("");
      lines.push("-".repeat(80));
      lines.push(`STEP ${step.stepNumber} [${step.status.toUpperCase()}] ${step.stepName}`);
      lines.push("-".repeat(80));

      lines.push(`STATUS:       ${step.status.toUpperCase()}`);
      lines.push(`Duration:     ${step.process.durationMs}ms`);

      if (Object.keys(step.input).length > 0) {
        lines.push(`\nINPUT:`);
        for (const [key, value] of Object.entries(step.input)) {
          this.appendKeyValueLines(lines, key, value);
        }
      }

      if (Object.keys(step.process.details).length > 0) {
        lines.push(`\nPROCESS DETAILS:`);
        for (const [key, value] of Object.entries(step.process.details)) {
          this.appendKeyValueLines(lines, key, value);
        }
      }

      lines.push(`\nOUTPUT SUMMARY:`);
      lines.push(`  ${step.output.summary}`);

      if (step.output.metrics) {
        lines.push(`\nMETRICS:`);
        for (const [key, value] of Object.entries(step.output.metrics)) {
          this.appendKeyValueLines(lines, key, value);
        }
      }

      if (step.errors && step.errors.length > 0) {
        lines.push(`\nERRORS:`);
        for (const error of step.errors) {
          lines.push(`  - ${error}`);
        }
      }

      if (step.output.data) {
        lines.push(`\nOUTPUT DATA:`);
        const dataStr = JSON.stringify(step.output.data, null, 2);
        for (const line of dataStr.split("\n")) {
          lines.push(`  ${line}`);
        }
      }

      if (step.output.rawText) {
        lines.push(`\nRAW MODEL OUTPUT:`);
        for (const line of step.output.rawText.split("\n")) {
          lines.push(`  ${line}`);
        }
      }
    }

    lines.push("");
    lines.push("=".repeat(80));
    lines.push("FINAL METRICS");
    lines.push("=".repeat(80));
    lines.push(`Total duration:     ${this.formatMs(run.metrics.totalDurationMs)}`);
    lines.push(`Steps completed:    ${run.metrics.stepsCompleted}/${run.steps.length}`);
    lines.push(`Steps failed:       ${run.metrics.stepsFailed}`);
    lines.push(`Tokens IN:          ${run.metrics.totalTokensIn}`);
    lines.push(`Tokens OUT:         ${run.metrics.totalTokensOut}`);
    lines.push(`Total tokens:       ${run.metrics.totalTokensIn + run.metrics.totalTokensOut}`);
    lines.push(`Fallbacks used:     ${run.metrics.fallbacksUsed}`);

    if (run.finalDraft) {
      lines.push("");
      lines.push("-".repeat(80));
      lines.push("DRAFT STATISTICS");
      lines.push("-".repeat(80));
      lines.push(`Title:              ${run.finalDraft.title}`);
      lines.push(`Word count:         ${run.finalDraft.wordCount}`);
      lines.push(`SEO score:          ${run.finalDraft.seoScore}/100`);
      lines.push(`Internal links:     ${run.finalDraft.internalLinks}`);
      lines.push(`FAQ items:          ${run.finalDraft.faqItems}`);
    }

    lines.push("");
    lines.push("=".repeat(80));
    lines.push(`  STATUS: ${run.status === "completed" ? "GENERATION SUCCESSFUL" : "GENERATION FAILED"}`);
    lines.push("=".repeat(80));

    return lines.join("\n");
  }

  private generateTimeline(run: GenerationRunLog): string {
    const lines: string[] = [];

    lines.push("BLOG GENERATION TIMELINE");
    lines.push("=".repeat(80));
    lines.push("");
    lines.push(`Job ID: ${run.jobId}`);
    lines.push(`Started: ${run.startedAt}`);
    lines.push("");
    lines.push("Step-by-Step Timing:");
    lines.push("");

    let cumulativeMs = 0;
    for (const step of run.steps) {
      cumulativeMs += step.process.durationMs || 0;
      const statusLabel =
        step.status === "completed"
          ? "OK"
          : step.status === "failed"
            ? "FAIL"
            : step.status === "skipped"
              ? "SKIP"
              : "RUN";
      const durationStr = this.formatMs(step.process.durationMs || 0);
      const cumulativeStr = this.formatMs(cumulativeMs);

      lines.push(
        `[${statusLabel}] Step ${step.stepNumber.toString().padStart(2)} | ${step.stepName.padEnd(25)} | ${durationStr.padStart(8)} | Cumulative: ${cumulativeStr}`
      );
    }

    lines.push("");
    lines.push("-".repeat(80));
    lines.push(
      `Total: ${this.formatMs(run.metrics.totalDurationMs)} (${run.metrics.stepsCompleted} steps, ${run.metrics.stepsFailed} failed)`
    );

    const sortedByDuration = [...run.steps].sort(
      (a, b) => (b.process.durationMs || 0) - (a.process.durationMs || 0)
    );
    if (sortedByDuration.length > 0) {
      lines.push("");
      lines.push("Slowest steps:");
      for (let i = 0; i < Math.min(3, sortedByDuration.length); i++) {
        const step = sortedByDuration[i];
        lines.push(`  ${i + 1}. ${step.stepName} - ${this.formatMs(step.process.durationMs || 0)}`);
      }
    }

    return lines.join("\n");
  }

  private formatMs(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private truncateForConsole(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength)}...`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "step";
  }

  private toBlogStudioStepStatus(status: StepStatus) {
    if (status === "in-progress") {
      return "running";
    }

    return status;
  }

  private appendKeyValueLines(lines: string[], key: string, value: unknown) {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      lines.push(`  ${key}: ${String(value)}`);
      return;
    }

    lines.push(`  ${key}:`);
    const serialized = JSON.stringify(value, null, 2);
    for (const line of serialized.split("\n")) {
      lines.push(`    ${line}`);
    }
  }
}

export const generationLogger = new AIBloggerGenerationLogger(
  process.env.NODE_ENV !== "production"
);
