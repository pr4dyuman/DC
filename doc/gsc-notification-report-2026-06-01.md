# GSC Notification Report - digitalcorvids.com

Generated: June 1, 2026

Scope: three Google Search Console notifications received on June 1, 2026.

Important constraint: no indexing request, sitemap resubmission, or validation action was performed during this review.

## Data Sources Used

- Latest successful GSC API export: `exports/gsc/2026-05-31T18-31-10/`
- Live sitemap check: `https://digitalcorvids.com/sitemap.xml`
- Live HTTP/header checks for canonical, www, legacy, favicon, and static-asset URLs
- Local SEO QA and internal-link audits from the live production site

Current limitation: the GSC API helper cannot refresh right now because `.tmp/gsc-oauth-client.json` is missing and the OAuth client keys are not present in `.env`. The saved GSC access token expired at `2026-06-01 01:01:09 +05:30`. This does not affect the live site, but it means a fresh API pull requires restoring the OAuth client before rerunning API checks.

## Notification 1

Title: New reasons prevent pages in a sitemap from being indexed

Reason: Duplicate, Google chose different canonical than user

Meaning: Google found a URL in the submitted sitemap, saw our declared canonical, but selected a different canonical URL. The sitemap URL will not be indexed as itself while Google is choosing another canonical.

Confirmed affected sitemap URL from latest GSC export:

| Sitemap URL | GSC status | User canonical | Google-selected canonical | Last crawl |
|---|---|---|---|---|
| `https://digitalcorvids.com/contact` | Duplicate, Google chose different canonical than user | `https://digitalcorvids.com/contact` | `https://www.digitalcorvids.com/contact` | `2026-05-30T15:36:34Z` |

Live production check:

| URL | Live status | Live canonical / redirect |
|---|---:|---|
| `https://digitalcorvids.com/contact` | 200 | canonical points to `https://digitalcorvids.com/contact` |
| `https://www.digitalcorvids.com/contact` | 308 | redirects to `https://digitalcorvids.com/contact` |

Conclusion: the live site is configured correctly now. This looks like stale Google canonical selection caused by Google previously indexing the `www` URL. It should clear after Google recrawls the `www` URL and recognizes the 308 redirect.

Do not resubmit yet. The correct next action is a GSC live test only, not Request Indexing:

1. Live test `https://www.digitalcorvids.com/contact`.
2. Confirm it redirects to `https://digitalcorvids.com/contact`.
3. Live test `https://digitalcorvids.com/contact`.
4. Confirm canonical is non-www.
5. If live test matches production, no code fix is needed.

## Notification 2

Title: Some fixes failed for Page indexing issues

Reason: Crawled - currently not indexed

Meaning: Google crawled some URLs but still chose not to index them. This is not always bad. Assets, favicons, redirects, duplicate legacy URLs, and low-value utility URLs commonly remain in this bucket.

Known likely affected URLs from prior GSC audits:

| URL pattern | Prior issue | Live status now | Assessment |
|---|---|---:|---|
| `https://digitalcorvids.com/influencer-marketing.html` | Crawled - currently not indexed | 308 to `/services/influencer-marketing` | Fixed live; wait for Google recrawl |
| `https://digitalcorvids.com/social-media-marketing.html` | Crawled - currently not indexed | 308 to `/services/social-media-marketing` | Fixed live; wait for Google recrawl |
| `https://digitalcorvids.com/video-production.html` | Crawled - currently not indexed | 308 to `/services/video-production-ad` | Fixed live; wait for Google recrawl |
| `https://digitalcorvids.com/favicon.ico` | Crawled - currently not indexed | 200 favicon asset | Harmless; favicon should not be a normal indexed page |
| `https://www.digitalcorvids.com/next/static/...woff2` | Crawled - currently not indexed | 308 to non-www static asset | Harmless asset URL |
| `https://www.digitalcorvids.com/favicon.ico?...` | Crawled - currently not indexed | 308 to non-www favicon | Harmless asset URL |

Conclusion: this validation likely failed because Google is still holding old crawl states for assets or legacy `.html` URLs. The live site no longer serves those old service HTML URLs as indexable pages.

Do not request indexing for these URLs. Do not block `favicon.ico`; Google can use it for the site favicon. Static assets being crawled and not indexed is not an SEO problem.

What we still need from the GSC UI before making any new code change:

- Open the failed `Crawled - currently not indexed` validation details.
- Export or copy the exact affected URLs.
- If the list contains only favicon/static/legacy redirect URLs, no site fix is needed.
- If the list contains canonical content pages, then we need a content-quality/internal-link audit for those exact pages.

## Notification 3

Title: New reasons prevent pages from being indexed

Reason: Duplicate, Google chose different canonical than user

