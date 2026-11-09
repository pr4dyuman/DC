import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import { MARKETING_CONTACT_SERVICES } from "../lib/marketing-contact";
import { MARKETING_SERVICE_PAGES, getMarketingServicePage } from "../lib/marketing-service-pages";

test("there is one service page per service, in a stable order", () => {
  assert.deepEqual(
    MARKETING_SERVICE_PAGES.map((page) => page.slug).sort(),
    MARKETING_CONTACT_SERVICES.map((service) => service.slug).sort(),
  );
  assert.throws(() => getMarketingServicePage("manage-company"), /Unknown service page/);
});

test("every service page has complete content", () => {
  for (const page of MARKETING_SERVICE_PAGES) {
    const label = page.path;
    assert.equal(page.path, `/services/${page.slug}`, `${label} path`);
    assert.ok(existsSync(path.join(process.cwd(), "public", page.image.src)), `${label} illustration exists`);
    assert.equal(page.highlights.length, 4, `${label} has four highlights`);
    assert.equal(page.audience.length, 3, `${label} says who it is for`);
    assert.ok(page.deliverables.length >= 4, `${label} lists what is included`);
    for (const group of page.deliverables) {
      assert.ok(group.items.length >= 4 && group.text, `${label}: ${group.title} has a description and items`);
    }
    assert.equal(page.process.length, 4, `${label} has four process steps`);
    assert.ok(page.faqs.length >= 4, `${label} keeps its FAQs`);
    assert.ok(page.expectations.length >= 4, `${label} keeps its promises`);
    assert.ok(page.seo.name && page.seo.description && page.seo.serviceType, `${label} keeps its search data`);
    assert.ok(page.closing.title.endsWith("?") && page.closing.text, `${label} has a closing call to action`);
    for (const link of [...page.relatedLinks, ...page.relatedArticles]) {
      assert.match(link.href, /^(\/|https:\/\/)/, `${label}: ${link.title} has a real link`);
    }
  }
});

// Prices are a business decision: until someone sets one, pages say
// "Custom quote" rather than showing a made-up number.
test("no service page shows a price nobody set", () => {
  for (const page of MARKETING_SERVICE_PAGES) {
    assert.ok(page.pricing.from === null || /\d/.test(page.pricing.from), `${page.path} pricing`);
  }
});
