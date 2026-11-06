# Portfolio case studies

The portfolio shows every kind of work as a case study card: websites and web
apps, SEO, social media, ads, video, influencer campaigns and branding. A case
study with a story also gets its own page at `/portfolio/<slug>`, and each
service page shows its case studies under "From the portfolio".

| File | What it holds |
|---|---|
| `lib/marketing-portfolio.ts` | The published case studies, the services list and the data shape. |
| `lib/marketing-portfolio-samples.ts` | Sample case studies with invented clients and numbers, one per service. |
| `public/portfolio/` | Videos, posters and images. Sample images are in `public/portfolio/samples/`. |
| `components/marketing/portfolio/` | The cards, the proof visuals, the pages. |

## Real results only

Only case studies with `status: "published"` appear on the public site. The
samples show the layout and appear only on the preview page,
`/portfolio/preview`, which is hidden from search engines and linked from
nowhere. Before publishing a case study:

- Get the client's permission in writing. If they prefer privacy, describe
  them instead ("Dental clinic, Jaipur").
- Use real numbers with a date range and a source, and keep the report or
  screenshot behind every number.
- Lead with a business number: leads, sales, cost per lead, organic clicks.

The tests (`npx tsx --test tests/marketing-portfolio.test.ts`) fail if a
published case study uses a sample image, an image file is missing, or a
sample could reach the public site.

## Add a case study

1. Copy the sample for the same service from
   `lib/marketing-portfolio-samples.ts` into `PUBLISHED_CASE_STUDIES` in
   `lib/marketing-portfolio.ts`.
2. Give it a new `slug` (lowercase words with hyphens, not starting with
   `sample-`) and set `status: "published"`.
3. Replace every word, number and image with the client's real ones. Put
   images in `public/portfolio/<slug>/`.
4. Check it at `/portfolio` and `/portfolio/<slug>` with `npm run dev`, run the
   tests, then commit and push.

When the real case study for a service exists, delete that service's sample.

### Fields every case study has

| Field | What to write |
|---|---|
| `client` | Client name, or a description when they prefer privacy. |
| `industry`, `location`, `period` | For example "Furniture retail", "Jaipur", "Dec 2025 – Nov 2026". |
| `services` | The services, main one first: `web`, `app`, `seo`, `social`, `ads`, `video`, `influencer`, `branding`. The main one sets the filter and the proof. |
| `headline` | The one number that matters, and its label: `{ value: "+402%", label: "Organic clicks in 12 months" }`. Use digits with `+ − % × k M`; the display font has no `₹`, so put currency in the label. |
| `summary` | One sentence for the card. |
| `kpis` | Two to four supporting numbers. The card shows the first two. |
| `featured` | `true` makes the card span the full width of the grid. |
| `story` | `challenge`, three or four `steps` (title and text), `result` and the data `source`. A story gives the case study its own page. |
| `testimonial` | Optional quote, name and role, with permission. |
| `live` | Optional link to the live site: `{ url, label }`. |

### The proof for each service

| Service | `proof` | Where the data comes from |
|---|---|---|
| Websites, web apps | `website`: walkthrough `video` (WebM) and `poster` (1280×800 or 1440×900). The current walkthroughs were recorded with `scripts/record-portfolio-video.mjs`. | The live site. |
| SEO | `seo`: monthly `points` (12 is ideal), `startIndex` of the month the work began, `keywords` with positions before and after (`null` = not ranking), and `serp`, the client's search result. | Search Console → Performance → Export. |
| Social media | `social`: nine `posts` (square images, 600×600 or larger), `avatar`, `profileStats`, and monthly follower `growth`. | Meta Business Suite → Insights; LinkedIn page analytics. |
| Ads | `ads`: the best `ad` (headline, URL, description, sitelinks) and before/after `comparisons` (`inr`, `number`, `percent` or `multiplier`; set `lowerIsBetter` for costs). | Google Ads campaigns report with a date comparison; Meta Ads Manager. |
| Video | `video`: `poster` (16:9), optional `video` file for the hover preview and player, three `stills`, `duration`, `channels`. | YouTube Studio, Instagram Insights, Meta Ads Manager. |
| Influencer | `influencer`: `creators` (name, handle, followers, initials) and three vertical `content` images (9:16). | Creators' insight screenshots; discount-code or tracked-link reports. |
| Branding | `branding`: `before` and `after` logos at the same size (16:10 works best), `palette` (name and hex), three `applications` (4:3). | The design files. |

Images are served through Next.js image optimisation, so a large JPEG, PNG or
WebP is fine; keep each under about 1 MB.
