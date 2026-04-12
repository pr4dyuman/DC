import test from "node:test";
import assert from "node:assert/strict";

import { sendWebhookToAgency, type WebhookPayload } from "../lib/ai-blogger-webhook";
import {
    contentHasStandaloneFaqSection,
    stripStandaloneFaqSection,
} from "../lib/marketing-blog-content";
import type { BlogStudioWebhookConfig } from "../lib/types-ai-blogger";

const webhookConfig: BlogStudioWebhookConfig = {
    url: "https://example.com/webhook",
    active: true,
    retryAttempts: 2,
    timeout: 5,
};

const payload: WebhookPayload = {
    event: "blog.published",
    blog: {
        id: "post-1",
        title: "Test post",
        slug: "test-post",
        content: "<p>Test content</p>",
        excerpt: "Test excerpt",
        metaTitle: "Test post",
        metaDescription: "Test description",
        canonicalUrl: "https://example.com/blog/test-post",
        image: "",
        imageAlt: "",
        category: "Blog",
        internalLinks: [],
        publishedAt: "2026-04-12T00:00:00.000Z",
    },
    source: {
        agencyId: "agency-1",
        agencyName: "Agency",
        publishedAt: "2026-04-12T00:00:00.000Z",
    },
};

async function withFastTimers(run: () => Promise<void>) {
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;

    globalThis.setTimeout = ((callback: TimerHandler) => {
        if (typeof callback === "function") {
            callback();
        }
        return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = (() => undefined) as typeof clearTimeout;

    try {
        await run();
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
    }
}

test("sendWebhookToAgency retries retryable 5xx responses", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;

    await withFastTimers(async () => {
        globalThis.fetch = (async () => {
            calls += 1;
            return new Response(null, {
                status: calls === 1 ? 500 : 200,
                statusText: calls === 1 ? "Server Error" : "OK",
            });
        }) as typeof fetch;

        try {
            const result = await sendWebhookToAgency(webhookConfig, payload);

            assert.equal(result.success, true);
            assert.equal(result.attempt, 2);
            assert.equal(result.attempts?.length, 2);
            assert.deepEqual(result.attempts?.map((attempt) => attempt.success), [false, true]);
            assert.equal(calls, 2);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

test("sendWebhookToAgency does not retry non-retryable 4xx responses", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;

    await withFastTimers(async () => {
        globalThis.fetch = (async () => {
            calls += 1;
            return new Response(null, {
                status: 400,
                statusText: "Bad Request",
            });
        }) as typeof fetch;

        try {
            const result = await sendWebhookToAgency(webhookConfig, payload);

            assert.equal(result.success, false);
            assert.equal(result.statusCode, 400);
            assert.equal(result.attempt, 1);
            assert.equal(result.attempts?.length, 1);
            assert.equal(calls, 1);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

test("sendWebhookToAgency retries request timeouts", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;

    await withFastTimers(async () => {
        globalThis.fetch = (async () => {
            calls += 1;

            if (calls === 1) {
                const error = new Error("The operation was aborted");
                error.name = "AbortError";
                throw error;
            }

            return new Response(null, { status: 200, statusText: "OK" });
        }) as typeof fetch;

        try {
            const result = await sendWebhookToAgency(webhookConfig, payload);

            assert.equal(result.success, true);
            assert.equal(result.attempt, 2);
            assert.equal(result.attempts?.length, 2);
            assert.deepEqual(result.attempts?.map((attempt) => attempt.success), [false, true]);
            assert.equal(calls, 2);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

test("stripStandaloneFaqSection removes markdown FAQ blocks but preserves later sections", () => {
    const content = [
        "## Overview",
        "A short introduction.",
        "",
        "## FAQ",
        "### What does this do?",
        "It answers common questions.",
        "",
        "## Sources",
        "1. Example source",
    ].join("\n");

    const stripped = stripStandaloneFaqSection(content);

    assert.equal(contentHasStandaloneFaqSection(content), true);
    assert.match(stripped, /## Overview/);
    assert.doesNotMatch(stripped, /## FAQ/i);
    assert.match(stripped, /## Sources/);
});

test("stripStandaloneFaqSection removes html FAQ blocks but keeps trailing sources", () => {
    const content = [
        "<h2>Overview</h2>",
        "<p>A short introduction.</p>",
        "<h2>Frequently Asked Questions</h2>",
        "<p>What does this do?</p>",
        "<h2>Sources</h2>",
        "<p>Example source</p>",
    ].join("");

    const stripped = stripStandaloneFaqSection(content);

    assert.equal(contentHasStandaloneFaqSection(content), true);
    assert.match(stripped, /<h2>Overview<\/h2>/i);
    assert.doesNotMatch(stripped, /Frequently Asked Questions/i);
    assert.match(stripped, /<h2>Sources<\/h2>/i);
});

test("stripStandaloneFaqSection leaves content unchanged when no faq block exists", () => {
    const content = "## Overview\nA short introduction.\n\n## Sources\n1. Example source";

    assert.equal(contentHasStandaloneFaqSection(content), false);
    assert.equal(stripStandaloneFaqSection(content), content);
});
