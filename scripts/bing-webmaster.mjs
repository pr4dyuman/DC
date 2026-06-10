import { config as loadEnv } from "dotenv";

import fs from "node:fs/promises";
import path from "node:path";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const DEFAULT_SITE_URL = process.env.BING_SITE_URL || "https://digitalcorvids.com";
const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://digitalcorvids.com";
const DEFAULT_EXPORT_DIR = "exports/bing";
const API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith("--")) || "help";

function getArg(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const value = args.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function getArgs(name) {
  const prefix = `--${name}=`;
  return args.filter((arg) => arg.startsWith(prefix)).map((arg) => arg.slice(prefix.length));
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function resolvePath(value) {
  return path.resolve(process.cwd(), value);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function toAbsoluteUrl(value, baseUrl = DEFAULT_BASE_URL) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const base = baseUrl.replace(/\/+$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
}

async function ensureDir(dir) {
  await fs.mkdir(resolvePath(dir), { recursive: true });
}

async function readLines(file) {
  const raw = await fs.readFile(resolvePath(file), "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function readSitemapUrls(sitemapUrl) {
  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`Unable to load sitemap ${sitemapUrl} (${response.status})`);
  }

  const xml = await response.text();
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1].replaceAll("&amp;", "&").trim()
  );
}

function getApiKey() {
  const apiKey = process.env.BING_WEBMASTER_API_KEY || getArg("api-key");
  if (!apiKey) {
    throw new Error(
      "Missing Bing Webmaster API key. Add BING_WEBMASTER_API_KEY to .env.local or pass --api-key=..."
    );
  }
  return apiKey;
}

function getSiteUrl() {
  return getArg("site-url", DEFAULT_SITE_URL);
}

function normalizeRows(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function unwrapResponse(json) {
  return json?.d ?? json;
}

function parseBingDate(value) {
  if (!value || typeof value !== "string") {
    return value ?? "";
  }

  const match = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(value);
  if (!match) {
    return value;
  }

  return new Date(Number(match[1])).toISOString();
}

function cleanValue(value) {
  if (Array.isArray(value)) {
    return value.map(cleanValue);
  }
  if (value && typeof value === "object") {
    return cleanObject(value);
  }
  return parseBingDate(value);
}

function cleanObject(value) {
  const result = {};
  for (const [key, item] of Object.entries(value || {})) {
    if (key === "__type") {
      continue;
    }
    result[key] = cleanValue(item);
  }
  return result;
}

function decodeCrawlIssues(value) {
  const flags = [
    [1, "Code301"],
    [2, "Code302"],
    [4, "Code4xx"],
    [8, "Code5xx"],
    [16, "BlockedByRobotsTxt"],
    [32, "ContainsMalware"],
    [64, "ImportantUrlBlockedByRobotsTxt"],
    [128, "DnsErrors"],
    [256, "TimeOutErrors"],
  ];

  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) {
    return "None";
  }

  return flags
    .filter(([bit]) => (number & bit) === bit)
    .map(([, label]) => label)
    .join("|");
}

