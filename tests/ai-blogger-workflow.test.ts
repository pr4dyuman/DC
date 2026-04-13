import test from "node:test";
import assert from "node:assert/strict";

import { shouldTreatBlogStudioStatusTransitionAsNoop } from "../lib/ai-blogger-workflow";

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
