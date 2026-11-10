import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import nextConfig from "../next.config";
import { MARKETING_PRODUCTS, MARKETING_PRODUCT_PATH_PREFIXES } from "../lib/marketing-products";

const ROOT = process.cwd();
const MARKETING_APP = path.join(ROOT, "app", "(marketing)");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(jsx?|tsx?)$/.test(name) ? [full] : [];
  });
}

test("each product links to a real page or a secure external site", () => {
  const ids = MARKETING_PRODUCTS.map((product) => product.id);
  assert.equal(new Set(ids).size, ids.length, "product ids are unique");

  for (const product of MARKETING_PRODUCTS) {
    if (product.external) {
      assert.match(product.href, /^https:\/\//, `${product.name} links to https`);
      continue;
    }
    const pageDir = path.join(MARKETING_APP, product.href.slice(1));
    assert.ok(
      ["page.jsx", "page.js", "page.tsx"].some((file) => existsSync(path.join(pageDir, file))),
      `${product.name} has a page at ${product.href}`,
    );
    assert.ok(
      MARKETING_PRODUCT_PATH_PREFIXES.includes(product.href),
      `${product.href} highlights the Products menu`,
    );
  }

  assert.ok(existsSync(path.join(MARKETING_APP, "products", "page.jsx")), "/products overview page exists");
});

test("Agency OS's old addresses redirect permanently to /agency-os", async () => {
  const redirects = await nextConfig.redirects!();
  for (const source of ["/services/manage-company", "/manage-company.html"]) {
    const redirect = redirects.find((entry) => entry.source === source);
    assert.ok(redirect, `${source} has a redirect`);
    assert.equal(redirect.destination, "/agency-os", `${source} goes straight to /agency-os`);
    assert.equal("statusCode" in redirect ? redirect.statusCode : undefined, 301);
  }
  assert.ok(!existsSync(path.join(MARKETING_APP, "services", "manage-company")), "the old page is gone");
});

// Links should point at the new address, not through the redirect.
test("no page or component links to the old Agency OS address", () => {
  const files = [
    ...sourceFiles(path.join(ROOT, "app")),
    ...sourceFiles(path.join(ROOT, "components")),
    ...sourceFiles(path.join(ROOT, "lib")),
  ];
  const offenders = files.filter((file) => readFileSync(file, "utf8").includes('"/services/manage-company"'));
  assert.deepEqual(offenders.map((file) => path.relative(ROOT, file)), []);
});

test("the Services menu lists only marketing services", () => {
  const navigation = readFileSync(path.join(ROOT, "components", "marketing", "Navigation.js"), "utf8");
  const servicesList = navigation.slice(navigation.indexOf("const servicesList"), navigation.indexOf("];") + 2);
  const hrefs = [...servicesList.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);

  assert.equal(hrefs.length, 6);
  for (const href of hrefs) {
    assert.match(href, /^\/services\/[a-z-]+$/, `${href} is a service page`);
  }
});
