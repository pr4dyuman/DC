import test from "node:test";
import assert from "node:assert/strict";

import {
  LEGACY_BLOG_REDIRECTS,
  LEGACY_REDIRECTED_BLOG_SLUGS,
  REMOVED_BLOG_REDIRECTS,
  cleanStoredBlogSchema,
  MARKETING_BLOG_TOPICS,
  getMarketingBlogPublicCategory,
  getMarketingBlogTopic,
  isInternalMarketingBlogLabel,
  isRemovedMarketingBlogSlug,
  replaceAIBloggerReferences,
  rewriteMarketingSiteLinksToRelative,
  rewriteRetiredMarketingBlogLinks,
} from "../lib/marketing-blog-cleanup";
import { isMarketingBlogPlaceholderImage } from "../lib/marketing-blog-utils";

test("retired blog redirects point at service pages, kept posts or zSEO.ai, never at retired pages", () => {
  for (const [slug, destination] of Object.entries({ ...LEGACY_BLOG_REDIRECTS, ...REMOVED_BLOG_REDIRECTS })) {
    assert.match(destination, /^(?:\/(?:services|blog)\/|https:\/\/zseo\.ai$)/, slug);
    // /services/ai-blogger itself redirects to zSEO.ai.
    assert.notEqual(destination, "/services/ai-blogger", slug);
    const targetSlug = destination.startsWith("/blog/") ? destination.slice("/blog/".length) : "";
    assert.equal(isRemovedMarketingBlogSlug(targetSlug), false, `${slug} -> ${destination}`);
    assert.equal(LEGACY_REDIRECTED_BLOG_SLUGS.has(targetSlug), false, `${slug} -> ${destination}`);
  }
});

test("links to retired posts point at the redirect target, links to gone posts are unlinked", () => {
  const html = [
    '<a href="/blog/choose-seo-services-guide">SEO guide</a>',
    '<a class="x" href="https://www.digitalcorvids.com/blog/the-2026-seo-management-workflow-scaling-content-with-ai/">workflow</a>',
    "<a href='/blog/mastering-country-calling-2026-content-strategy-ai-production#intro'>story</a>",
    '<a href="/blog/ux-design-research-guide"><strong>UX research</strong></a>',
    '<a href="/blog/technical-seo-vs-on-page-key-implementation-priorities">kept</a>',
    '<a href="/services/seo">service</a>',
  ].join(" ");

  assert.equal(
    rewriteRetiredMarketingBlogLinks(html),
    [
      '<a href="/services/seo">SEO guide</a>',
      '<a class="x" href="https://zseo.ai">workflow</a>',
      '<a href="/blog/how-to-build-a-storytelling-campaign-strategy-the-2026-model">story</a>',
      "<strong>UX research</strong>",
      '<a href="/blog/technical-seo-vs-on-page-key-implementation-priorities">kept</a>',
      '<a href="/services/seo">service</a>',
    ].join(" "),
  );
});

test("a retired post that redirects to the post being rendered is unlinked, not self-linked", () => {
  const html =
    '<a href="/blog/brand-voice-insurance-editorial-guardrails-for-ai-generated-assets">editorial guardrails</a>';

  assert.equal(
    rewriteRetiredMarketingBlogLinks(html, "is-ai-generated-content-good-for-seo-the-strategic-playbook"),
    "editorial guardrails",
  );
  assert.equal(
    rewriteRetiredMarketingBlogLinks(html, "technical-seo-vs-on-page-key-implementation-priorities"),
    '<a href="/blog/is-ai-generated-content-good-for-seo-the-strategic-playbook">editorial guardrails</a>',
  );
});

