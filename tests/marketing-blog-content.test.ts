import test from "node:test";
import assert from "node:assert/strict";

import { buildMarketingBlogHtml } from "../lib/marketing-blog-content";

test("buildMarketingBlogHtml converts same-line references into clickable markdown links", () => {
    const html = buildMarketingBlogHtml([
        "## References",
        "[1] The Ultimate Guide to Content Distribution [rosssimmonds.com] https://rosssimmonds.com/blog/content-distribution-guide/",
    ].join("\n"));

    assert.match(
        html,
        /<h2>References<\/h2>/i,
    );
    assert.match(
        html,
        /<a href="https:\/\/rosssimmonds\.com\/blog\/content-distribution-guide\/">The Ultimate Guide to Content Distribution \(rosssimmonds\.com\)<\/a>/i,
    );
    assert.doesNotMatch(html, />https:\/\/rosssimmonds\.com\/blog\/content-distribution-guide\/</i);
});

test("buildMarketingBlogHtml converts split reference label and url lines into one clickable link", () => {
    const html = buildMarketingBlogHtml([
        "## Sources",
        "[1] Search Engine Land SEO overview [searchengineland.com]",
        "https://searchengineland.com/guide/what-is-seo",
    ].join("\n"));

    assert.match(
        html,
        /<a href="https:\/\/searchengineland\.com\/guide\/what-is-seo">Search Engine Land SEO overview \(searchengineland\.com\)<\/a>/i,
    );
    assert.doesNotMatch(html, />https:\/\/searchengineland\.com\/guide\/what-is-seo</i);
});
