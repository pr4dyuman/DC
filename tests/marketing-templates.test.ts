import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  MARKETING_TEMPLATE_CATALOG,
  getTemplateContactHref,
  getTemplateContactMessage,
  toSafeTemplateUrl,
} from "../lib/marketing-templates-catalog";
import { getMarketingTemplate, getMarketingTemplates } from "../lib/marketing-templates";

const PUBLIC_DIR = path.join(process.cwd(), "public");

test("every catalogue entry has page content and a unique slug", () => {
  const templates = getMarketingTemplates();
  assert.equal(templates.length, MARKETING_TEMPLATE_CATALOG.length);

  const slugs = templates.map((template) => template.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

test("every image a template page uses exists in public/", () => {
  for (const template of getMarketingTemplates()) {
    const images = [
      template.card.src,
      template.ogImage,
      ...template.tour.flatMap((page) => [page.desktop.src, page.mobile?.src].filter(Boolean) as string[]),
    ];

    for (const src of images) {
      assert.ok(existsSync(path.join(PUBLIC_DIR, src)), `${template.slug}: missing ${src}`);
    }
  }

  assert.ok(existsSync(path.join(PUBLIC_DIR, "templates/og.jpg")), "missing store social image");
});

test("only https links become buttons", () => {
  assert.equal(toSafeTemplateUrl("https://sugo-demo.pages.dev/"), "https://sugo-demo.pages.dev/");
  assert.equal(toSafeTemplateUrl("  https://example.com/buy  "), "https://example.com/buy");
  assert.equal(toSafeTemplateUrl("http://example.com"), null);
  assert.equal(toSafeTemplateUrl("javascript:alert(1)"), null);
  assert.equal(toSafeTemplateUrl("sugo-demo.pages.dev"), null);
  assert.equal(toSafeTemplateUrl(""), null);
  assert.equal(toSafeTemplateUrl(null), null);
});

test("templates without a checkout link ask for a request through the contact form", () => {
  for (const template of getMarketingTemplates()) {
    const entry = MARKETING_TEMPLATE_CATALOG.find((item) => item.slug === template.slug);
    if (toSafeTemplateUrl(entry?.checkoutUrl) || toSafeTemplateUrl(entry?.marketplaceUrl)) {
      assert.equal(template.purchase.external, true);
      continue;
    }

    assert.equal(template.purchase.kind, "request");
    assert.equal(template.purchase.href, getTemplateContactHref(template.slug));
    assert.equal(template.purchase.external, false);
  }
});

test("contact links and messages name the template", () => {
  assert.equal(
    getTemplateContactHref("sugo-restaurant"),
    "/contact?template=sugo-restaurant#contact-form",
  );
  assert.equal(
    getTemplateContactHref("sugo-restaurant", "customise"),
    "/contact?template=sugo-restaurant&intent=customise#contact-form",
  );

  const sugo = getMarketingTemplate("sugo-restaurant");
  assert.ok(sugo);

  const buyMessage = getTemplateContactMessage("sugo-restaurant", null);
  assert.match(buyMessage, /buy the SUGO template/);
  assert.ok(buyMessage.includes(sugo.priceLabel));
  assert.match(getTemplateContactMessage("sugo-restaurant", "customise"), /customise it/);

  assert.equal(getTemplateContactMessage("not-a-template", "buy"), "");
  assert.match(getTemplateContactMessage("not-a-template", "customise"), /one of your website templates/);
  assert.equal(getTemplateContactMessage(null, null), "");
});