Meaning: same canonical conflict as Notification 1, but it applies to the broader Pages report, not only the sitemap-filtered view.

Confirmed broader related URLs from latest GSC export:

| URL | GSC status | Google-selected canonical / behavior |
|---|---|---|
| `https://digitalcorvids.com/contact` | Duplicate, Google chose different canonical than user | Google selected `https://www.digitalcorvids.com/contact` |
| `https://www.digitalcorvids.com/contact` | Submitted and indexed | Live site now redirects to non-www |
| `https://www.digitalcorvids.com/services/social-media-marketing` | Submitted and indexed | Live site now redirects to non-www |

Live production checks:

| URL | Live status | Location |
|---|---:|---|
| `https://www.digitalcorvids.com/contact` | 308 | `https://digitalcorvids.com/contact` |
| `https://www.digitalcorvids.com/services/social-media-marketing` | 308 | `https://digitalcorvids.com/services/social-media-marketing` |
| `https://digitalcorvids.com/services/social-media-marketing` | 200 | canonical points to non-www self URL |

Conclusion: this is probably stale Google index data. The `www` versions were crawled/indexed earlier, but the live site now redirects them to canonical non-www URLs.

## Sitemap State

Live sitemap URL count: 46.

Confirmed:

- Includes canonical non-www `/contact`.
- Includes canonical non-www `/services/social-media-marketing`.
- Excludes `https://www.digitalcorvids.com/contact`.
- Excludes `https://www.digitalcorvids.com/services/social-media-marketing`.
- Excludes old `.html` service URLs.
- Excludes favicon URLs.
- Excludes `_next/static` asset URLs.
- Excludes deleted blog slugs:
  - `glass-city-marathon-2026-content-strategy-scaling-event-production`
  - `mastering-country-calling-2026-content-strategy-ai-production`

No sitemap code fix is indicated by the live sitemap.

## URL Inspection Snapshot From Latest Successful Export

Coverage grouping:

| Coverage state | Count |
|---|---:|
| Submitted and indexed | 23 |
| URL is unknown to Google | 24 |
| Page with redirect | 5 |
| Duplicate, Google chose different canonical than user | 1 |
| Excluded by `noindex` tag | 1 |

The main unresolved indexing queue is still newly submitted service/blog URLs that Google has not processed yet. That is separate from the three notifications and should not trigger new submissions today.

## Current Site-Side QA

SEO QA:

- 704 pass
- 1 warning
- 0 fail

The warning is only missing local webmaster verification env vars. The domain property is already verified in GSC, so this is not causing the notifications.

Internal-link QA after the latest code fix:

- A small local fix was pushed in commit `b51b5a3` to add a visible AI Blogger related-service link for the attribution blog post.
- Production link audit may keep showing the old warning until the deployment containing that commit is live.

## Root Cause Summary

1. The duplicate canonical notifications are most likely caused by stale Google-selected canonicals for old `www` URLs, especially `/contact`.
2. The live site now redirects `www` to non-www and declares non-www canonicals correctly.
3. The crawled-not-indexed validation failure is likely caused by legacy redirect URLs and asset URLs that Google still remembers.
4. No evidence currently points to a live sitemap bug.
5. No evidence currently points to a live canonical tag bug on the checked canonical pages.
6. Fresh GSC API verification is temporarily blocked by missing local OAuth client credentials, not by an SEO issue.

## Site-Side Fix Applied After Reviewing Browser-Agent Report

The browser-agent report correctly called out that Google is still seeing a `www` vs non-www canonical conflict and old `.html` URLs. The site already had permanent redirects, but Next.js was serving those redirects as `308 Permanent Redirect`.

To remove ambiguity and match the browser-agent/GSC recommendation more literally, the redirect rules were hardened to emit explicit `301` redirects instead of framework-default `308` redirects.

Changed in `next.config.ts`:

- `www.digitalcorvids.com/:path*` -> `https://digitalcorvids.com/:path*`
- `/index.html` -> `/`
- `/Aboutus.html`, `/aboutus.html`, `/about.html` -> `/about`
- `/Contactus/Contactus.html`, `/contact.html`, `/contact-us.html` -> `/contact`
- `/blog_listing.html`, `/blog_read.html` -> `/blog`
- `/search-engine-optimization.html`, `/seo.html` -> `/services/seo`
- `/web-development.html` -> `/services/web-development`
- `/ppc.html` -> `/services/ppc`
- `/social-media-marketing.html` -> `/services/social-media-marketing`
- `/video-production.html` -> `/services/video-production-ad`
- `/influencer-marketing.html` -> `/services/influencer-marketing`
- `/manage-company.html` -> `/services/manage-company`

Validation:

