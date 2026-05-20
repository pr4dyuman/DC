import "dotenv/config";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://digitalcorvids.com";

const SERVICE_PATHS = [
  "/services/seo",
  "/services/web-development",
  "/services/ppc",
  "/services/social-media-marketing",
  "/services/video-production-ad",
  "/services/influencer-marketing",
  "/services/manage-company",
  "/services/ai-blogger",
];

const TOPIC_KEYWORDS = new Map([
  ["/services/seo", ["seo", "search engine", "organic", "keyword", "technical seo"]],
  ["/services/web-development", ["web development", "website", "web design", "development"]],
  ["/services/ppc", ["ppc", "paid media", "google ads", "ads", "paid search"]],
  ["/services/social-media-marketing", ["social media", "instagram", "linkedin", "reels", "carousel"]],
  ["/services/video-production-ad", ["video", "ad film", "production", "creative"]],
  ["/services/influencer-marketing", ["influencer", "creator", "campaign"]],
  ["/services/manage-company", ["agency management", "operations", "project management", "finance"]],
  ["/services/ai-blogger", ["ai blogger", "blog", "content workflow", "ai content"]],
]);

const GENERIC_ANCHOR_TEXT = new Set([
  "click here",
  "here",
  "learn more",
  "read more",
  "view more",
  "explore",
  "explore service",
  "get started",
]);

const args = process.argv.slice(2);
const rawBaseUrl =
  args.find((arg) => !arg.startsWith("--")) ||
  DEFAULT_BASE_URL;
const maxPagesArg = args.find((arg) => arg.startsWith("--max-pages="));
const maxPages = maxPagesArg
  ? Number.parseInt(maxPagesArg.split("=")[1] || "", 10)
  : 80;

const baseUrl = normalizeBaseUrl(rawBaseUrl);
const origin = new URL(baseUrl).origin;
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

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value = "") {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGlobalChrome(html = "") {
  return html
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ");
}

function normalizePathFromUrl(value) {
  if (!value || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("javascript:")) {
    return "";
  }

  try {
    const parsed = new URL(value, baseUrl);
    if (parsed.origin !== origin) {
      return "";
    }

    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return path;
  } catch {
    return "";
  }
}

function toAbsoluteUrl(path) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchText(pathOrUrl, accept = "text/html,application/xhtml+xml,*/*") {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : toAbsoluteUrl(pathOrUrl);
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "DigitalCorvids-Internal-Link-Audit/1.0",
      accept,
    },
  });
  const text = await response.text();
  return { response, text, url };
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => decodeHtml(match[1].trim()))
    .filter(Boolean);
}

function extractLinks(html) {
  return [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      rawHref: decodeHtml(match[1].trim()),
      path: normalizePathFromUrl(decodeHtml(match[1].trim())),
      text: stripTags(match[2]),
    }))
    .filter((link) => link.path);
}

function isBlogDetailPath(path) {
  return /^\/blog\/[^/]+$/.test(path);
}

function isServicePath(path) {
  return SERVICE_PATHS.includes(path);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function getPageTopicMatches(page) {
  const haystack = `${page.path} ${page.title || ""}`.toLowerCase();
  const matches = [];

  for (const [servicePath, keywords] of TOPIC_KEYWORDS.entries()) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      matches.push(servicePath);
    }
  }

  return matches;
}

function getTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(match?.[1] || "");
}

function printResults(pageCount) {
  const counts = results.reduce(
    (acc, item) => {
      acc[item.level] += 1;
      return acc;
    },
    { PASS: 0, WARN: 0, FAIL: 0 },
  );

  console.log(`\nInternal link audit for ${baseUrl}`);
  console.log(`Pages crawled ${pageCount}`);
  console.log(`PASS ${counts.PASS} | WARN ${counts.WARN} | FAIL ${counts.FAIL}\n`);

  for (const result of results) {
    const suffix = result.detail ? ` - ${result.detail}` : "";
    console.log(`[${result.level}] ${result.label}${suffix}`);
  }
}

async function getSitemapPaths() {
  const { response, text } = await fetchText("/sitemap.xml", "application/xml,text/xml,*/*");
  if (!response.ok) {
    throw new Error(`Unable to fetch sitemap.xml: ${response.status}`);
  }

  return extractSitemapUrls(text)
    .map((url) => normalizePathFromUrl(url))
    .filter(Boolean);
}

async function crawlPages(paths) {
  const pages = [];

  for (const path of paths.slice(0, maxPages)) {
    try {
      const { response, text } = await fetchText(path);
      if (!response.ok) {
        warn(`${path} could not be crawled`, `${response.status}`);
        continue;
      }

      pages.push({
        path,
        html: text,
        text: stripTags(text),
        contextualText: stripTags(stripGlobalChrome(text)),
        title: getTitle(text),
        links: extractLinks(text),
        contextualLinks: extractLinks(stripGlobalChrome(text)),
      });
    } catch (error) {
      warn(`${path} could not be crawled`, error.message);
    }
  }

  return pages;
}