async function bingRequest(method, params = {}, { httpMethod = "GET", body } = {}) {
  const apiKey = getApiKey();
  const url = new URL(`${API_BASE}/${method}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    method: httpMethod,
    headers: body ? { "content-type": "application/json; charset=utf-8" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!response.ok) {
    const message = json?.Message || json?.raw || response.statusText;
    throw new Error(`${method} failed (${response.status}): ${message}`);
  }

  return cleanValue(unwrapResponse(json));
}

async function writeOutput(rows, columns, fallbackName) {
  const output = getArg("output");
  if (!output) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const target = output === "auto" ? `${DEFAULT_EXPORT_DIR}/${fallbackName}-${timestamp()}.csv` : output;
  await ensureDir(path.dirname(target));

  if (target.endsWith(".json")) {
    await fs.writeFile(resolvePath(target), `${JSON.stringify(rows, null, 2)}\n`);
  } else {
    await fs.writeFile(resolvePath(target), `${toCsv(normalizeRows(rows), columns)}\n`);
  }

  console.log(`Wrote ${target}`);
}

async function commandSites() {
  const rows = normalizeRows(await bingRequest("GetUserSites"));
  await writeOutput(rows, ["Url", "IsVerified", "AuthenticationCode", "DnsVerificationCode"], "sites");
}

async function commandFeeds() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetFeeds", { siteUrl }));
  await writeOutput(rows, ["Url", "LastCrawled", "Status", "Submitted", "Type"], "feeds");
}

async function commandFeedDetails() {
  const siteUrl = getSiteUrl();
  const feedUrl = getArg("feed") || getArg("sitemap") || `${siteUrl.replace(/\/+$/, "")}/sitemap.xml`;
  const rows = normalizeRows(await bingRequest("GetFeedDetails", { siteUrl, feedUrl }));
  await writeOutput(rows, ["Url", "LastCrawled", "Status", "Submitted", "Type"], "feed-details");
}

async function commandCrawlIssues() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetCrawlIssues", { siteUrl })).map((row) => ({
    ...row,
    IssueLabels: decodeCrawlIssues(row.Issues),
  }));

  await writeOutput(rows, ["Url", "HttpCode", "Issues", "IssueLabels", "InLinks"], "crawl-issues");
}

async function commandCrawlStats() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetCrawlStats", { siteUrl }));
  await writeOutput(rows, Object.keys(rows[0] || {}), "crawl-stats");
}

async function commandTrafficStats() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetRankAndTrafficStats", { siteUrl }));
  await writeOutput(rows, Object.keys(rows[0] || {}), "traffic-stats");
}

async function commandFetchedUrls() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetFetchedUrls", { siteUrl }));
  await writeOutput(rows, Object.keys(rows[0] || {}), "fetched-urls");
}

async function commandSimpleSiteRead(method, fallbackName) {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest(method, { siteUrl }));
  await writeOutput(rows, Object.keys(rows[0] || {}), fallbackName);
}

async function commandLinkCounts() {
  const siteUrl = getSiteUrl();
  const page = getArg("page", "0");
  const rows = normalizeRows(await bingRequest("GetLinkCounts", { siteUrl, page }));
  await writeOutput(rows, Object.keys(rows[0] || {}), "link-counts");
}

async function commandUrlLinks() {
  const siteUrl = getSiteUrl();
  const input = getArg("url");
  if (!input) {
    throw new Error("Pass --url=/path");
  }
  const url = toAbsoluteUrl(input);
  const page = getArg("page", "0");
  const rows = normalizeRows(await bingRequest("GetUrlLinks", { siteUrl, url, page }));
  await writeOutput(rows, Object.keys(rows[0] || {}), "url-links");
}

async function commandUrlInfo() {
  const siteUrl = getSiteUrl();
  const urls = [...getArgs("url")];
  const file = getArg("file");
  if (file) {
    urls.push(...(await readLines(file)));
  }
  if (hasFlag("sitemap")) {
    const sitemapUrl = getArg("sitemap-url", `${siteUrl.replace(/\/+$/, "")}/sitemap.xml`);
    urls.push(...(await readSitemapUrls(sitemapUrl)));
  }
  if (!urls.length) {
    throw new Error("Pass at least one --url=/path, --file=urls.txt, or --sitemap");
  }

  const rows = [];
  const uniqueUrls = [...new Set(urls.map((input) => toAbsoluteUrl(input)))];
  const concurrency = Math.max(1, Math.min(Number(getArg("concurrency", "5")) || 5, 10));
  for (let index = 0; index < uniqueUrls.length; index += concurrency) {
    const batch = uniqueUrls.slice(index, index + concurrency);
    rows.push(
      ...(await Promise.all(
        batch.map(async (url) => {
          const row = await bingRequest("GetUrlInfo", { siteUrl, url });
          return { RequestedUrl: url, ...row };
        })
      ))
    );
  }

  await writeOutput(
    rows,
    [
      "RequestedUrl",
      "Url",
      "HttpStatus",
      "IsPage",
      "DiscoveryDate",
      "LastCrawledDate",
      "AnchorCount",
      "DocumentSize",
      "TotalChildUrlCount",
    ],
    "url-info"
  );
}

async function commandPageStats() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetPageStats", { siteUrl }));
  await writeOutput(
    rows,
    ["Query", "Date", "Impressions", "Clicks", "AvgImpressionPosition", "AvgClickPosition"],
    "page-stats"
  );
}

async function commandQueryStats() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetQueryStats", { siteUrl }));
  await writeOutput(
    rows,
    ["Query", "Date", "Impressions", "Clicks", "AvgImpressionPosition", "AvgClickPosition"],
    "query-stats"
  );
}

async function commandPageQueryStats() {
  const siteUrl = getSiteUrl();
  const input = getArg("url");
  if (!input) {
    throw new Error("Pass --url=/path");
  }
  const page = toAbsoluteUrl(input);

  const rows = normalizeRows(await bingRequest("GetPageQueryStats", { siteUrl, page }));
  await writeOutput(
    rows,
    ["Query", "Date", "Impressions", "Clicks", "AvgImpressionPosition", "AvgClickPosition"],
    "page-query-stats"
  );
}

async function commandQuota() {
  const siteUrl = getSiteUrl();
  const rows = normalizeRows(await bingRequest("GetUrlSubmissionQuota", { siteUrl }));
  await writeOutput(rows, ["DailyQuota", "MonthlyQuota", "UrlSubmissionQuota", "SubmissionsLeft"], "quota");
}

async function commandSubmitFeed() {
  const siteUrl = getSiteUrl();
  const feedUrl = getArg("feed") || getArg("sitemap") || `${siteUrl.replace(/\/+$/, "")}/sitemap.xml`;
  await bingRequest("SubmitFeed", {}, { httpMethod: "POST", body: { siteUrl, feedUrl } });
  console.log(`Submitted feed: ${feedUrl}`);
}

async function commandSubmitUrl() {
  const siteUrl = getSiteUrl();
  const input = getArg("url");
  if (!input) {
    throw new Error("Pass --url=/path");
  }
  const url = toAbsoluteUrl(input);

  await bingRequest("SubmitUrl", {}, { httpMethod: "POST", body: { siteUrl, url } });
  console.log(`Submitted URL: ${url}`);
}

async function commandSubmitBatch() {
  const siteUrl = getSiteUrl();
  const urls = [...getArgs("url")];
  const file = getArg("file");
  if (file) {
    urls.push(...(await readLines(file)));
  }
  if (hasFlag("sitemap")) {
    const sitemapUrl = getArg("sitemap-url", `${siteUrl.replace(/\/+$/, "")}/sitemap.xml`);
    urls.push(...(await readSitemapUrls(sitemapUrl)));
  }
  if (!urls.length) {
    throw new Error("Pass --url=/path, --file=urls.txt, or --sitemap");
  }

  let urlList = [...new Set(urls.map((url) => toAbsoluteUrl(url)))];
  if (hasFlag("only-never-crawled")) {
    const records = [];
    const concurrency = 5;
    for (let index = 0; index < urlList.length; index += concurrency) {
      const batch = urlList.slice(index, index + concurrency);
      records.push(
        ...(await Promise.all(
          batch.map(async (url) => ({
            url,
            info: await bingRequest("GetUrlInfo", { siteUrl, url }),
          }))
        ))
      );
    }
    urlList = records
      .filter(({ info }) => !info?.LastCrawledDate || info.LastCrawledDate.startsWith("0001-"))
      .map(({ url }) => url);
  }

  const limit = Number(getArg("limit", "0")) || 0;
  if (limit > 0) {
    urlList = urlList.slice(0, limit);
  }
  if (!urlList.length) {
    console.log("No URLs matched the submission filters.");
    return;
  }

  await bingRequest("SubmitUrlBatch", {}, { httpMethod: "POST", body: { siteUrl, urlList } });
  console.log(`Submitted ${urlList.length} URLs`);
  for (const url of urlList) {
    console.log(`- ${url}`);
  }
}

async function commandIndexNow() {
  let key = process.env.INDEXNOW_KEY || getArg("key");
  if (!key) {
    try {
      key = (await fs.readFile(resolvePath("public/indexnow-key.txt"), "utf8")).trim();
    } catch {
      // The explicit error below explains the supported setup options.
    }
  }
  if (!key) {
    throw new Error(
      "Missing IndexNow key. Add public/indexnow-key.txt, set INDEXNOW_KEY, or pass --key=..."
    );
  }

  const host = getArg("host", new URL(DEFAULT_BASE_URL).host);
  const keyLocation = getArg("key-location", `https://${host}/indexnow-key.txt`);
  const urls = [...getArgs("url")];
  const file = getArg("file");
  if (file) {
    urls.push(...(await readLines(file)));
  }
  if (hasFlag("sitemap")) {
    const sitemapUrl = getArg("sitemap-url", `${DEFAULT_BASE_URL.replace(/\/+$/, "")}/sitemap.xml`);
    urls.push(...(await readSitemapUrls(sitemapUrl)));
  }
  if (!urls.length) {
    throw new Error("Pass --url=/path, --file=urls.txt, or --sitemap");
  }

  const urlList = [...new Set(urls.map((url) => toAbsoluteUrl(url)))];
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
  });

  if (!response.ok) {
    throw new Error(`IndexNow failed (${response.status}): ${await response.text()}`);
  }

  console.log(`IndexNow accepted ${urlList.length} URLs for ${host}`);
}

