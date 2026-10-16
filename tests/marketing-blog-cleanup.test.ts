import test from "node:test";
import assert from "node:assert/strict";

import {
  REMOVED_BLOG_REDIRECTS,
  cleanStoredBlogSchema,
  getMarketingBlogPublicCategory,
  isInternalMarketingBlogLabel,
  isRemovedMarketingBlogSlug,
  rewriteMarketingSiteLinksToRelative,
} from "../lib/marketing-blog-cleanup";

test("removed blog redirects point at service pages or kept posts, never at removed posts", () => {
  for (const [slug, destination] of Object.entries(REMOVED_BLOG_REDIRECTS)) {
    assert.match(destination, /^\/(services|blog)\//, slug);
    const targetSlug = destination.startsWith("/blog/") ? destination.slice("/blog/".length) : "";
    assert.equal(isRemovedMarketingBlogSlug(targetSlug), false, `${slug} -> ${destination}`);
  }
});

test("internal pipeline labels are replaced by a topic category", () => {
  assert.equal(isInternalMarketingBlogLabel("zSEO Content Studio"), true);
  assert.equal(isInternalMarketingBlogLabel("practical how-to guide"), true);
  assert.equal(isInternalMarketingBlogLabel("Influencer Marketing"), false);

  assert.equal(
    getMarketingBlogPublicCategory({
      category: "zSEO Content Studio",
      slug: "local-service-ads-vs-google-business-plumber-leads",
      title: "Local Service Ads vs Google Business Profile",
    }),
    "PPC",
  );
  assert.equal(getMarketingBlogPublicCategory({ category: "SEO Strategy", slug: "x" }), "SEO Strategy");
  assert.equal(getMarketingBlogPublicCategory({ category: "", slug: "misc-notes", title: "Notes" }), "Insights");
});

test("links to this site become root-relative", () => {
  const html =
    '<a href="https://www.digitalcorvids.com/services/seo">SEO</a> <a href=\'https://digitalcorvids.com\'>home</a> <a href="https://example.com/x">x</a>';

  assert.equal(
    rewriteMarketingSiteLinksToRelative(html),
    '<a href="/services/seo">SEO</a> <a href=\'/\'>home</a> <a href="https://example.com/x">x</a>',
  );
});

test("stored BlogPosting schema loses internal section and author labels", () => {
  const cleaned = cleanStoredBlogSchema(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          articleSection: "expert-led educational guide",
          author: { "@type": "Person", name: "Digitalcorvids Export Queue" },
        },
        { "@type": "BreadcrumbList" },
      ],
    },
    "SEO",
    "Digital Corvids",
  ) as { "@graph": Array<Record<string, unknown>> };

  assert.equal(cleaned["@graph"][0].articleSection, "SEO");
  assert.deepEqual(cleaned["@graph"][0].author, { "@type": "Organization", name: "Digital Corvids" });
  assert.deepEqual(cleaned["@graph"][1], { "@type": "BreadcrumbList" });
});
