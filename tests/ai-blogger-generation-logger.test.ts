import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { AIBloggerGenerationLogger } from "../lib/ai-blogger-generation-logger";

test("generation logger resumes and checkpoints a multi-phase run", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-blogger-logger-"));
    const originalCwd = process.cwd();

    try {
        process.chdir(tempDir);

        const phaseOneLogger = new AIBloggerGenerationLogger(true);
        await phaseOneLogger.startRun("job-1", "agency-1", "Agency", "user-1", {
            mode: "website",
            sourceValue: "https://example.com",
            wordCount: 1200,
        });

        await phaseOneLogger.logStep(
            1,
            "Website Intelligence",
            { url: "https://example.com", maxPages: 15 },
            {
                startedAt: "2026-04-13T10:00:00.000Z",
                completedAt: "2026-04-13T10:00:01.000Z",
                durationMs: 1000,
                details: {},
            },
            {
                summary: "Fetched 10 pages",
                data: { pageCount: 10 },
                metrics: { tokensIn: 10, tokensOut: 5 },
            },
        );

        const runPath = path.join(
            tempDir,
            "logs",
            "blog-generation",
            "agency-1",
            "job-1",
            "run.json",
        );
        const checkpointRun = JSON.parse(await fs.readFile(runPath, "utf8"));
        assert.equal(checkpointRun.status, "running");
        assert.equal(checkpointRun.steps.length, 1);
        assert.equal(checkpointRun.steps[0].stepNumber, 1);
        assert.equal(checkpointRun.metrics.totalTokensIn, 10);
        assert.equal(checkpointRun.metrics.totalTokensOut, 5);
        assert.equal(checkpointRun.metrics.totalDurationMs, 1000);

        const phaseTwoLogger = new AIBloggerGenerationLogger(true);
        await phaseTwoLogger.startRun("job-1", "agency-1", "Agency", "user-1", {
            mode: "website",
            sourceValue: "https://example.com",
            wordCount: 1200,
        });

        await phaseTwoLogger.logStep(
            2,
            "Fetch Trends / Discovery",
            { sourceMode: "website", sourceValue: "https://example.com" },
            {
                startedAt: "2026-04-13T10:00:01.000Z",
                completedAt: "2026-04-13T10:00:03.000Z",
                durationMs: 2000,
                details: {},
            },
            {
                summary: "Selected topic",
                data: { selectedTopic: "Example topic" },
                metrics: { tokensIn: 3, tokensOut: 2 },
            },
        );

        phaseTwoLogger.setFinalDraft({
            title: "Example draft",
            wordCount: 1500,
            seoScore: 91,
            internalLinks: 5,
            faqItems: 6,
        });
        await phaseTwoLogger.finalize("completed");

        const finalRun = JSON.parse(await fs.readFile(runPath, "utf8"));
        assert.equal(finalRun.status, "completed");
        assert.deepEqual(
            finalRun.steps.map((step: { stepNumber: number }) => step.stepNumber),
            [1, 2],
        );
        assert.equal(finalRun.metrics.stepsCompleted, 2);
        assert.equal(finalRun.metrics.totalTokensIn, 13);
        assert.equal(finalRun.metrics.totalTokensOut, 7);
        assert.equal(finalRun.metrics.totalDurationMs, 3000);
        assert.equal(finalRun.finalDraft.title, "Example draft");

        await fs.access(path.join(path.dirname(runPath), "run.txt"));
        await fs.access(path.join(path.dirname(runPath), "timeline.txt"));
    } finally {
        process.chdir(originalCwd);
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});

test("generation logger isolates overlapping jobs in the same process", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-blogger-logger-overlap-"));
    const originalCwd = process.cwd();

    try {
        process.chdir(tempDir);

        const logger = new AIBloggerGenerationLogger(true);
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        const runJob = async (
            jobId: string,
            agencyId: string,
            stepNumber: number,
            stepName: string,
            waitMs: number,
        ) => {
            await logger.startRun(jobId, agencyId, `Agency ${agencyId}`, `user-${jobId}`, {
                mode: "website",
                sourceValue: `https://${jobId}.example.com`,
                wordCount: 1200,
            });

            await delay(waitMs);

            await logger.logStep(
                stepNumber,
                stepName,
                { jobId },
                {
                    startedAt: "2026-04-13T10:00:00.000Z",
                    completedAt: "2026-04-13T10:00:01.000Z",
                    durationMs: 1000,
                    details: { jobId },
                },
                {
                    summary: `${jobId} completed ${stepName}`,
                    data: { jobId, stepName },
                    metrics: { tokensIn: stepNumber, tokensOut: 1 },
                },
            );

            logger.setFinalDraft({
                title: `${jobId} draft`,
                wordCount: 1500 + stepNumber,
                seoScore: 90 + stepNumber,
                internalLinks: stepNumber,
                faqItems: 2,
            });
            await logger.finalize("completed");
        };

        await Promise.all([
            runJob("job-a", "agency-a", 1, "Website Intelligence", 25),
            runJob("job-b", "agency-b", 2, "Fetch Trends / Discovery", 5),
        ]);

        const jobARun = JSON.parse(await fs.readFile(
            path.join(tempDir, "logs", "blog-generation", "agency-a", "job-a", "run.json"),
            "utf8",
        ));
        const jobBRun = JSON.parse(await fs.readFile(
            path.join(tempDir, "logs", "blog-generation", "agency-b", "job-b", "run.json"),
            "utf8",
        ));

        assert.equal(jobARun.jobId, "job-a");
        assert.equal(jobARun.steps.length, 1);
        assert.equal(jobARun.steps[0].stepNumber, 1);
        assert.equal(jobARun.steps[0].input.jobId, "job-a");
        assert.equal(jobARun.finalDraft.title, "job-a draft");

        assert.equal(jobBRun.jobId, "job-b");
        assert.equal(jobBRun.steps.length, 1);
        assert.equal(jobBRun.steps[0].stepNumber, 2);
        assert.equal(jobBRun.steps[0].input.jobId, "job-b");
        assert.equal(jobBRun.finalDraft.title, "job-b draft");
    } finally {
        process.chdir(originalCwd);
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});