async function commandReport() {
  const siteUrl = getSiteUrl();
  const exportDir = getArg("dir", DEFAULT_EXPORT_DIR);
  await ensureDir(exportDir);

  const [
    sites,
    feeds,
    crawlIssues,
    crawlStats,
    crawlSettings,
    blockedUrls,
    queryParameters,
    countrySettings,
    linkCounts,
    trafficStats,
    pageStats,
    queryStats,
    quota,
  ] = await Promise.all([
    bingRequest("GetUserSites"),
    bingRequest("GetFeeds", { siteUrl }),
    bingRequest("GetCrawlIssues", { siteUrl }),
    bingRequest("GetCrawlStats", { siteUrl }),
    bingRequest("GetCrawlSettings", { siteUrl }),
    bingRequest("GetBlockedUrls", { siteUrl }),
    bingRequest("GetQueryParameters", { siteUrl }),
    bingRequest("GetCountryRegionSettings", { siteUrl }),
    bingRequest("GetLinkCounts", { siteUrl, page: "0" }),
    bingRequest("GetRankAndTrafficStats", { siteUrl }),
    bingRequest("GetPageStats", { siteUrl }),
    bingRequest("GetQueryStats", { siteUrl }),
    bingRequest("GetUrlSubmissionQuota", { siteUrl }),
    ]);

  const normalizedCrawlIssues = normalizeRows(crawlIssues).map((row) => ({
    ...row,
    IssueLabels: decodeCrawlIssues(row.Issues),
  }));

  const bundle = {
    generatedAt: new Date().toISOString(),
    siteUrl,
    sites: normalizeRows(sites),
    feeds: normalizeRows(feeds),
    crawlIssues: normalizedCrawlIssues,
    crawlStats: normalizeRows(crawlStats),
    crawlSettings: normalizeRows(crawlSettings),
    blockedUrls: normalizeRows(blockedUrls),
    queryParameters: normalizeRows(queryParameters),
    countrySettings: normalizeRows(countrySettings),
    linkCounts: normalizeRows(linkCounts),
    trafficStats: normalizeRows(trafficStats),
    pageStats: normalizeRows(pageStats),
    queryStats: normalizeRows(queryStats),
    quota,
  };

  const jsonFile = `${exportDir}/bing-report-${timestamp()}.json`;
  await fs.writeFile(resolvePath(jsonFile), `${JSON.stringify(bundle, null, 2)}\n`);

  await fs.writeFile(
    resolvePath(`${exportDir}/bing-crawl-issues-${timestamp()}.csv`),
    `${toCsv(normalizedCrawlIssues, ["Url", "HttpCode", "Issues", "IssueLabels", "InLinks"])}\n`
  );

  console.log(`Wrote ${jsonFile}`);
  console.log(
    `Summary: sites=${bundle.sites.length}, feeds=${bundle.feeds.length}, crawlIssues=${bundle.crawlIssues.length}, crawlStats=${bundle.crawlStats.length}, trafficStats=${bundle.trafficStats.length}, topPages=${bundle.pageStats.length}, topQueries=${bundle.queryStats.length}`
  );
}

