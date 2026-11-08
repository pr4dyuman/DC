# Portfolio case studies

The portfolio shows every kind of work as a case study card: websites and web
apps, SEO, social media, ads, video, influencer campaigns and branding. A case
study with a story also gets its own page at `/portfolio/<slug>`. Each service
page shows its published case studies under "From the portfolio": up to two
as a spotlight with their charts and visuals, then website projects as cards.
A service with nothing published shows no section at all.

Case studies are managed in **Super Admin → Case Studies**
(`/super-admin/case-studies`) and stored in the marketing database.

**Examples for services without published work.** Until a service (SEO,
social media, ads, video, influencer) has a published case study, the
portfolio's "How We Report Each Service" section and that service's page show
its sample as an example: every visual is marked "Example", there is no client
name or headline result, and a note says the numbers are illustrative. The
words for each example are in `SERVICE_EXAMPLES` in `lib/marketing-portfolio.ts`.
Publishing a real case study for the service replaces its example; deleting
the service's sample in Super Admin removes it.

| File | What it holds |
|---|---|
| `app/super-admin/case-studies/`, `components/super-admin/case-studies/` | The Super Admin list and editor. |
| `lib/actions/super-admin-case-studies.ts` | Saving, publishing, ordering and deleting (super admins only). |
| `lib/marketing-portfolio-store.ts` | How pages read case studies: from the database through a cache, or the built-in ones. |
| `lib/marketing-portfolio-validation.ts` | The checks every case study passes before it is saved or shown. |
| `lib/marketing-portfolio-editor.ts` | The editor's fields for every proof and visual. |
| `lib/marketing-portfolio.ts`, `lib/marketing-portfolio-samples.ts` | The data shape, the services, and the built-in case studies and samples. |
| `public/portfolio/` | Videos, posters and images for the built-in case studies. Sample images are in `public/portfolio/samples/`. |
| `components/marketing/portfolio/` | The cards, the proof visuals, the spotlight, the service examples and the pages. |

## Real results only

Only case studies with the status **Published** appear on the public site as
client work. Drafts and samples appear as case studies only on the preview,
`/portfolio/preview`, which is hidden from search engines and linked from
nowhere; publicly, a sample only ever appears as a marked example (above).
Before publishing:

- Get the client's permission in writing. If they prefer privacy, describe
  them instead ("Dental clinic, Jaipur").
- Use real numbers with a date range and a source, and keep the report or
  screenshot behind every number.
- Lead with a business number: leads, sales, cost per lead, organic clicks.

Publishing asks you to confirm that the numbers, images and quotes are real and
the client agreed; Super Admin records who confirmed it and when. A published
case study cannot use the sample images or a `sample-` address.

## Manage case studies in Super Admin

**First time.** The site starts with the case studies built into the code.
Open Case Studies and choose **Set up case studies**: this copies them into the
database so they can be edited. Nothing changes on the site. From then on the
database alone decides what shows; deleting every case study leaves the
portfolio empty rather than bringing the built-in ones back. Until setup, and
whenever the database cannot be reached, the site uses the built-in ones.

**Add one.** Choose **New case study** and its main service. The draft starts
as a copy of that service's example, so every field shows what it expects.
Replace every word, number and image, then set the status to Published and
save. The case study appears on the portfolio, its own page (if it has a
story) and every matching service page straight away.

**Images.** Upload (stored in Vercel Blob, or Azure when Blob is full) or
paste a link. Width and height fill in from the image. Uploaded images load as
they are, without Next.js resizing, so export them at the size shown (posts
600×600, posters 1440×900) as WebP or JPEG under about 1 MB.

**Videos.** Upload an MP4 or WebM file (up to 200 MB; it goes straight to
Vercel Blob, which needs `BLOB_READ_WRITE_TOKEN`), or paste a link to one.
Website walkthroughs can be recorded with `scripts/record-portfolio-video.mjs`.

**Order.** The arrows on the list set the order on `/portfolio` and on the
service pages. On a case study, the first two extra visuals also show on the
service page; the preview of each case study shows that section under "On The
Service Page".

**Other tools.** Duplicate a case study as a new draft, delete one, or add
back deleted examples from the list. On a case study, **Advanced: edit as
JSON** shows the whole case study as data, for copying between case studies or
pasting many numbers at once.

**If something is wrong.** Every save is checked, and the editor lists what to
fix before it saves. A case study that fails the checks (for example after an
edit made directly in the database) is hidden from the site and marked "to
fix" in the list.

### Built-in case studies

`lib/marketing-portfolio.ts` holds the built-in published case studies and
`lib/marketing-portfolio-samples.ts` one sample per service. They are what the
site shows before setup, what **Set up case studies** copies, and the examples
new drafts start from. After setup, edit case studies in Super Admin: changes
to these files no longer reach the site.

The tests check the built-in case studies, the editor and the checks:

```bash
node --require ./tests/register-server-only-stub.cjs --import tsx --test tests/marketing-portfolio.test.ts tests/marketing-portfolio-admin.test.ts
```

