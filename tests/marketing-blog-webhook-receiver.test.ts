import test from "node:test";
import assert from "node:assert/strict";

import {
    buildMarketingBlogUrl,
    buildMarketingWebhookSuccessReceipt,
    normalizeMarketingShortDescription,
    resolveMarketingPublicOrigin,
} from "../lib/marketing-blog-utils";

test("receiver success receipt exposes top-level publication fields and preserves nested blog data", () => {
    const result = buildMarketingWebhookSuccessReceipt({
        blog: {
            id: "destination-blog-123",
            slug: "creator-vetting-guide",
            title: "Creator Vetting Guide",
            status: "published",
        },
        isUpdate: false,
        processingTime: "42ms",
        configuredSiteUrl: "https://digitalcorvids.com/admin",
    });

    assert.equal(result.success, true);
    assert.equal(result.externalId, "destination-blog-123");
    assert.equal(
        result.externalUrl,
        "https://digitalcorvids.com/blog/creator-vetting-guide",
    );
    assert.equal(result.slug, "creator-vetting-guide");
    assert.deepEqual(result.blog, {
        id: "destination-blog-123",
        slug: "creator-vetting-guide",
        title: "Creator Vetting Guide",
        status: "published",
    });
    assert.equal(result.message, "Blog created successfully");
});

test("receiver receipt keeps update compatibility", () => {
    const result = buildMarketingWebhookSuccessReceipt({
        blog: {
            id: "destination-blog-123",
            slug: "creator-vetting-guide",
            title: "Creator Vetting Guide",
            status: "published",
        },
        isUpdate: true,
        processingTime: "17ms",
        configuredSiteUrl: "https://digitalcorvids.com",
    });

    assert.equal(result.message, "Blog updated successfully");
    assert.equal(result.externalId, result.blog.id);
    assert.equal(result.slug, result.blog.slug);
});

test("public blog URLs use configured site origin and reject non-http origins", () => {
    assert.equal(
        buildMarketingBlogUrl("safe-slug", "https://www.digitalcorvids.com/private/path"),
        "https://www.digitalcorvids.com/blog/safe-slug",
    );
    assert.equal(
        resolveMarketingPublicOrigin("javascript:alert(1)"),
        "https://digitalcorvids.com",
    );
    assert.equal(
        buildMarketingBlogUrl("safe-slug", "javascript:alert(1)"),
        "https://digitalcorvids.com/blog/safe-slug",
    );
});

test("short description skips raw article Markdown in favour of metadata", () => {
    const result = normalizeMarketingShortDescription([
        "# Creator Vetting Guide\n\n## Quick answer\nRaw article content should not become the hero summary.",
        "Use this practical framework to evaluate an influencer marketing agency.",
        "Creator Vetting Guide",
    ]);

    assert.equal(
        result,
        "Use this practical framework to evaluate an influencer marketing agency.",
    );
});

test("short description produces plain text and falls back to the title", () => {
    assert.equal(
        normalizeMarketingShortDescription([
            "<p>Compare **creator fit** with [audience evidence](https://example.com).</p>",
        ]),
        "Compare creator fit with audience evidence.",
    );
    assert.equal(
        normalizeMarketingShortDescription(["## Raw section", "", "Creator Vetting Guide"]),
        "Creator Vetting Guide",
    );
});