function checkCoreNavigation(pages) {
  const pageByPath = new Map(pages.map((page) => [page.path, page]));
  const homeLinks = new Set(pageByPath.get("/")?.links.map((link) => link.path) || []);
  const servicesLinks = new Set(pageByPath.get("/services")?.links.map((link) => link.path) || []);

  for (const servicePath of SERVICE_PATHS) {
    if (homeLinks.has(servicePath)) {
      pass(`home links to ${servicePath}`);
    } else {
      warn(`home links to ${servicePath}`);
    }

    if (servicesLinks.has(servicePath)) {
      pass(`/services links to ${servicePath}`);
    } else {
      fail(`/services links to ${servicePath}`);
    }
  }
}

function checkServicePages(pages) {
  const pageByPath = new Map(pages.map((page) => [page.path, page]));

  for (const servicePath of SERVICE_PATHS) {
    const page = pageByPath.get(servicePath);
    if (!page) {
      warn(`${servicePath} not crawled`);
      continue;
    }

    const linkedServices = uniqueSorted(
      page.contextualLinks
        .map((link) => link.path)
        .filter((path) => isServicePath(path) && path !== servicePath),
    );
    const linkedBlogs = uniqueSorted(page.contextualLinks.map((link) => link.path).filter(isBlogDetailPath));

    if (linkedServices.length >= 2) {
      pass(`${servicePath} links to related services`, linkedServices.join(", "));
    } else {
      warn(`${servicePath} links to related services`, `found ${linkedServices.length}`);
    }

    if (linkedBlogs.length > 0) {
      pass(`${servicePath} links to related blog posts`, linkedBlogs.slice(0, 5).join(", "));
    } else {
      warn(`${servicePath} links to related blog posts`, "none found");
    }
  }
}

function checkBlogPages(pages) {
  const blogPages = pages.filter((page) => isBlogDetailPath(page.path));
  if (blogPages.length === 0) {
    warn("blog detail pages crawled", "none found in crawl window");
    return;
  }

  const serviceInboundFromBlogs = new Map(SERVICE_PATHS.map((path) => [path, []]));
  let blogPagesWithServiceLinks = 0;
  let topicMisses = 0;

  for (const page of blogPages) {
    const linkedServices = uniqueSorted(page.contextualLinks.map((link) => link.path).filter(isServicePath));
    const topicMatches = getPageTopicMatches(page);
    const missedRelevantLinks = topicMatches.filter((servicePath) => !linkedServices.includes(servicePath));

    if (linkedServices.length > 0) {
      blogPagesWithServiceLinks += 1;
      pass(`${page.path} links to service pages`, linkedServices.join(", "));
    } else {
      warn(`${page.path} links to service pages`, "none found");
    }

    for (const servicePath of linkedServices) {
      serviceInboundFromBlogs.get(servicePath)?.push(page.path);
    }

    if (missedRelevantLinks.length === 0) {
      pass(`${page.path} topic-matched service links are covered`);
    } else {
      topicMisses += 1;
      warn(`${page.path} missing topic-matched service links`, missedRelevantLinks.join(", "));
    }
  }

  pass("blog pages with at least one service link", `${blogPagesWithServiceLinks}/${blogPages.length}`);

  if (topicMisses === 0) {
    pass("blog topic clusters point to matched services");
  } else {
    warn("blog topic clusters point to matched services", `${topicMisses} blog page(s) need links`);
  }

  for (const [servicePath, inboundBlogs] of serviceInboundFromBlogs.entries()) {
    if (inboundBlogs.length > 0) {
      pass(`${servicePath} receives blog links`, `${inboundBlogs.length} blog page(s)`);
    } else {
      warn(`${servicePath} receives blog links`, "none in crawled blog pages");
    }
  }
}

function checkOrphans(pages, sitemapPaths) {
  const crawledPaths = new Set(pages.map((page) => page.path));
  const inbound = new Map(sitemapPaths.map((path) => [path, new Set()]));

  for (const page of pages) {
    for (const link of page.links) {
      if (link.path !== page.path && inbound.has(link.path)) {
        inbound.get(link.path).add(page.path);
      }
    }
  }

  const orphanCandidates = [...inbound.entries()]
    .filter(([path, sources]) => crawledPaths.has(path) && sources.size === 0 && path !== "/")
    .map(([path]) => path);

  if (orphanCandidates.length === 0) {
    pass("crawled sitemap pages have inbound internal links");
  } else {
    warn("crawled sitemap pages have inbound internal links", orphanCandidates.slice(0, 12).join(", "));
  }
}

function checkGenericAnchorText(pages) {
  const genericLinks = [];

  for (const page of pages) {
    for (const link of page.contextualLinks) {
      const text = link.text.toLowerCase();
      if (GENERIC_ANCHOR_TEXT.has(text) && (isServicePath(link.path) || isBlogDetailPath(link.path))) {
        genericLinks.push(`${page.path} -> ${link.path} (${link.text})`);
      }
    }
  }

  if (genericLinks.length === 0) {
    pass("internal links use descriptive anchor text");
  } else {
    warn("internal links use descriptive anchor text", genericLinks.slice(0, 12).join("; "));
  }
}

async function main() {
  console.log(`Running internal link audit against ${baseUrl}`);
  const sitemapPaths = uniqueSorted(await getSitemapPaths());
  const pages = await crawlPages(sitemapPaths);

  checkCoreNavigation(pages);
  checkServicePages(pages);
  checkBlogPages(pages);
  checkOrphans(pages, sitemapPaths);
  checkGenericAnchorText(pages);
  printResults(pages.length);

  if (results.some((result) => result.level === "FAIL")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
