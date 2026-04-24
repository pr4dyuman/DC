import test from "node:test";
import assert from "node:assert/strict";

import { validatePublishedMetadata } from "../lib/ai-blogger-metadata-validation";
import type { BlogStudioPost } from "../lib/types-ai-blogger";

function makePost(schemaMarkup: string): BlogStudioPost {
    return {
        id: "post-1",
        slug: "schema-array-test",
        title: "Schema Array Test Blog Post",
        metaTitle: "Schema Array Test Blog Post for SEO",
        metaDescription:
            "A practical metadata validation test that confirms JSON-LD arrays are accepted without false schema warnings.",
        excerpt: "A practical metadata validation test for JSON-LD arrays.",
        content: Array.from({ length: 320 }, (_, index) => `word${index}`).join(" "),
        canonicalUrl: "https://digitalcorvids.com/blog/schema-array-test",
        featuredImageUrl: "/ai-blogger.svg",
        featuredImageAlt: "Schema validation preview image",
        schemaMarkup,
    } as unknown as BlogStudioPost;
}

test("validatePublishedMetadata accepts JSON-LD schema arrays", () => {
    const result = validatePublishedMetadata(makePost(JSON.stringify([
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: "Schema Array Test Blog Post",
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [],
        },
    ])));

    assert.equal(result.isValid, true);
    assert.equal(result.issues.some((issue) => issue.code === "MISSING_SCHEMA_CONTEXT"), false);
    assert.equal(result.issues.some((issue) => issue.code === "MISSING_SCHEMA_TYPE"), false);
});