- `npx tsc --noEmit --pretty false` passed.
- Internal link checks found no live homepage/contact/services references to `www.digitalcorvids.com` or the old `.html` URLs.

After deployment, browser-agent should live-test the affected redirect URLs again and confirm the first response is `301`, then wait for Google to recrawl. Do not request indexing or validate fixes immediately.

## Post-Deployment Header Verification

After the browser-agent live test reported `200` responses on old/wrong URLs, raw production headers were checked directly with normal requests and a Googlebot smartphone user-agent.

Findings:

| Tested URL | Raw first response | Location | Final target status | Assessment |
|---|---:|---|---:|---|
| `https://www.digitalcorvids.com/contact` | 308 Permanent Redirect | `https://digitalcorvids.com/contact` | 200 | Permanent redirect exists; GSC/browser report likely read the final fetch, not the first hop |
| `https://digitalcorvids.com/influencer-marketing.html` | 301 Moved Permanently | `/services/influencer-marketing` | 200 | Fixed |
| `https://digitalcorvids.com/social-media-marketing.html` | 301 Moved Permanently | `/services/social-media-marketing` | 200 | Fixed |
| `https://digitalcorvids.com/video-production.html` | 301 Moved Permanently | `/services/video-production-ad` | 200 | Fixed |
| `https://digitalcorvids.com/services/video-production-ad` | 200 OK | N/A | 200 | Canonical target exists |

The `www` redirect still appears as `308`, even after the app-level redirect was changed to explicit `301`. This suggests Vercel is applying a domain-level redirect before the request reaches the Next.js redirect rule. Vercel treats `308` as a permanent redirect, so this should still consolidate canonical signals, but if the goal is literally `301` for the `www` host, that must be checked in Vercel's domain/project redirect settings.

DNS check:

- `digitalcorvids.com` resolves to Vercel.
- `www.digitalcorvids.com` is a CNAME to a Vercel DNS target.

Updated conclusion:

- The three legacy `.html` URLs are fixed as `301`.
- The `www` host does redirect to non-www, but Vercel currently returns `308`, not `301`.
- The browser-agent statement that these URLs return direct `200` responses is not supported by raw production headers.
- Do not resubmit or validate yet; wait for Google to recrawl the corrected first-hop redirects.

## Independent Redirect-Chain Verification

An external redirect-chain check was completed through `httpstatus.io` using a Googlebot smartphone user-agent.

Verified chains:

| Tested URL | First hop | Final URL | Final status |
|---|---:|---|---:|
| `https://www.digitalcorvids.com/contact` | 308 | `https://digitalcorvids.com/contact` | 200 |
| `https://digitalcorvids.com/influencer-marketing.html` | 301 | `https://digitalcorvids.com/services/influencer-marketing` | 200 |
| `https://digitalcorvids.com/social-media-marketing.html` | 301 | `https://digitalcorvids.com/services/social-media-marketing` | 200 |
| `https://digitalcorvids.com/video-production.html` | 301 | `https://digitalcorvids.com/services/video-production-ad` | 200 |
| `https://digitalcorvids.com/contact` | no redirect | `https://digitalcorvids.com/contact` | 200 |

External verification conclusion:

- Redirect targets are live.
- Canonical landing URLs return `200`.
- Legacy `.html` redirects are single-hop `301` redirects.
- `www` to non-www is a single-hop permanent `308` redirect.
- No redirect loops, duplicate hops, or soft 404 behavior were detected.
- No further redirect code change is indicated.

## Do Not Do Yet

- Do not request indexing again.
- Do not submit sitemap again.
- Do not validate fixes until the exact affected URLs are confirmed in the GSC UI.
- Do not block `favicon.ico`.
- Do not spend quota on redirects, assets, login pages, or old `.html` URLs.

## Recommended Next Browser-Agent Instructions

Use GSC UI only. Do not click Request Indexing, Submit Sitemap, or Validate Fix.

1. Open Notification 1 details.
2. Export/copy every URL under `Duplicate, Google chose different canonical than user`.
3. Open Notification 3 details.
4. Export/copy every URL under `Duplicate, Google chose different canonical than user`.
5. Open Notification 2 failed validation details.
6. Export/copy every URL still affected by `Crawled - currently not indexed`.
7. For each duplicate canonical URL, run Live Test only and record:
   - tested URL
   - final URL
   - HTTP status
   - user-declared canonical
   - Google-selected canonical, if shown
   - whether it redirects
8. For each crawled-not-indexed URL, run Live Test only and record:
   - tested URL
   - final URL
   - HTTP status
   - page can/cannot be indexed
   - canonical
   - referring sitemap/referring page

After that export is available, decide whether there is a real site-side fix or only stale GSC state.
