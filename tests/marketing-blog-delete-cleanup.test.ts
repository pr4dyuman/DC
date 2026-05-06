import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDeletedBlogHrefCandidates,
  stripDeletedBlogLinksFromContent,
} from "../lib/marketing-blog-delete-cleanup";

test("buildDeletedBlogHrefCandidates includes relative, absolute, and canonical variants", () => {
  const candidates = buildDeletedBlogHrefCandidates(
    {
      slug: "deleted-post",
      canonicalUrl: "https://digitalcorvids.com/blog/deleted-post?ref=legacy",
    },
    "https://digitalcorvids.com",
  );

  assert.ok(candidates.includes("/blog/deleted-post"));
  assert.ok(candidates.includes("/blog/deleted-post/"));
  assert.ok(candidates.includes("https://digitalcorvids.com/blog/deleted-post"));
  assert.ok(candidates.includes("https://digitalcorvids.com/blog/deleted-post?ref=legacy"));
  assert.ok(candidates.includes("/blog/deleted-post?ref=legacy"));
});

test("stripDeletedBlogLinksFromContent preserves anchor text while removing deleted blog links", () => {
  const hrefs = buildDeletedBlogHrefCandidates(
    { slug: "deleted-post" },
    "https://digitalcorvids.com",
  );
  const content = [
    "Read [the old guide](/blog/deleted-post) before publishing.",
    '<p>Also see <a href="https://digitalcorvids.com/blog/deleted-post" rel="noopener">legacy context</a>.</p>',
    "Keep [valid links](/blog/current-post) intact.",
  ].join("\n");

  const cleaned = stripDeletedBlogLinksFromContent(content, hrefs);

  assert.match(cleaned, /Read the old guide before publishing/);
  assert.match(cleaned, /Also see legacy context/);
  assert.match(cleaned, /\[valid links\]\(\/blog\/current-post\)/);
  assert.doesNotMatch(cleaned, /\(\/blog\/deleted-post\)/);
  assert.doesNotMatch(cleaned, /href="https:\/\/digitalcorvids\.com\/blog\/deleted-post"/);
});
