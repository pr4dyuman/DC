import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { URL, URLSearchParams } from "node:url";

const DEFAULT_SITE_URL = process.env.GSC_SITE_URL || "sc-domain:digitalcorvids.com";
const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://digitalcorvids.com";
const DEFAULT_SCOPES = [
  // Full Search Console scope allows read reports and sitemap management.
  // It still does not allow Request Indexing for normal pages.
  "https://www.googleapis.com/auth/webmasters",
];
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEARCH_CONSOLE_API = "https://www.googleapis.com/webmasters/v3";
const URL_INSPECTION_API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const DEFAULT_TOKEN_FILE = ".tmp/gsc-token.json";
const DEFAULT_EXPORT_DIR = "exports/gsc";

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

function splitCsv(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePath(value) {
  return path.resolve(process.cwd(), value);
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toDateString(date);
}

function todayString() {
  return toDateString(new Date());
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

async function readJson(file) {
  const raw = await fs.readFile(resolvePath(file), "utf8");
  return JSON.parse(raw);
}

async function writeJson(file, value) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(resolvePath(file), `${JSON.stringify(value, null, 2)}\n`);
}

async function readLines(file) {
  const raw = await fs.readFile(resolvePath(file), "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getScopes() {
  const raw = process.env.GSC_SCOPES;
  return raw ? splitCsv(raw) : DEFAULT_SCOPES;
}

function getOAuthClientInfo(credentials) {
  const client = credentials.installed || credentials.web || credentials;
  if (!client.client_id) {
    throw new Error("OAuth credentials file is missing client_id.");
  }

  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    redirectUris: client.redirect_uris || [],
  };
}

async function getOAuthClient(credentialsFile) {
  try {
    const credentials = await readJson(credentialsFile);
    return getOAuthClientInfo(credentials);
  } catch {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (clientId) {
      return {
        clientId,
        clientSecret,
        redirectUris: [],
      };
    }

    throw new Error(
      `Unable to load OAuth client from ${credentialsFile}. ` +
        "Provide GSC_OAUTH_CLIENT_FILE or set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .env.",
    );
  }
}

async function getServiceAccountToken(keyFile) {
  const key = await readJson(keyFile);
  if (!key.client_email || !key.private_key) {
    throw new Error("Service account JSON must include client_email and private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: key.client_email,
      scope: getScopes().join(" "),
      aud: key.token_uri || TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(key.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Service account auth failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function refreshOAuthToken(tokenFile, credentialsFile) {
  const token = await readJson(tokenFile);
  if (token.access_token && token.expires_at && Date.now() < token.expires_at - 60_000) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new Error(`Token file ${tokenFile} is missing refresh_token. Run: npm run gsc:auth`);
  }

  const client = await getOAuthClient(credentialsFile);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret || "",
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth refresh failed: ${JSON.stringify(data)}`);
  }

  const nextToken = {
    ...token,
    ...data,
    refresh_token: data.refresh_token || token.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  };
  await writeJson(tokenFile, nextToken);
  return nextToken.access_token;
}

async function getAccessToken() {
  const serviceAccountFile = process.env.GSC_SERVICE_ACCOUNT_FILE || getArg("service-account");
  if (serviceAccountFile) {
    return getServiceAccountToken(serviceAccountFile);
  }

  const credentialsFile = process.env.GSC_OAUTH_CLIENT_FILE || getArg("client-file") || ".tmp/gsc-oauth-client.json";
  const tokenFile = process.env.GSC_TOKEN_FILE || getArg("token-file") || DEFAULT_TOKEN_FILE;
  return refreshOAuthToken(tokenFile, credentialsFile);
}

async function apiFetch(url, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function oauthAuth() {
  const credentialsFile = process.env.GSC_OAUTH_CLIENT_FILE || getArg("client-file") || ".tmp/gsc-oauth-client.json";
  const tokenFile = process.env.GSC_TOKEN_FILE || getArg("token-file") || DEFAULT_TOKEN_FILE;
  const client = await getOAuthClient(credentialsFile);
  const port = Number.parseInt(getArg("port", "8765"), 10);
  const redirectUri =
    getArg("redirect-uri") ||
    process.env.GSC_OAUTH_REDIRECT_URI?.trim() ||
    client.redirectUris.find((uri) => uri.includes(`:${port}`)) ||
    `http://127.0.0.1:${port}/oauth2callback`;
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getScopes().join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();

  console.log("Open this URL and approve access:");
  console.log(authUrl.toString());
  console.log(`\nWaiting for OAuth callback on ${redirectUri}`);

  const callbackUrl = new URL(redirectUri);
  const server = http.createServer();

  const code = await new Promise((resolve, reject) => {
    server.on("request", (request, response) => {
      const requestUrl = new URL(request.url || "/", redirectUri);
      if (requestUrl.pathname !== callbackUrl.pathname) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      if (requestUrl.searchParams.get("state") !== state) {
        response.writeHead(400);
        response.end("Invalid OAuth state.");
        reject(new Error("Invalid OAuth state."));
        return;
      }

      const authCode = requestUrl.searchParams.get("code");
      if (!authCode) {
        response.writeHead(400);
        response.end("Missing OAuth code.");
        reject(new Error("Missing OAuth code."));
        return;
      }

      response.writeHead(200, { "content-type": "text/html" });
      response.end("<p>Search Console authorization complete. You can close this tab.</p>");
      resolve(authCode);
    });

    server.listen(port, callbackUrl.hostname, () => {
      if (hasFlag("open")) {
        const opener =
          process.platform === "win32"
            ? "start"
            : process.platform === "darwin"
              ? "open"
              : "xdg-open";
        import("node:child_process").then(({ exec }) => exec(`${opener} "${authUrl.toString()}"`));
      }
    });

    server.on("error", reject);
  }).finally(() => {
    server.close();
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    if (data?.error === "deleted_client") {
      throw new Error(
        "OAuth token exchange failed: deleted_client. " +
          "The Google OAuth client ID is deleted. Create a new OAuth client and either " +
          "save its JSON to .tmp/gsc-oauth-client.json or update GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET.",
      );
    }

    throw new Error(`OAuth token exchange failed: ${JSON.stringify(data)}`);
  }

  const token = {
    ...data,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  };
  await writeJson(tokenFile, token);
  console.log(`Saved token to ${tokenFile}`);
}

async function listSites() {
  const data = await apiFetch(`${SEARCH_CONSOLE_API}/sites`);
  console.log(JSON.stringify(data.siteEntry || [], null, 2));
}

async function listSitemaps(siteUrl = DEFAULT_SITE_URL) {
  const data = await apiFetch(`${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps`);
  console.log(JSON.stringify(data.sitemap || [], null, 2));
}

async function submitSitemap(siteUrl = DEFAULT_SITE_URL, sitemapUrl = getArg("sitemap")) {
  if (!sitemapUrl) {
    throw new Error("Provide --sitemap=https://digitalcorvids.com/sitemap.xml");
  }
  await apiFetch(
    `${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
    { method: "PUT" },
  );
  console.log(`Submitted sitemap: ${sitemapUrl}`);
}

async function deleteSitemap(siteUrl = DEFAULT_SITE_URL, sitemapUrl = getArg("sitemap")) {
  if (!sitemapUrl) {
    throw new Error("Provide --sitemap=https://www.digitalcorvids.com/sitemap.xml");
  }
  await apiFetch(
    `${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
    { method: "DELETE" },
  );
  console.log(`Deleted sitemap from GSC: ${sitemapUrl}`);
}

async function searchAnalyticsQuery({
  siteUrl = DEFAULT_SITE_URL,
  startDate = getArg("start-date", dateDaysAgo(Number.parseInt(getArg("days", "90"), 10))),
  endDate = getArg("end-date", todayString()),
  dimensions = splitCsv(getArg("dimensions", "page,query")),
  rowLimit = Number.parseInt(getArg("limit", "25000"), 10),
  page = getArg("page"),
  query = getArg("query"),
} = {}) {
  const filters = [];
  if (page) {
    filters.push({ dimension: "page", operator: "equals", expression: toAbsoluteUrl(page) });
  }
  if (query) {
    filters.push({ dimension: "query", operator: "contains", expression: query });
  }

  const body = {
    startDate,
    endDate,
    dimensions,
    rowLimit,
    searchType: "web",
    ...(filters.length
      ? {
          dimensionFilterGroups: [
            {
              groupType: "and",
              filters,
            },
          ],
        }
      : {}),
  };

  return apiFetch(`${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function printPerformance() {
  const data = await searchAnalyticsQuery();
  const dimensions = splitCsv(getArg("dimensions", "page,query"));
  const rows = (data.rows || []).map((row) => ({
    ...Object.fromEntries(dimensions.map((dimension, index) => [dimension, row.keys?.[index] || ""])),
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));

  const output = getArg("output");
  if (output) {
    await ensureDir(path.dirname(output));
    await fs.writeFile(
      resolvePath(output),
      toCsv(rows, [...dimensions, "clicks", "impressions", "ctr", "position"]),
    );
    console.log(`Wrote ${rows.length} rows to ${output}`);
    return;
  }

  console.table(rows.slice(0, Number.parseInt(getArg("show", "50"), 10)));
}

async function inspectUrl(inspectionUrl, siteUrl = DEFAULT_SITE_URL) {
  const data = await apiFetch(URL_INSPECTION_API, {
    method: "POST",
    body: JSON.stringify({
      inspectionUrl: toAbsoluteUrl(inspectionUrl),
      siteUrl,
      languageCode: getArg("language", "en-US"),
    }),
  });
  return data.inspectionResult || {};
}

function flattenInspection(url, result) {
  const index = result.indexStatusResult || {};
  const rich = result.richResultsResult || {};
  const mobile = result.mobileUsabilityResult || {};
  return {
    url,
    verdict: index.verdict || "",
    coverageState: index.coverageState || "",
    indexingState: index.indexingState || "",
    robotsTxtState: index.robotsTxtState || "",
    pageFetchState: index.pageFetchState || "",
    lastCrawlTime: index.lastCrawlTime || "",
    userCanonical: index.userCanonical || "",
    googleCanonical: index.googleCanonical || "",
    crawledAs: index.crawledAs || "",
    sitemap: Array.isArray(index.sitemap) ? index.sitemap.join(" | ") : "",
    referringUrls: Array.isArray(index.referringUrls) ? index.referringUrls.join(" | ") : "",
    richResultsVerdict: rich.verdict || "",
    mobileUsabilityVerdict: mobile.verdict || "",
  };
}

async function printInspection() {
  const siteUrl = getArg("site-url", DEFAULT_SITE_URL);
  const urls = [
    ...getArgs("url").flatMap((value) => splitCsv(value)),
    ...(getArg("urls-file") ? await readLines(getArg("urls-file")) : []),
  ];
  if (urls.length === 0) {
    throw new Error("Provide --url=/path or --urls-file=path/to/urls.txt");
  }

  const rows = [];
  for (const url of urls) {
    console.log(`Inspecting ${url}`);
    try {
      rows.push(flattenInspection(toAbsoluteUrl(url), await inspectUrl(url, siteUrl)));
    } catch (error) {
      rows.push({ url: toAbsoluteUrl(url), error: error.message });
    }
  }

  const output = getArg("output");
  if (output) {
    await ensureDir(path.dirname(output));
    await fs.writeFile(
      resolvePath(output),
      toCsv(rows, [
        "url",
        "verdict",
        "coverageState",
        "indexingState",
        "robotsTxtState",
        "pageFetchState",
        "lastCrawlTime",
        "userCanonical",
        "googleCanonical",
        "crawledAs",
        "sitemap",
        "referringUrls",
        "richResultsVerdict",
        "mobileUsabilityVerdict",
        "error",
      ]),
    );
    console.log(`Wrote ${rows.length} rows to ${output}`);
    return;
  }

  console.table(rows);
}

async function fetchSitemapUrls(sitemapUrl = `${DEFAULT_BASE_URL.replace(/\/+$/, "")}/sitemap.xml`) {
  const response = await fetch(sitemapUrl, {
    headers: { accept: "application/xml,text/xml,*/*" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Unable to fetch sitemap ${sitemapUrl}: ${response.status}`);
  }
  return [...text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

async function liveCheck(url) {
  const absoluteUrl = toAbsoluteUrl(url);
  let response = await fetch(absoluteUrl, { method: "HEAD", redirect: "manual" });
  if (response.status === 405) {
    response = await fetch(absoluteUrl, { method: "GET", redirect: "manual" });
  }

  const finalResponse = await fetch(absoluteUrl, { method: "HEAD", redirect: "follow" }).catch(() => null);
  return {
    url: absoluteUrl,
    status: response.status,
    location: response.headers.get("location") || "",
    finalUrl: finalResponse?.url || "",
    finalStatus: finalResponse?.status || "",
  };
}

function groupPerformanceRows(rows) {
  const byPage = new Map();
  for (const row of rows) {
    const page = row.keys?.[0] || "";
    const query = row.keys?.[1] || "";
    if (!byPage.has(page)) {
      byPage.set(page, {
        page,
        clicks: 0,
        impressions: 0,
        weightedPosition: 0,
        queries: [],
      });
    }
    const item = byPage.get(page);
    item.clicks += row.clicks || 0;
    item.impressions += row.impressions || 0;
    item.weightedPosition += (row.position || 0) * (row.impressions || 0);
    item.queries.push({
      query,
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    });
  }

  return [...byPage.values()].map((item) => ({
    ...item,
    ctr: item.impressions ? item.clicks / item.impressions : 0,
    position: item.impressions ? item.weightedPosition / item.impressions : 0,
    queries: item.queries.sort((left, right) => right.impressions - left.impressions),
  }));
}

async function buildReport() {
  const siteUrl = getArg("site-url", DEFAULT_SITE_URL);
  const days = Number.parseInt(getArg("days", "90"), 10);
  const startDate = getArg("start-date", dateDaysAgo(days));
  const endDate = getArg("end-date", todayString());
  const exportDir = getArg("output-dir", DEFAULT_EXPORT_DIR);
  const inspectLimit = Number.parseInt(getArg("inspect-limit", "25"), 10);
  const sitemapUrl = getArg("sitemap", `${DEFAULT_BASE_URL.replace(/\/+$/, "")}/sitemap.xml`);
  const runId = timestamp();
  const reportDir = path.join(exportDir, runId);
  await ensureDir(reportDir);

  console.log("Fetching sitemap URLs...");
  const sitemapUrls = await fetchSitemapUrls(sitemapUrl);
  await fs.writeFile(resolvePath(path.join(reportDir, "sitemap-urls.txt")), `${sitemapUrls.join("\n")}\n`);

  console.log("Fetching Search Analytics page/query data...");
  const performance = await searchAnalyticsQuery({
    siteUrl,
    startDate,
    endDate,
    dimensions: ["page", "query"],
    rowLimit: Number.parseInt(getArg("limit", "25000"), 10),
  });
  const performanceRows = performance.rows || [];
  const performanceCsvRows = performanceRows.map((row) => ({
    page: row.keys?.[0] || "",
    query: row.keys?.[1] || "",
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
  await fs.writeFile(
    resolvePath(path.join(reportDir, "search-performance.csv")),
    toCsv(performanceCsvRows, ["page", "query", "clicks", "impressions", "ctr", "position"]),
  );

  const pages = groupPerformanceRows(performanceRows);
  const lowCtrPages = pages
    .filter((page) => page.impressions >= Number.parseInt(getArg("min-impressions", "10"), 10))
    .sort((left, right) => right.impressions - left.impressions)
    .slice(0, 25);

  const inspectionTargets = [
    ...new Set([
      ...sitemapUrls.slice(0, inspectLimit),
      ...lowCtrPages.slice(0, 10).map((page) => page.page),
      ...(getArg("urls-file") ? await readLines(getArg("urls-file")) : []),
    ]),
  ].slice(0, inspectLimit);

  console.log(`Running URL Inspection for ${inspectionTargets.length} URL(s)...`);
  const inspectionRows = [];
  for (const url of inspectionTargets) {
    try {
      inspectionRows.push(flattenInspection(url, await inspectUrl(url, siteUrl)));
    } catch (error) {
      inspectionRows.push({ url, error: error.message });
    }
  }
  await fs.writeFile(
    resolvePath(path.join(reportDir, "url-inspection.csv")),
    toCsv(inspectionRows, [
      "url",
      "verdict",
      "coverageState",
      "indexingState",
      "robotsTxtState",
      "pageFetchState",
      "lastCrawlTime",
      "userCanonical",
      "googleCanonical",
      "crawledAs",
      "sitemap",
      "referringUrls",
      "richResultsVerdict",
      "mobileUsabilityVerdict",
      "error",
    ]),
  );

  console.log("Running live checks for known legacy URLs...");
  const legacyUrls = [
    "/index.html",
    "/Aboutus.html",
    "/Contactus/Contactus.html",
    "/search-engine-optimization.html",
    "/influencer-marketing.html",
    "/social-media-marketing.html",
    "/video-production.html",
    "https://www.digitalcorvids.com/blog",
  ];
  const liveRows = [];
  for (const url of legacyUrls) {
    try {
      liveRows.push(await liveCheck(url));
    } catch (error) {
      liveRows.push({ url: toAbsoluteUrl(url), error: error.message });
    }
  }
  await fs.writeFile(
    resolvePath(path.join(reportDir, "live-url-checks.csv")),
    toCsv(liveRows, ["url", "status", "location", "finalUrl", "finalStatus", "error"]),
  );

  const markdown = [
    `# Google Search Console Report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Property: \`${siteUrl}\``,
    `Date range: ${startDate} to ${endDate}`,
    `Sitemap URLs found: ${sitemapUrls.length}`,
    ``,
    `## Low CTR / High Impression Pages`,
    ``,
    `| Page | Clicks | Impressions | CTR | Avg Position | Top Queries |`,
    `|---|---:|---:|---:|---:|---|`,
    ...lowCtrPages.map((page) => {
      const topQueries = page.queries
        .slice(0, 3)
        .map((query) => `${query.query} (${query.impressions} imp)`)
        .join("; ");
      return `| ${page.page} | ${page.clicks} | ${page.impressions} | ${(page.ctr * 100).toFixed(2)}% | ${page.position.toFixed(1)} | ${topQueries} |`;
    }),
    ``,
    `## URL Inspection Summary`,
    ``,
    `| URL | Verdict | Coverage | Last Crawl | User Canonical | Google Canonical | Error |`,
    `|---|---|---|---|---|---|---|`,
    ...inspectionRows.map(
      (row) =>
        `| ${row.url} | ${row.verdict || ""} | ${row.coverageState || ""} | ${row.lastCrawlTime || ""} | ${row.userCanonical || ""} | ${row.googleCanonical || ""} | ${row.error || ""} |`,
    ),
    ``,
    `## Live Legacy URL Checks`,
    ``,
    `| URL | Status | Location | Final URL | Final Status |`,
    `|---|---:|---|---|---:|`,
    ...liveRows.map(
      (row) => `| ${row.url} | ${row.status || ""} | ${row.location || ""} | ${row.finalUrl || ""} | ${row.finalStatus || ""} |`,
    ),
    ``,
    `## Manual Work Still Required`,
    ``,
    `- Search Console API cannot click Request Indexing for normal blog/service pages.`,
    `- Use GSC UI for Request Indexing after quota resets.`,
    `- Treat old URL coverage labels as stale if live checks show 308 redirects.`,
  ].join("\n");

  await fs.writeFile(resolvePath(path.join(reportDir, "report.md")), markdown);
  console.log(`Report written to ${reportDir}`);
}

function printHelp() {
  console.log(`
Google Search Console helper

Setup:
  npm run gsc:auth -- --open
  # Uses GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET from .env, or pass:
  npm run gsc:auth -- --client-file=.tmp/gsc-oauth-client.json --open

Commands:
  npm run gsc -- sites
  npm run gsc -- sitemaps --site-url=sc-domain:digitalcorvids.com
  npm run gsc -- sitemap:submit --sitemap=https://digitalcorvids.com/sitemap.xml
  npm run gsc -- sitemap:delete --sitemap=https://www.digitalcorvids.com/sitemap.xml
  npm run gsc -- performance --dimensions=page,query --days=90 --output=exports/gsc/performance.csv
  npm run gsc -- performance --page=/blog/example-slug --dimensions=query,country,device --days=90
  npm run gsc -- inspect --url=/blog --url=/contact --output=exports/gsc/inspection.csv
  npm run gsc -- report --days=90 --inspect-limit=25

Environment:
  GSC_SITE_URL=sc-domain:digitalcorvids.com
  GSC_OAUTH_CLIENT_FILE=.tmp/gsc-oauth-client.json
  GSC_TOKEN_FILE=.tmp/gsc-token.json
  GSC_SERVICE_ACCOUNT_FILE=.tmp/gsc-service-account.json
`);
}

async function main() {
  if (command === "help" || hasFlag("help")) {
    printHelp();
    return;
  }

  if (command === "auth") return oauthAuth();
  if (command === "sites") return listSites();
  if (command === "sitemaps") return listSitemaps(getArg("site-url", DEFAULT_SITE_URL));
  if (command === "sitemap:submit") return submitSitemap(getArg("site-url", DEFAULT_SITE_URL));
  if (command === "sitemap:delete") return deleteSitemap(getArg("site-url", DEFAULT_SITE_URL));
  if (command === "performance") return printPerformance();
  if (command === "inspect") return printInspection();
  if (command === "report") return buildReport();

  throw new Error(`Unknown command: ${command}. Run: npm run gsc -- help`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
