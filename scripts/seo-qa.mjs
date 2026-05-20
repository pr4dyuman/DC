import "dotenv/config";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://digitalcorvids.com";

const REQUIRED_PUBLIC_PATHS = [
  "/",
  "/about",
  "/services",
  "/services/seo",
  "/services/web-development",
  "/services/ppc",
  "/services/social-media-marketing",
  "/services/video-production-ad",
  "/services/influencer-marketing",
  "/services/manage-company",
  "/services/ai-blogger",
  "/contact",
  "/get-started",
  "/blog",
];

const BLOCKED_SITEMAP_PATTERNS = [
  /^\/api(?:\/|$)/,
  /^\/dashboard(?:\/|$)/,
  /^\/super-admin(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/trial-expired(?:\/|$)/,
  /^\/plan-expired(?:\/|$)/,
];

const EXPECTED_NOINDEX_PATHS = [
  "/login",
  "/admin",
  "/dashboard",
  "/super-admin",
  "/trial-expired",
  "/plan-expired",
];

const SERVICE_DETAIL_PATHS = [
  "/services/seo",
  "/services/web-development",
  "/services/ppc",
  "/services/social-media-marketing",
  "/services/video-production-ad",
  "/services/influencer-marketing",
  "/services/manage-company",
  "/services/ai-blogger",
];

const SERVICE_FAQ_PATHS = [
  "/services/seo",
  "/services/web-development",
  "/services/ppc",
  "/services/social-media-marketing",
  "/services/video-production-ad",
  "/services/influencer-marketing",
];

const VERIFICATION_ENV = [
  {
    env: "GOOGLE_SITE_VERIFICATION",
    selector: "google-site-verification",
  },
  {
    env: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
    selector: "google-site-verification",
  },
  {
    env: "BING_SITE_VERIFICATION",
    selector: "msvalidate.01",
  },
  {
    env: "NEXT_PUBLIC_BING_SITE_VERIFICATION",
    selector: "msvalidate.01",
  },
  {
    env: "MSVALIDATE_SITE_VERIFICATION",
    selector: "msvalidate.01",
  },
  {
    env: "NEXT_PUBLIC_MSVALIDATE_SITE_VERIFICATION",
    selector: "msvalidate.01",
  },
  {
    env: "YANDEX_SITE_VERIFICATION",
    selector: "yandex-verification",
  },
  {
    env: "NEXT_PUBLIC_YANDEX_SITE_VERIFICATION",
    selector: "yandex-verification",
  },
  {
    env: "PINTEREST_SITE_VERIFICATION",
    selector: "p:domain_verify",
  },
  {
    env: "NEXT_PUBLIC_PINTEREST_SITE_VERIFICATION",
    selector: "p:domain_verify",
  },
];

const args = process.argv.slice(2);
const rawBaseUrl =
  args.find((arg) => !arg.startsWith("--")) ||
  DEFAULT_BASE_URL;
const maxPagesArg = args.find((arg) => arg.startsWith("--max-pages="));
const maxPages = maxPagesArg
  ? Number.parseInt(maxPagesArg.split("=")[1] || "", 10)
  : 40;

const baseUrl = normalizeBaseUrl(rawBaseUrl);
const results = [];

function normalizeBaseUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    throw new Error(`Invalid base URL: ${value}`);
  }
}

function toUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function getPathname(url) {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return url;
  }
}

function addResult(level, label, detail = "") {
  results.push({ level, label, detail });
}

function pass(label, detail = "") {
  addResult("PASS", label, detail);
}

function warn(label, detail = "") {
  addResult("WARN", label, detail);
}

function fail(label, detail = "") {
  addResult("FAIL", label, detail);
}

async function fetchResource(pathOrUrl, options = {}) {
  const url = toUrl(pathOrUrl);
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "DigitalCorvids-SEO-QA/1.0",
      accept: options.accept || "text/html,application/xhtml+xml,application/xml,text/plain,*/*",
    },
  });
  const text = await response.text();
  return { url, response, text };
}

function getMetaContent(html, nameOrProperty) {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

function getCanonical(html) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.trim() || "";
}

function getTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtml(match?.[1]?.replace(/\s+/g, " ").trim() || "");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function getJsonLdBlocks(html) {
  return [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function flattenJsonLd(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      flattenJsonLd(item, output);
    }
    return output;
  }

  if (!value || typeof value !== "object") {
    return output;
  }

  output.push(value);

  for (const key of ["@graph", "itemListElement", "mainEntity", "acceptedAnswer", "author", "publisher", "image"]) {
    if (value[key]) {
      flattenJsonLd(value[key], output);
    }
  }

  return output;
}