function printHelp() {
  console.log(`Bing Webmaster helper

Setup:
  Add BING_WEBMASTER_API_KEY to .env.local
  Optional: BING_SITE_URL=https://digitalcorvids.com
  Optional for IndexNow: INDEXNOW_KEY=<key>

Read-only commands:
  npm run bing -- sites
  npm run bing -- feeds
  npm run bing -- feed-details --sitemap=https://digitalcorvids.com/sitemap.xml
  npm run bing -- crawl-issues --output=auto
  npm run bing -- crawl-stats --output=auto
  npm run bing -- traffic-stats --output=auto
  npm run bing -- fetched-urls --output=auto
  npm run bing -- crawl-settings
  npm run bing -- blocked-urls --output=auto
  npm run bing -- query-parameters --output=auto
  npm run bing -- country-settings --output=auto
  npm run bing -- link-counts --output=auto
  npm run bing -- url-links --url=/portfolio --output=auto
  npm run bing -- url-info --url=/portfolio --url=/blog --output=auto
  npm run bing -- url-info --sitemap --output=auto
  npm run bing -- page-stats --output=auto
  npm run bing -- query-stats --output=auto
  npm run bing -- page-query-stats --url=/blog/example-slug --output=auto
  npm run bing -- quota
  npm run bing -- report

Submission commands:
  npm run bing -- submit-feed --sitemap=https://digitalcorvids.com/sitemap.xml
  npm run bing -- submit-url --url=/portfolio
  npm run bing -- submit-batch --file=exports/urls-to-submit.txt
  npm run bing -- submit-batch --sitemap --only-never-crawled
  npm run bing -- indexnow --url=/portfolio
  npm run bing -- indexnow --sitemap
`);
}

