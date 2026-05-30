# Google Search Console API Helper

This repo includes `scripts/gsc-console.mjs` for the parts of Search Console that can be automated:

- Search Analytics by page/query/country/device
- URL Inspection API status for indexed-version data
- Sitemap list/submit/delete
- Combined Markdown/CSV reports under `exports/gsc/`
- Live HTTP checks for known legacy URLs

It cannot click **Request Indexing**, run the **Live Test**, or validate fixes in the GSC UI. Google does not expose those actions for normal blog/service pages.

## One-Time OAuth Setup

If AI Blogger Search Console OAuth is already configured, reuse the same Google OAuth client. The helper automatically looks for these existing `.env` values:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

You only need to add the local callback URL to that same OAuth client:

```text
http://127.0.0.1:8765/oauth2callback
```

Steps:

1. Open Google Cloud Console.
2. Go to **APIs & Services > Credentials**.
3. Open the OAuth client already used by AI Blogger.
4. Add `http://127.0.0.1:8765/oauth2callback` under **Authorized redirect URIs**.
5. Make sure **Google Search Console API** is enabled for the project.
6. Run:

```bash
npm run gsc:auth -- --open
```

Approve access in the browser. The script stores the refresh token locally:

```text
.tmp/gsc-token.json
```

`.tmp/` is ignored by git, so tokens stay local.

### OAuth JSON Alternative

If you prefer a separate local OAuth client JSON, download it and save it as:

```text
.tmp/gsc-oauth-client.json
```

Then run the same auth command.

## Optional Service Account Setup

OAuth is usually easier. If you prefer a service account:

1. Create a service account key JSON in Google Cloud.
2. Add the service account email as a user in Search Console:
   - Property > Settings > Users and permissions > Add user
3. Save the key locally:

```text
.tmp/gsc-service-account.json
```

4. Run commands with:

```bash
$env:GSC_SERVICE_ACCOUNT_FILE=".tmp/gsc-service-account.json"
npm run gsc -- sites
```

## Recommended Commands

List properties:

```bash
npm run gsc -- sites
```

List sitemaps:

```bash
npm run gsc -- sitemaps --site-url=sc-domain:digitalcorvids.com
```

Submit canonical sitemap:

```bash
npm run gsc -- sitemap:submit --site-url=sc-domain:digitalcorvids.com --sitemap=https://digitalcorvids.com/sitemap.xml
```

Delete duplicate www sitemap:

```bash
npm run gsc -- sitemap:delete --site-url=sc-domain:digitalcorvids.com --sitemap=https://www.digitalcorvids.com/sitemap.xml
```

Inspect a few URLs:

```bash
npm run gsc -- inspect --url=/blog --url=/contact --url=/services/seo --output=exports/gsc/inspection.csv
```

Get page-filtered query data for one URL:

```bash
npm run gsc -- performance --page=/blog/2026-social-media-marketing-trends-operationalizing-ai-and-creative --dimensions=query --days=90
```

Build a full report:

```bash
npm run gsc:report -- --days=90 --inspect-limit=25
```

Outputs are written under:

```text
exports/gsc/<timestamp>/
```

## Notes

- Use `GSC_SITE_URL=sc-domain:digitalcorvids.com` for the domain property.
- Use `--site-url=https://digitalcorvids.com/` if you choose the URL-prefix property instead.
- URL Inspection API reports Google-indexed data, not a live test.
- Search Console API cannot request indexing for normal pages.