The fields below are the same in the editor and in **Advanced: edit as JSON**.

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
| `story` | `challenge`, three or four `steps` (title, text and an optional `when`, such as "Mar 2026" or "Week 2"), `result` and the data `source`. A story gives the case study its own page. |
| `insights` | Optional extra visuals for the case study page. See below. |
| `testimonial` | Optional quote, name and role, with permission. |
| `live` | Optional link to the live site: `{ url, label }`. |

### The proof for each service

| Service | `proof` | Where the data comes from |
|---|---|---|
| Websites, web apps | `website`: walkthrough `video` (WebM) and `poster` (1280×800 or 1440×900). The current walkthroughs were recorded with `scripts/record-portfolio-video.mjs`. | The live site. |
| SEO | `seo`: monthly `points` (12 is ideal), `startIndex` of the month the work began, `keywords` with positions before and after (`null` = not ranking), and `serp`, the client's search result. Add `report` for the Search Console style panel on the case study page: four `metrics` (first and last month), monthly `impressions` and numbered `markers` for when each step began. | Search Console → Performance → Export. |
| Social media | `social`: nine `posts` (square images, 600×600 or larger), `avatar`, `profileStats`, monthly follower `growth`, and an optional `profile` (name, bio lines, button) for the large phone. | Meta Business Suite → Insights; LinkedIn page analytics. |
| Ads | `ads`: the best `ad` (headline, URL, description, sitelinks) and before/after `comparisons` (`inr`, `number`, `percent` or `multiplier`; set `lowerIsBetter` for costs). | Google Ads campaigns report with a date comparison; Meta Ads Manager. |
| Video | `video`: `poster` (16:9), optional `video` file for the hover preview and player, three `stills`, `duration`, `channels`. | YouTube Studio, Instagram Insights, Meta Ads Manager. |
| Influencer | `influencer`: `creators` (name, handle, followers, initials) and three vertical `content` images (9:16). | Creators' insight screenshots; discount-code or tracked-link reports. |
| Branding | `branding`: `before` and `after` logos at the same size (16:10 works best), `palette` (name and hex), three `applications` (4:3). | The design files. |

Images in `public/` are served through Next.js image optimisation; uploaded
images load directly from their storage (see Images above).

### Extra visuals (`insights`)

A case study page shows its `proof`, then any `insights` in order. Each one has
a `title`, an optional `note` under it, and `wide: true` to take a full row;
the others pair up. When a case study has insights, the large proof drops the
parts they replace (the SEO result card and keyword table, the ad card, the
creator list). The samples show every type with realistic data.

| `type` | What it shows | Data |
|---|---|---|
| `search-results` | A Google results page with the client highlighted: in the map pack and the organic results, or as the top ad (`ad` with `sitelinks` and `call`). Other results are grey lines, never real businesses. | `query`, `position`, `result`, optional `mapPack` (name, rating, reviews, detail). |
| `rank-movement` | Each keyword's position before and after, with page one shaded and a summary. | `keywords`: term, `before` (`null` = not ranking), `after`, optional monthly `volume`. |
| `score-rings` | Lighthouse scores before and after. | `scores`: label, `before`, `after` (0–100). |
| `message-inbox` | A direct-message inbox with reply times. | `messages` (from, text, time, reply) and two `summary` figures. |
| `post-stats` | One standout post or reel and its numbers. | `image`, `caption`, `headline`, `stats` (likes, comments, shares, saves). |
| `bars` | Columns over time, or two or three bars to compare. | `bars` (label, value), optional `prefix` or `suffix` such as "₹". |
| `weekly-combo` | Bars and a line on separate axes, such as leads and cost per lead. | `labels` (a month name where each month starts, else ""), `bars` and `line` values of the same length. |
| `funnel` | Each step from first view to result, with the share that got through. | `stages`, each smaller than the one before. |
| `landing-page` | The page an ad leads to, on a phone. | `url`, `eyebrow`, `heading`, `price`, `points`, `fields`, `cta`. |
| `retention` | Audience retention for a video, with the hook and average marked. | `points` (second, percent, starting at 0 and 100), `hook`. |
| `cuts` | One film's versions in their real shapes. | `versions`: label, `ratio` (`16:9`, `9:16`, `1:1`), image, use. |
| `split` | A total split into parts, such as views by channel. | `total` and `parts`; the parts must add up to the total. |
| `creator-leaderboard` | Sign-ups by creator code, and sign-ups per 1,000 followers. | `creators`: handle, initials, followers, code, signups. |
| `logo-versions` | The full, stacked and monogram logos in the brand colours. | `name`, `monogram`, `tagline`, `colors` (dark, mid, accent, light). |
| `type-specimen` | The brand's typefaces with samples. | `faces`: name, role, `family` (`display` or `text`), sample. |

The checks make insight numbers hang together (funnels shrink, retention
starts at 100%, combo charts have one value per label), so a typo shows up in
the editor before it reaches the page.
