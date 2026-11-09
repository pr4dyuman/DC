import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  MARKETING_CONTACT_SERVICES,
  getMarketingContactHref,
  getMarketingContactMessage,
  getMarketingContactService,
  getMarketingWhatsAppHref,
} from "../lib/marketing-contact";
import { getMarketingServicePage } from "../lib/marketing-service-pages";

const SERVICES_DIR = path.join(process.cwd(), "app", "(marketing)", "services");

test("every contact service is a real service page", () => {
  for (const service of MARKETING_CONTACT_SERVICES) {
    assert.ok(
      existsSync(path.join(SERVICES_DIR, service.slug, "page.js")),
      `${service.slug} has no page at /services/${service.slug}`,
    );
  }
});

test("contact links name the service or the free plan", () => {
  assert.equal(getMarketingContactHref(), "/contact#contact-form");
  assert.equal(getMarketingContactHref({ service: "seo" }), "/contact?service=seo#contact-form");
  assert.equal(getMarketingContactHref({ intent: "plan" }), "/contact?intent=plan#contact-form");
});

test("contact messages start with the visitor's request", () => {
  assert.match(getMarketingContactMessage("seo", null), /interested in SEO for my business/);
  assert.match(getMarketingContactMessage("video-production-ad", null), /interested in video production/);
  assert.match(getMarketingContactMessage(null, "plan"), /free marketing plan/);

  // A named service wins over the plan intent; anything unknown starts empty.
  assert.match(getMarketingContactMessage("ppc", "plan"), /interested in PPC advertising/);
  assert.equal(getMarketingContactMessage("not-a-service", null), "");
  assert.equal(getMarketingContactMessage(null, "customise"), "");
  // Agency OS is a product, not a service a visitor can enquire about here.
  assert.equal(getMarketingContactService("agency-os"), undefined);
});

test("the WhatsApp link opens a chat about the page's service", () => {
  const text = (pathname: string | null) => new URL(getMarketingWhatsAppHref(pathname)).searchParams.get("text");

  assert.ok(getMarketingWhatsAppHref("/").startsWith("https://wa.me/918003177679?text="));
  assert.equal(text("/"), "Hi Digital Corvids, I'd like to know more about your services.");
  assert.match(text("/services/seo") ?? "", /your SEO services/);
  assert.match(text("/agency-os") ?? "", /Agency OS/);
  assert.match(text("/products") ?? "", /your products/);
  assert.match(text("/templates/sugo-restaurant") ?? "", /your website templates/);
  assert.match(text(null) ?? "", /your services/);
});

// Service pages once sent "Get started" to the Agency OS free trial
// (/get-started), so visitors who wanted marketing help landed on software
// signup instead of an enquiry.
test("service pages send visitors to the contact form, not the Agency OS trial", () => {
  // Every service page renders the shared layout with its own content...
  for (const service of MARKETING_CONTACT_SERVICES) {
    const source = readFileSync(path.join(SERVICES_DIR, service.slug, "page.js"), "utf8");
    assert.ok(source.includes(`getMarketingServicePage("${service.slug}")`), `/services/${service.slug} uses its own content`);
    assert.equal(getMarketingServicePage(service.slug).path, `/services/${service.slug}`);
  }

  // ...whose buttons open the contact form for that service.
  const layout = readFileSync(path.join(process.cwd(), "components", "marketing", "services", "ServicePage.jsx"), "utf8");
  assert.ok(layout.includes("getMarketingContactHref({ service: service.slug })"), "the layout's buttons name the service");

  const contentDir = path.join(process.cwd(), "lib", "marketing-service-pages");
  for (const file of [layout, ...readdirSync(contentDir).map((name) => readFileSync(path.join(contentDir, name), "utf8"))]) {
    assert.ok(!file.includes("/get-started"), "no service page links to the Agency OS trial");
  }
});
