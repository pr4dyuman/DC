import test from "node:test";
import assert from "node:assert/strict";

import {
    canTransitionBlogStudioStatus,
    getBlogStudioStatusTransitionLabel,
    getNextBlogStudioPostStatus,
    shouldTreatBlogStudioStatusTransitionAsNoop,
} from "../lib/ai-blogger-workflow";

test("treats stale same-status requests as workflow sync no-ops", () => {
    assert.equal(
        shouldTreatBlogStudioStatusTransitionAsNoop("SEO Review", "SEO Review", "Research"),
        true,
    );
});

test("treats already-past workflow requests as sync no-ops", () => {
    assert.equal(
        shouldTreatBlogStudioStatusTransitionAsNoop("Approved", "SEO Review", "SEO Review"),
        true,
    );
});

test("keeps direct next-step transitions active", () => {
    assert.equal(
        shouldTreatBlogStudioStatusTransitionAsNoop("SEO Review", "Approved", "SEO Review"),
        false,
    );
});

test("does not swallow exact same-status requests without a stale hint", () => {
    assert.equal(
        shouldTreatBlogStudioStatusTransitionAsNoop("SEO Review", "SEO Review", "SEO Review"),
        false,
    );
});

test("skips SEO Review workflow step when SEO review is optional", () => {
    const settings = { seo: { requireSeoReview: false } };

    assert.equal(getNextBlogStudioPostStatus("Research", settings), "Approved");
    assert.equal(getBlogStudioStatusTransitionLabel("Research", settings), "Approve Draft");
    assert.equal(canTransitionBlogStudioStatus("Research", "Approved", settings), true);
    assert.equal(canTransitionBlogStudioStatus("Research", "SEO Review", settings), false);
});
