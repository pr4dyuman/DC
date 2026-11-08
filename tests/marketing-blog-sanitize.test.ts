import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeMarketingBlogHtml } from "../lib/marketing-blog-sanitize";

test("blog HTML loses scripts, styles, event handlers and javascript: links", () => {
    const dirty =
        '<p onclick="steal()">Hi <a href="javascript:alert(1)">there</a></p>' +
        "<script>alert(1)</script><style>body{display:none}</style>" +
        "<img src=x onerror='alert(1)'>";
    const clean = sanitizeMarketingBlogHtml(dirty);
    assert.equal(clean.includes("<script"), false);
    assert.equal(clean.includes("<style"), false);
    assert.equal(/\son[a-z]+\s*=/i.test(clean), false);
    assert.equal(/javascript\s*:/i.test(clean), false);
    assert.ok(clean.includes("<p>Hi"));
});

test("ordinary post markup is left as it is", () => {
    const html =
        '<h2 id="intro">Intro</h2><p>Read <a href="/blog/seo-basics" target="_blank" rel="noopener">this</a>.</p>' +
        '<ul><li><strong>One</strong></li></ul><img src="https://example.com/a.webp" alt="A">';
    assert.equal(sanitizeMarketingBlogHtml(html), html);
    assert.equal(sanitizeMarketingBlogHtml(), "");
});
