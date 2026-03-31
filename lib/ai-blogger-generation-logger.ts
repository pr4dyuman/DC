/**
 * Comprehensive logging system for blog generation pipeline
 * Logs all 15 steps with INPUT-PROCESS-OUTPUT to both console and files
 */

import * as fs from "fs/promises";
import * as path from "path";

export interface StepLog {
  stepNumber: number;
  stepName: string;
  status: "pending" | "in-progress" | "completed" | "failed" | "skipped";
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
}

export class AIBloggerGenerationLogger {
  private logsDir = "";
  private currentRun!: GenerationRunLog;
  private enableFileLogging: boolean;

  constructor(enableFileLogging: boolean = true) {
    this.enableFileLogging = enableFileLogging;
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
    this.logsDir = path.join(process.cwd(), "logs", "blog-generation", agencyId, jobId);

    if (this.enableFileLogging) {
      try {
        await fs.mkdir(this.logsDir, { recursive: true });
      } catch (err) {
        console.warn("[LOGGER] Could not create logs directory:", err);
      }
    }

    this.currentRun = {
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

    console.log(`\n[GENERATION-LOG] 🚀 Starting generation run: ${jobId}`);
    console.log(`[GENERATION-LOG] Agency: ${agencyName} (${agencyId})`);
    console.log(`[GENERATION-LOG] Mode: ${input.mode} | Source: ${input.sourceValue}`);
    console.log(`[GENERATION-LOG] Word target: ${input.wordCount}`);
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
    },
    errors?: string[]
  ) {
    const status = errors?.length ? "failed" : output?.data ? "completed" : "skipped";

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
      },
      errors,
    };

    this.currentRun.steps.push(step);

    // Update metrics
    if (output.metrics?.tokensIn) {
      this.currentRun.metrics.totalTokensIn += output.metrics.tokensIn;
    }
    if (output.metrics?.tokensOut) {
      this.currentRun.metrics.totalTokensOut += output.metrics.tokensOut;
    }

    switch (status) {
      case "completed":
        this.currentRun.metrics.stepsCompleted++;
        break;
      case "failed":
        this.currentRun.metrics.stepsFailed++;
        break;
      case "skipped":
        this.currentRun.metrics.stepsPending++;
        break;
    }

    if (process.details?.fallbackUsed) {
      this.currentRun.metrics.fallbacksUsed++;
    }

    // Console output
    const statusIcon =
      status === "completed" ? "✅" : status === "failed" ? "❌" : status === "skipped" ? "⏭️" : "⏳";
    console.log(
      `\n[STEP ${stepNumber}] ${statusIcon} ${stepName} | Duration: ${process.durationMs}ms`
    );
    console.log(`  📥 INPUT: ${JSON.stringify(input).substring(0, 100)}...`);
    console.log(`  ⚙️  PROCESS: ${output.summary}`);
    if (output.metrics) {
      console.log(
        `  📊 METRICS: Tokens IN=${output.metrics.tokensIn} OUT=${output.metrics.tokensOut}`
      );
    }
    if (errors?.length) {
      console.log(`  ❌ ERRORS: ${errors.join(" | ")}`);
    }
  }

  setFinalDraft(data: {
    title: string;
    wordCount: number;
    seoScore: number;
    internalLinks: number;
    faqItems: number;
  }) {
    this.currentRun.finalDraft = data;
  }

  async finalize(status: "completed" | "failed") {
    this.currentRun.completedAt = new Date().toISOString();
    this.currentRun.status = status;
    this.currentRun.metrics.totalDurationMs =
      new Date(this.currentRun.completedAt).getTime() - new Date(this.currentRun.startedAt).getTime();

    console.log("\n" + "═".repeat(80));
    console.log("📊 FINAL METRICS");
    console.log("═".repeat(80));
    console.log(`Status: ${status === "completed" ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Total duration: ${this.formatMs(this.currentRun.metrics.totalDurationMs)}`);
    console.log(`Steps completed: ${this.currentRun.metrics.stepsCompleted}/${this.currentRun.steps.length}`);
    console.log(`Steps failed: ${this.currentRun.metrics.stepsFailed}`);
    console.log(
      `Total tokens: IN=${this.currentRun.metrics.totalTokensIn} OUT=${this.currentRun.metrics.totalTokensOut} TOTAL=${this.currentRun.metrics.totalTokensIn + this.currentRun.metrics.totalTokensOut}`
    );
    console.log(`Fallbacks used: ${this.currentRun.metrics.fallbacksUsed}`);

    if (this.currentRun.finalDraft) {
      console.log(`\n📝 DRAFT STATS:`);
      console.log(`  Title: "${this.currentRun.finalDraft.title}"`);
      console.log(`  Word count: ${this.currentRun.finalDraft.wordCount}`);
      console.log(`  SEO score: ${this.currentRun.finalDraft.seoScore}/100`);
      console.log(`  Internal links: ${this.currentRun.finalDraft.internalLinks}`);
      console.log(`  FAQ items: ${this.currentRun.finalDraft.faqItems}`);
    }

    console.log("═".repeat(80) + "\n");

    // Save to files if enabled (local development only - Vercel has ephemeral storage)
    if (this.enableFileLogging) {
      try {
        await fs.mkdir(this.logsDir, { recursive: true });
        await fs.writeFile(
          path.join(this.logsDir, "run.json"),
          JSON.stringify(this.currentRun, null, 2)
        );

        const txtContent = this.generateTxtReport();
        await fs.writeFile(path.join(this.logsDir, "run.txt"), txtContent);

        const timelineContent = this.generateTimeline();
        await fs.writeFile(path.join(this.logsDir, "timeline.txt"), timelineContent);

        if (this.currentRun.metrics.stepsFailed > 0) {
          const diagnostics = {
            generationJobId: this.currentRun.jobId,
            agencyId: this.currentRun.agencyId,
            failedSteps: this.currentRun.steps
              .filter((s) => s.status === "failed")
              .map((s) => ({
                step: s.stepNumber,
                name: s.stepName,
                errors: s.errors,
                timestamp: s.process.completedAt,
              })),
          };
          await fs.writeFile(
            path.join(this.logsDir, "diagnostics.json"),
            JSON.stringify(diagnostics, null, 2)
          );
        }

        console.log(`[GENERATION-LOG] 📁 Logs saved to: ${this.logsDir}`);
      } catch (err) {
        console.error("[GENERATION-LOG] Error saving log files:", err);
      }
    }

    // Console output serves as primary log on Vercel (check Vercel Function Logs)
    console.log(`[GENERATION-LOG] ✅ Generation run completed (${this.currentRun.jobId})`)
  }

  private generateTxtReport(): string {
    const lines: string[] = [];

    lines.push("═".repeat(80));
    lines.push("  AI BLOGGER GENERATION RUN");
    lines.push("═".repeat(80));
    lines.push("");
    lines.push(`Job ID:      ${this.currentRun.jobId}`);
    lines.push(`Agency:      ${this.currentRun.agencyName} (${this.currentRun.agencyId})`);
    lines.push(`Started:     ${this.currentRun.startedAt}`);
    lines.push(`Completed:   ${this.currentRun.completedAt}`);
    lines.push(`Status:      ${this.currentRun.status === "completed" ? "✅ SUCCESS" : "❌ FAILED"}`);
    lines.push("");

    lines.push("INPUT");
    lines.push("─".repeat(80));
    lines.push(`  Mode:          ${this.currentRun.input.mode}`);
    lines.push(`  Source:        ${this.currentRun.input.sourceValue}`);
    lines.push(`  Word target:   ${this.currentRun.input.wordCount}`);
    if (this.currentRun.input.title) {
      lines.push(`  Title:         ${this.currentRun.input.title}`);
    }
    lines.push("");

    // Log each step
    for (const step of this.currentRun.steps) {
      lines.push("");
      lines.push("─".repeat(80));
      const stepIcon =
        step.status === "completed"
          ? "✅"
          : step.status === "failed"
            ? "❌"
            : step.status === "skipped"
              ? "⏭️"
              : "⏳";
      lines.push(`STEP ${step.stepNumber} ${stepIcon} ${step.stepName}`);
      lines.push("─".repeat(80));

      lines.push(`STATUS:       ${step.status.toUpperCase()}`);
      lines.push(`Duration:     ${step.process.durationMs}ms`);

      if (Object.keys(step.input).length > 0) {
        lines.push(`\nINPUT:`);
        for (const [key, value] of Object.entries(step.input)) {
          const displayValue =
            typeof value === "object" ? JSON.stringify(value).substring(0, 60) : String(value);
          lines.push(`  ${key}: ${displayValue}`);
        }
      }

      if (Object.keys(step.process.details).length > 0) {
        lines.push(`\nPROCESS DETAILS:`);
        for (const [key, value] of Object.entries(step.process.details)) {
          const displayValue =
            typeof value === "object" ? JSON.stringify(value).substring(0, 60) : String(value);
          lines.push(`  ${key}: ${displayValue}`);
        }
      }

      lines.push(`\nOUTPUT SUMMARY:`);
      lines.push(`  ${step.output.summary}`);

      if (step.output.metrics) {
        lines.push(`\nMETRICS:`);
        for (const [key, value] of Object.entries(step.output.metrics)) {
          lines.push(`  ${key}: ${value}`);
        }
      }

      if (step.errors && step.errors.length > 0) {
        lines.push(`\nERRORS:`);
        for (const error of step.errors) {
          lines.push(`  ❌ ${error}`);
        }
      }

      if (step.output.data) {
        lines.push(`\nOUTPUT DATA:`);
        const dataStr = JSON.stringify(step.output.data, null, 2);
        for (const line of dataStr.split("\n")) {
          lines.push(`  ${line}`);
        }
      }
    }

    lines.push("");
    lines.push("═".repeat(80));
    lines.push("FINAL METRICS");
    lines.push("═".repeat(80));
    lines.push(`Total duration:     ${this.formatMs(this.currentRun.metrics.totalDurationMs)}`);
    lines.push(`Steps completed:    ${this.currentRun.metrics.stepsCompleted}/${this.currentRun.steps.length}`);
    lines.push(`Steps failed:       ${this.currentRun.metrics.stepsFailed}`);
    lines.push(`Tokens IN:          ${this.currentRun.metrics.totalTokensIn}`);
    lines.push(`Tokens OUT:         ${this.currentRun.metrics.totalTokensOut}`);
    lines.push(`Total tokens:       ${this.currentRun.metrics.totalTokensIn + this.currentRun.metrics.totalTokensOut}`);
    lines.push(`Fallbacks used:     ${this.currentRun.metrics.fallbacksUsed}`);

    if (this.currentRun.finalDraft) {
      lines.push("");
      lines.push("─".repeat(80));
      lines.push("DRAFT STATISTICS");
      lines.push("─".repeat(80));
      lines.push(`Title:              ${this.currentRun.finalDraft.title}`);
      lines.push(`Word count:         ${this.currentRun.finalDraft.wordCount}`);
      lines.push(`SEO score:          ${this.currentRun.finalDraft.seoScore}/100`);
      lines.push(`Internal links:     ${this.currentRun.finalDraft.internalLinks}`);
      lines.push(`FAQ items:          ${this.currentRun.finalDraft.faqItems}`);
    }

    lines.push("");
    lines.push("═".repeat(80));
    lines.push(`  STATUS: ${this.currentRun.status === "completed" ? "✅ GENERATION SUCCESSFUL" : "❌ GENERATION FAILED"}`);
    lines.push("═".repeat(80));

    return lines.join("\n");
  }

  private generateTimeline(): string {
    const lines: string[] = [];

    lines.push("BLOG GENERATION TIMELINE");
    lines.push("═".repeat(80));
    lines.push("");
    lines.push(`Job ID: ${this.currentRun.jobId}`);
    lines.push(`Started: ${this.currentRun.startedAt}`);
    lines.push("");
    lines.push("Step-by-Step Timing:");
    lines.push("");

    let cumulativeMs = 0;
    for (const step of this.currentRun.steps) {
      cumulativeMs += step.process.durationMs || 0;
      const icon =
        step.status === "completed"
          ? "✅"
          : step.status === "failed"
            ? "❌"
            : step.status === "skipped"
              ? "⏭️"
              : "⏳";
      const durationStr = this.formatMs(step.process.durationMs || 0);
      const cumulativeStr = this.formatMs(cumulativeMs);

      lines.push(
        `${icon} Step ${step.stepNumber.toString().padStart(2)} | ${step.stepName.padEnd(25)} | ${durationStr.padStart(8)} | Cumulative: ${cumulativeStr}`
      );
    }

    lines.push("");
    lines.push("─".repeat(80));
    lines.push(
      `Total: ${this.formatMs(this.currentRun.metrics.totalDurationMs)} (${this.currentRun.metrics.stepsCompleted} steps, ${this.currentRun.metrics.stepsFailed} failed)`
    );

    // Find slowest step
    const sortedByDuration = [...this.currentRun.steps].sort(
      (a, b) => (b.process.durationMs || 0) - (a.process.durationMs || 0)
    );
    if (sortedByDuration.length > 0) {
      lines.push("");
      lines.push("Slowest steps:");
      for (let i = 0; i < Math.min(3, sortedByDuration.length); i++) {
        const step = sortedByDuration[i];
        lines.push(
          `  ${i + 1}. ${step.stepName} - ${this.formatMs(step.process.durationMs || 0)}`
        );
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
}

export const generationLogger = new AIBloggerGenerationLogger(true);