function parseJsonLdBlocks(blocks) {
  const parsed = [];
  const invalid = [];

  for (const block of blocks) {
    try {
      parsed.push(JSON.parse(decodeHtml(block)));
    } catch (error) {
      invalid.push(error);
    }
  }

  return {
    parsed,
    invalid,
    nodes: parsed.flatMap((item) => flattenJsonLd(item)),
  };
}

function getSchemaTypes(nodes) {
  const types = new Set();

  for (const node of nodes) {
    const type = node?.["@type"];
    if (Array.isArray(type)) {
      for (const item of type) {
        if (typeof item === "string" && item.trim()) {
          types.add(item.trim());
        }
      }
    } else if (typeof type === "string" && type.trim()) {
      types.add(type.trim());
    }
  }

  return types;
}

function getExpectedSchemaTypes(path) {
  const expected = ["ProfessionalService", "WebSite"];

  if (path === "/contact") {
    expected.push("ContactPage");
  }

  if (SERVICE_DETAIL_PATHS.includes(path)) {
    expected.push("Service", "BreadcrumbList");
  }

  if (SERVICE_FAQ_PATHS.includes(path)) {
    expected.push("FAQPage");
  }

  if (/^\/blog\/[^/]+$/.test(path)) {
    expected.push("BlogPosting", "BreadcrumbList");
  }

  return expected;
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => decodeHtml(match[1].trim()))
    .filter(Boolean);
}