test("AI Blogger links and mentions in post HTML point at zSEO.ai", () => {
  const html = [
    '<p>pairing these pipelines with a high-capacity <a href="/services/ai-blogger">ai blogger platform</a> allows you</p>',
    '<p>an advanced <a class="x" href="https://www.digitalcorvids.com/services/ai-blogger/">AI Blogger platform</a></p>',
    '<p>our Sovereign Production or AI Blogger <a href="/services">services</a></p>',
    '<img alt="AI Blogger" src="/ai-blogger.svg">',
    '<a href="/services/ai-bloggers">other</a>',
  ].join("");

  assert.equal(
    replaceAIBloggerReferences(html),
    [
      '<p>pairing these pipelines with a high-capacity <a href="https://zseo.ai">zSEO.ai platform</a> allows you</p>',
      '<p>an advanced <a class="x" href="https://zseo.ai">zSEO.ai platform</a></p>',
      '<p>our Sovereign Production or zSEO.ai <a href="/services">services</a></p>',
      '<img alt="AI Blogger" src="/ai-blogger.svg">',
      '<a href="/services/ai-bloggers">other</a>',
    ].join(""),
  );
});

test("the AI Blogger illustration counts as a placeholder, not a post image", () => {
  assert.equal(isMarketingBlogPlaceholderImage("/ai-blogger.svg"), true);
  assert.equal(isMarketingBlogPlaceholderImage("https://digitalcorvids.com/ai-blogger.svg"), true);
  assert.equal(isMarketingBlogPlaceholderImage("https://cdn.example.com/posts/cover.jpg"), false);
  assert.equal(isMarketingBlogPlaceholderImage("/uploads/my-ai-blogger.svg"), false);
  assert.equal(isMarketingBlogPlaceholderImage(""), false);
  assert.equal(isMarketingBlogPlaceholderImage(undefined), false);
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

// Readers browse by topic. The stored categories on the live blog included
// case duplicates and one-off labels, which became separate filters.
test("posts are grouped into the six service topics", () => {
  const topic = (category: string, slug = "post", title = "Post") => getMarketingBlogTopic({ category, slug, title });

  assert.equal(topic("influencer marketing"), "Influencer Marketing");
  assert.equal(topic("Influencer Marketing"), "Influencer Marketing");
  assert.equal(topic("2026 social media marketing trends"), "Social Media");
  assert.equal(topic("PPC Advertising Services"), "PPC");
  assert.equal(topic("PPC"), "PPC");
  assert.equal(topic("SEO Strategy"), "SEO");

  // A category that names no service falls back to the slug and title.
  assert.equal(topic("Generative AI", "generative-ai-seo-optimization-benefits", "Generative AI SEO Optimization Benefits"), "SEO");
  assert.equal(topic("Insights", "customized-web-application-development-architecture", "Custom Web Apps"), "Web Development");
  assert.equal(topic("zSEO Content Studio", "local-service-ads-vs-google-business-plumber-leads", "Local Service Ads"), "PPC");
  assert.equal(topic("Campaign Notes", "misc-notes", "Notes"), "Insights");

  // An editor's service category wins over words in the title.
  assert.equal(topic("SEO", "post", "How a new website affects rankings"), "SEO");

  for (const label of ["SEO", "PPC", "Social Media", "Web Development", "Video Production", "Influencer Marketing", "Insights"]) {
    assert.ok(MARKETING_BLOG_TOPICS.includes(label), `${label} is a topic`);
  }
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

test("stored BlogPosting schema drops the AI Blogger placeholder image", () => {
  const placeholder = { "@type": "ImageObject", url: "https://digitalcorvids.com/ai-blogger.svg" };
  const cover = { "@type": "ImageObject", url: "https://cdn.example.com/cover.jpg" };
  const clean = (image: unknown) =>
    cleanStoredBlogSchema({ "@type": "BlogPosting", image }, "SEO", "Digital Corvids") as Record<string, unknown>;

  assert.equal("image" in clean([placeholder]), false);
  assert.equal("image" in clean(placeholder), false);
  assert.equal("image" in clean("/ai-blogger.svg"), false);
  assert.deepEqual(clean([placeholder, cover]).image, [cover]);
  assert.deepEqual(clean(cover).image, cover);
});
