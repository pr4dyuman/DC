import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const DEFAULT_LIMIT = 100;
const CHECK_CONCURRENCY = 6;
const CHECK_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; AIBloggerInternalLinkAudit/1.0; +https://example.com/ai-blogger)";

function getArgValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function resolveOrigin(value) {
  if (!value || typeof value !== "string") return "";
  try {
    return new URL(value.trim()).origin;
  } catch {
    return "";
  }
}

function resolvePostSiteUrl(post) {
  return (
    resolveOrigin(post.canonicalUrl) ||
    resolveOrigin(post.brief?.sourceMode === "website" ? post.brief?.sourceValue : post.brief?.targetWebsiteUrl) ||
    ""
  );
}

function normalizeInternalHref(rawHref, siteUrl) {
  if (!rawHref || typeof rawHref !== "string") return "";
  try {
    const url = new URL(rawHref.trim(), siteUrl || "https://example.com");
    if (siteUrl && url.hostname.replace(/^www\./, "") !== new URL(siteUrl).hostname.replace(/^www\./, "")) {
      return "";
    }
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

function toAbsoluteHref(rawHref, siteUrl) {
  if (!rawHref || typeof rawHref !== "string") return "";
  try {
    const url = new URL(rawHref.trim(), siteUrl || "https://example.com");
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return rawHref.trim();
  }
}

function extractBodyInternalTargets(content, siteUrl) {
  const value = content || "";
  const targets = new Set();
  const patterns = [
    /\[[^\]]+\]\(([^)\s]+)\)/g,
    /href=["']([^"']+)["']/gi,
    /https?:\/\/[^\s)"']+/gi,
  ];

  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const rawHref = match[1] || match[0];
      const normalizedHref = normalizeInternalHref(rawHref, siteUrl);
      if (normalizedHref) {
        targets.add(normalizedHref);
      }
    }
  }

  return Array.from(targets);
}

function isHealthyStatus(status) {
  return (status >= 200 && status < 400) || status === 401 || status === 403 || status === 429;
}

async function fetchStatus(url, method) {
  const response = await fetch(url, {
    method,
    redirect: "follow",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: method === "HEAD" ? "*/*" : "text/html,application/xhtml+xml,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  });

  if (response.body) {
    await response.body.cancel().catch(() => undefined);
  }

  return { status: response.status, finalUrl: response.url };
}

async function checkHref(url) {
  if (!/^https?:\/\//i.test(url)) {
    return { url, status: "skipped", ok: true };
  }

  try {
    const head = await fetchStatus(url, "HEAD");
    if (isHealthyStatus(head.status)) {
      return { url, status: head.status, finalUrl: head.finalUrl, ok: true };
    }

    const get = await fetchStatus(url, "GET");
    return { url, status: get.status, finalUrl: get.finalUrl, ok: isHealthyStatus(get.status) };
  } catch (error) {
    return {
      url,
      status: "error",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkHrefs(urls) {
  const results = new Map();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex];
      nextIndex += 1;
      results.set(url, await checkHref(url));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CHECK_CONCURRENCY, urls.length) }, () => worker()),
  );

  return results;
}

function summarizePost(post, marketingSlugs) {
  const siteUrl = resolvePostSiteUrl(post);
  const storedLinks = Array.isArray(post.internalLinks) ? post.internalLinks : [];
  const storedTargets = storedLinks
    .map((link) => normalizeInternalHref(link.href, siteUrl))
    .filter(Boolean);
  const bodyTargets = extractBodyInternalTargets(post.content, siteUrl);
  const bodyTargetSet = new Set(bodyTargets);
  const storedTargetSet = new Set(storedTargets);
  const missingInBody = storedTargets.filter((href) => !bodyTargetSet.has(href));
  const untrackedBodyLinks = bodyTargets.filter((href) => !storedTargetSet.has(href));
  const publishedEntryMissing =
    post.status === "Published" &&
    post.publishedEntrySlug &&
    !marketingSlugs.has(post.publishedEntrySlug);

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    status: post.status,
    siteUrl,
    storedLinkCount: storedTargets.length,
    bodyLinkCount: bodyTargets.length,
    missingInBody,
    untrackedBodyLinks,
    publishedEntryMissing,
    hrefsToCheck: storedLinks
      .map((link) => toAbsoluteHref(link.href, siteUrl))
      .filter(Boolean),
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  const limit = Math.max(Number.parseInt(getArgValue("limit", String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT, 1);
  const json = hasFlag("json");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });

  await client.connect();
  const primaryDb = client.db(getArgValue("primary-db", "agency-os"));
  const marketingDb = client.db(getArgValue("marketing-db", "marketing-blog"));

  const [posts, marketingBlogs] = await Promise.all([
    primaryDb
      .collection("blogstudioposts")
      .find(
        {},
        {
          projection: {
            id: 1,
            slug: 1,
            title: 1,
            status: 1,
            canonicalUrl: 1,
            brief: 1,
            content: 1,
            internalLinks: 1,
            publishedEntrySlug: 1,
            updatedAt: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray(),
    marketingDb.collection("blogs").find({}, { projection: { slug: 1 } }).toArray(),
  ]);

  const marketingSlugs = new Set(marketingBlogs.map((blog) => blog.slug).filter(Boolean));
  const summaries = posts.map((post) => summarizePost(post, marketingSlugs));
  const hrefs = Array.from(new Set(summaries.flatMap((summary) => summary.hrefsToCheck)));
  const healthMap = await checkHrefs(hrefs);
  const report = summaries.map((summary) => {
    const brokenLinks = summary.hrefsToCheck
      .map((href) => healthMap.get(href))
      .filter((result) => result && !result.ok);

    return {
      ...summary,
      hrefsToCheck: undefined,
      brokenLinks,
      needsAttention:
        summary.missingInBody.length > 0 ||
        summary.untrackedBodyLinks.length > 0 ||
        summary.publishedEntryMissing ||
        brokenLinks.length > 0,
    };
  });

  await client.close();

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const attention = report.filter((item) => item.needsAttention);
  console.log(`AI Blogger internal-link audit: ${attention.length}/${report.length} post(s) need attention`);

  for (const item of attention) {
    console.log(`\n- ${item.title} (${item.status})`);
    console.log(`  slug: ${item.slug}`);
    if (item.publishedEntryMissing) {
      console.log("  issue: publishedEntrySlug is not present in the marketing blog database");
    }
    if (item.brokenLinks.length > 0) {
      console.log(`  broken links: ${item.brokenLinks.map((link) => `${link.url} [${link.status}]`).join(", ")}`);
    }
    if (item.missingInBody.length > 0) {
      console.log(`  tracked but missing in body: ${item.missingInBody.join(", ")}`);
    }
    if (item.untrackedBodyLinks.length > 0) {
      console.log(`  body links not tracked: ${item.untrackedBodyLinks.join(", ")}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