async function checkRobots() {
  try {
    const { response, text } = await fetchResource("/robots.txt", { accept: "text/plain,*/*" });
    if (response.ok) {
      pass("robots.txt is reachable", `${response.status}`);
    } else {
      fail("robots.txt is reachable", `${response.status}`);
      return;
    }

    if (/Sitemap:\s*https?:\/\/[^\s]+\/sitemap\.xml/i.test(text)) {
      pass("robots.txt declares sitemap.xml");
    } else {
      fail("robots.txt declares sitemap.xml");
    }

    for (const path of ["/api/", "/dashboard", "/super-admin", "/admin"]) {
      if (new RegExp(`Disallow:\\s*${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text)) {
        pass(`robots.txt disallows ${path}`);
      } else {
        warn(`robots.txt disallows ${path}`, "Not found");
      }
    }
  } catch (error) {
    fail("robots.txt check crashed", error.message);
  }
}

async function checkSitemap() {
  try {
    const { response, text } = await fetchResource("/sitemap.xml", {
      accept: "application/xml,text/xml,*/*",
    });
    if (!response.ok) {
      fail("sitemap.xml is reachable", `${response.status}`);
      return [];
    }

    const urls = extractSitemapUrls(text);
    if (urls.length > 0) {
      pass("sitemap.xml has URLs", `${urls.length} URLs`);
    } else {
      fail("sitemap.xml has URLs");
    }

    const paths = new Set(urls.map(getPathname));
    for (const path of REQUIRED_PUBLIC_PATHS) {
      if (paths.has(path)) {
        pass(`sitemap includes ${path}`);
      } else {
        fail(`sitemap includes ${path}`);
      }
    }

    const blocked = urls
      .map((url) => ({ url, path: getPathname(url) }))
      .filter(({ path }) => BLOCKED_SITEMAP_PATTERNS.some((pattern) => pattern.test(path)));
    if (blocked.length === 0) {
      pass("sitemap excludes private/auth/API routes");
    } else {
      fail(
        "sitemap excludes private/auth/API routes",
        blocked.slice(0, 8).map((item) => item.path).join(", "),
      );
    }

    return urls;
  } catch (error) {
    fail("sitemap.xml check crashed", error.message);
    return [];
  }
}

function selectPagePaths(sitemapUrls) {
  const paths = new Set(REQUIRED_PUBLIC_PATHS);
  for (const url of sitemapUrls) {
    const path = getPathname(url);
    if (!BLOCKED_SITEMAP_PATTERNS.some((pattern) => pattern.test(path))) {
      paths.add(path);
    }
    if (paths.size >= maxPages) {
      break;
    }
  }
  return [...paths];
}

async function checkPublicPage(path) {
  try {
    const { response, text } = await fetchResource(path);
    if (!response.ok) {
      fail(`${path} returns 200`, `${response.status}`);
      return;
    }
    pass(`${path} returns 200`);

    const title = getTitle(text);
    if (title) {
      pass(`${path} has <title>`);
    } else {
      fail(`${path} has <title>`);
    }

    const description = getMetaContent(text, "description");
    if (description) {
      pass(`${path} has meta description`);
    } else {
      fail(`${path} has meta description`);
    }

    const canonical = getCanonical(text);
    if (!canonical) {
      fail(`${path} has canonical`);
    } else if (!canonical.startsWith("https://digitalcorvids.com")) {
      warn(`${path} canonical uses production host`, canonical);
    } else {
      pass(`${path} has production canonical`, canonical);
    }

    const robots = getMetaContent(text, "robots").toLowerCase();
    if (robots.includes("noindex")) {
      fail(`${path} is indexable`, `robots=${robots}`);
    } else {
      pass(`${path} is indexable`);
    }

    for (const tag of ["og:title", "og:description", "og:url", "og:image", "twitter:card", "twitter:image"]) {
      if (getMetaContent(text, tag)) {
        pass(`${path} has ${tag}`);
      } else {
        fail(`${path} has ${tag}`);
      }
    }

    const h1Count = countMatches(text, /<h1(?:\s|>)/gi);
    if (h1Count === 1) {
      pass(`${path} has one server-rendered H1`);
    } else {
      warn(`${path} has one server-rendered H1`, `found ${h1Count}`);
    }

    const jsonLdBlocks = getJsonLdBlocks(text);
    if (jsonLdBlocks.length === 0) {
      warn(`${path} has JSON-LD structured data`);
    } else {
      const jsonLd = parseJsonLdBlocks(jsonLdBlocks);
      if (jsonLd.invalid.length === 0) {
        pass(`${path} JSON-LD parses`, `${jsonLdBlocks.length} block(s)`);
      } else {
        fail(`${path} JSON-LD parses`, `${jsonLd.invalid.length} invalid block(s)`);
      }

      if (jsonLd.invalid.length === 0) {
        const schemaTypes = getSchemaTypes(jsonLd.nodes);
        for (const expectedType of getExpectedSchemaTypes(path)) {
          if (schemaTypes.has(expectedType)) {
            pass(`${path} has ${expectedType} schema`);
          } else {
            fail(
              `${path} has ${expectedType} schema`,
              `found: ${[...schemaTypes].sort().join(", ") || "none"}`,
            );
          }
        }
      }
    }
  } catch (error) {
    fail(`${path} page check crashed`, error.message);
  }
}

async function checkNoIndexPage(path) {
  try {
    const { response, text } = await fetchResource(path);
    const robotsHeader = response.headers.get("x-robots-tag")?.toLowerCase() || "";
    const robotsMeta = getMetaContent(text, "robots").toLowerCase();
    const hasNoIndex = robotsHeader.includes("noindex") || robotsMeta.includes("noindex");

    if (hasNoIndex) {
      pass(`${path} is noindex`);
    } else {
      warn(`${path} is noindex`, `status ${response.status}, final ${response.url || path}`);
    }
  } catch (error) {
    warn(`${path} noindex check skipped`, error.message);
  }
}

async function checkVerificationMeta() {
  try {
    const enabled = VERIFICATION_ENV.filter((item) => process.env[item.env]?.trim());
    if (enabled.length === 0) {
      warn(
        "webmaster verification tokens configured",
        "No local GOOGLE/BING/YANDEX/PINTEREST verification env vars found.",
      );
      return;
    }

    const { text } = await fetchResource("/");
    for (const item of enabled) {
      const value = process.env[item.env].trim();
      const rendered = getMetaContent(text, item.selector);
      if (rendered === value) {
        pass(`${item.env} renders as ${item.selector}`);
      } else {
        fail(`${item.env} renders as ${item.selector}`);
      }
    }
  } catch (error) {
    fail("webmaster verification check crashed", error.message);
  }
}

async function checkOgImage() {
  try {
    const { response } = await fetchResource("/og-image", { accept: "image/png,*/*" });
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("image/png")) {
      pass("/og-image returns PNG", contentType);
    } else {
      fail("/og-image returns PNG", `${response.status} ${contentType}`);
    }
  } catch (error) {
    fail("/og-image check crashed", error.message);
  }
}

function printResults() {
  const counts = results.reduce(
    (acc, item) => {
      acc[item.level] += 1;
      return acc;
    },
    { PASS: 0, WARN: 0, FAIL: 0 },
  );

  console.log(`\nSEO QA for ${baseUrl}`);
  console.log(`PASS ${counts.PASS} | WARN ${counts.WARN} | FAIL ${counts.FAIL}\n`);

  for (const result of results) {
    const suffix = result.detail ? ` - ${result.detail}` : "";
    console.log(`[${result.level}] ${result.label}${suffix}`);
  }
}

async function main() {
  console.log(`Running SEO QA against ${baseUrl}`);
  await checkRobots();
  const sitemapUrls = await checkSitemap();
  const pagePaths = selectPagePaths(sitemapUrls);

  for (const path of pagePaths) {
    await checkPublicPage(path);
  }

  for (const path of EXPECTED_NOINDEX_PATHS) {
    await checkNoIndexPage(path);
  }

  await checkVerificationMeta();
  await checkOgImage();
  printResults();

  if (results.some((result) => result.level === "FAIL")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