async function main() {
  if (hasFlag("help")) {
    printHelp();
    return;
  }

  switch (command) {
    case "help":
      printHelp();
      break;
    case "sites":
      await commandSites();
      break;
    case "feeds":
      await commandFeeds();
      break;
    case "feed-details":
      await commandFeedDetails();
      break;
    case "crawl-issues":
      await commandCrawlIssues();
      break;
    case "crawl-stats":
      await commandCrawlStats();
      break;
    case "traffic-stats":
      await commandTrafficStats();
      break;
    case "fetched-urls":
      await commandFetchedUrls();
      break;
    case "crawl-settings":
      await commandSimpleSiteRead("GetCrawlSettings", "crawl-settings");
      break;
    case "blocked-urls":
      await commandSimpleSiteRead("GetBlockedUrls", "blocked-urls");
      break;
    case "query-parameters":
      await commandSimpleSiteRead("GetQueryParameters", "query-parameters");
      break;
    case "country-settings":
      await commandSimpleSiteRead("GetCountryRegionSettings", "country-settings");
      break;
    case "link-counts":
      await commandLinkCounts();
      break;
    case "url-links":
      await commandUrlLinks();
      break;
    case "url-info":
      await commandUrlInfo();
      break;
    case "page-stats":
      await commandPageStats();
      break;
    case "query-stats":
      await commandQueryStats();
      break;
    case "page-query-stats":
      await commandPageQueryStats();
      break;
    case "quota":
      await commandQuota();
      break;
    case "submit-feed":
      await commandSubmitFeed();
      break;
    case "submit-url":
      await commandSubmitUrl();
      break;
    case "submit-batch":
      await commandSubmitBatch();
      break;
    case "indexnow":
      await commandIndexNow();
      break;
    case "report":
      await commandReport();
      break;
    default:
      throw new Error(`Unknown command: ${command}. Run: npm run bing -- help`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
