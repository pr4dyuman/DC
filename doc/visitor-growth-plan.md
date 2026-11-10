# Getting more visitors to digitalcorvids.com

Written 9 November 2026. Covers what changed on the website (branch
`claude/epic-maxwell-14keyy`), what still needs the owner, and the keyword
plan behind both.

## Why so few people find the site

- **Google barely knows the brand yet.** In June, Search Console showed 23
  pages indexed and 24 "unknown to Google". In November, searches for
  "Digital Corvids", the phone number and `site:digitalcorvids.com` on a
  non-Google search engine returned almost nothing. Check Search Console's
  Pages report for Google's own view.
- **No Google Business Profile or directory listings were found.** Local
  clients mostly click the map results for "digital marketing agency jaipur",
  and Digital Corvids is not in them.
- **The service pages did not say "Jaipur"** in their titles or headings,
  while every agency that ranks does. (Fixed on the branch.)
- **The service pages are thinner than competitors'.** They run about
  1,000-1,350 words, against 2,000-5,000 for agencies that rank, with no
  prices and four questions each. (Three questions per page added on the
  branch. Prices need the owner.)
- **Most blog posts target American searches** (plumbers, Local Services Ads,
  TikTok), not Indian business owners.

## Already done on the branch

Nothing reaches Google until the branch is merged and deployed.

| Page | New title | New heading |
|---|---|---|
| Home | Digital Marketing Agency in Jaipur \| Digital Corvids | (unchanged: "Digital marketing agency in Jaipur / More customers from…") |
| /services | Digital Marketing Services in Jaipur \| Digital Corvids | Services |
| SEO | SEO Company in Jaipur \| Local SEO Services \| Digital Corvids | SEO Services in Jaipur |
| PPC | Google Ads & PPC Agency in Jaipur \| Digital Corvids | PPC & Google Ads in Jaipur |
| Social media | Social Media Marketing Agency in Jaipur \| Digital Corvids | Social Media Marketing in Jaipur |
| Web development | Website Development Company in Jaipur \| Digital Corvids | Website Development in Jaipur |
| Video | Video Production & Ad Film Company in Jaipur \| Digital Corvids | Video Production & Ad Films in Jaipur |
| Influencer | Influencer Marketing Agency in Jaipur \| Digital Corvids | Influencer Marketing in Jaipur |
| /contact | Contact Digital Corvids \| Digital Marketing Agency in Jaipur | Let's Talk |

Also:

- Each service page has three more questions: what it costs, a local or
  platform question, and how clients follow their project.
- The homepage answers five common questions (what we do, cost, where to
  start, small businesses, getting started), also as FAQ search data.
- The footer of every page links to the six services and shows the
  Malviya Nagar, Jaipur address.
- Google gets a proper logo image, and the founder from the team section.
- Shared links show the page title ("SEO Services in Jaipur").
- **Speed.** The site's fonts are 77% smaller (464 KB to 105 KB).
- Every page used to be thrown away and rebuilt about 0.2s after loading,
  because of how the theme provider was written. That is fixed.
- Lighthouse scores 100 for accessibility, best practices and SEO on the
  main pages. On a slow phone connection, inner pages
  and blog posts now show their main content in about 1.4s instead of
  2.6-3.1s. Measurements are in `doc/seo.txt`.
- **Design.** The original visual design is back: illustrations, two-tone
  headings, the photo-backed services, the yellow band and team photos.

## What the owner needs to do, in order

1. **Merge and deploy the branch.** Then, in Google Search Console:
   - Under Sitemaps, resubmit `https://digitalcorvids.com/sitemap.xml`.
   - Under URL Inspection, request indexing for the home page, `/services`
     and the six service pages.
2. **Create or claim the Google Business Profile** at
   business.google.com. This is the biggest single step for local clients.
   - **Name:** exactly "Digital Corvids".
   - **Categories:** "Internet marketing service", plus the closest matches
     in Google's list for marketing agency, website designer, video
     production and social media.
   - **Details:** the full Malviya Nagar address with pincode,
     +91-8003177679, https://digitalcorvids.com, opening hours, and the six
     services with short descriptions.
   - **Photos:** at least 10 of the office, the team and the work.
   - **Reviews:** ask every happy client for one by sending the review link
     on WhatsApp. Aim for 10 in the first month, and reply to each.
   - **Updates:** post one a week, such as a finished project or a tip.
   - **Send us the details:** the full street address, pincode, map link
     and opening hours. They can then go on the Contact page, in the footer
     and in the search data, which today only says "Malviya Nagar, Jaipur".
3. **List the business in directories**, with the same name, address and
   phone everywhere: Justdial, Sulekha, Clutch, GoodFirms, DesignRush,
   IndiaMART, The Manifest, plus the LinkedIn company page and Facebook page.
   Clutch and GoodFirms both show up for Jaipur agency searches.
4. **Ask clients for a credit link** such as "Website by Digital Corvids" in
   their site footer. Candidates include Drifting Wood, Design Dwellers
   Studio and EzyPrep. These are free, relevant links.
5. **Decide starting prices.** Agencies that rank show "from ₹…" on their
   service pages. Set `pricing.from` in
   `lib/marketing-service-pages/<service>.ts` (for example
   `"₹15,000 a month"`). Until then the pages say "Custom quote".
6. **Add testimonials** in /admin → Testimonials and set them to Active. The
   homepage section stays hidden until there are some.
7. **Turn the blog towards Indian business owners.**
   - Publish two posts a month from the list below, each linking to its
     service page.
   - ~~Fix or unpublish `local-service-ads-vs-google-business-plumber-leads`,
     which is about the US only.~~ Done 10 November: it now redirects to
     `/services/ppc`.
   - Fix or unpublish `2026-social-media-marketing-trends-…`, which
     recommends TikTok (banned in India since 2020).
   - Fix the garbled heading in the Jaipur SEO post ("A a structured
     sequence Vetting Framework").
8. **Measure every month** (the first review, with the starting numbers to
   compare against, is `doc/search-data-review-2026-11.md`) in Search Console (queries, pages, impressions)
   and Google Analytics. If both are connected through Windsor.ai, which is
   available in this workspace, the next topics can be picked from real
   search data.

## Keyword map

No search volumes were available from the research tools. Keywords were
chosen from what ranks in Jaipur results. Re-check with Google Keyword Planner
and Search Console after a month of data.

| Page | Main search | Also targets |
|---|---|---|
| Home | digital marketing agency in jaipur | digital marketing company in jaipur; best digital marketing agency in jaipur |
| /services | digital marketing services in jaipur | digital marketing packages jaipur; cost of digital marketing in jaipur |
| SEO | seo company in jaipur | seo services in jaipur; local seo services jaipur; google business profile optimization jaipur |
| PPC | google ads agency in jaipur | ppc company in jaipur; facebook ads agency jaipur; performance marketing agency jaipur |
| Social media | social media marketing agency in jaipur | instagram marketing agency jaipur; social media marketing company jaipur |
| Web development | website development company in jaipur | website designing company in jaipur; shopify website development jaipur |
| Video | video production company in jaipur | ad film production house in jaipur; ad film makers in jaipur |
| Influencer | influencer marketing agency in jaipur | jaipur influencers for brand promotion; micro influencer marketing india |
| /contact | digital marketing agency in malviya nagar jaipur | Digital Corvids address; Digital Corvids phone |

Video and influencer pages face the weakest competition in Jaipur, so they
may move first.

## Blog topics for Indian business owners

Topics marked ✓ already have pages ranking for them, so people search for
them.

- **SEO:**
  - how much does SEO cost in India ✓
  - how to rank a restaurant on Google Maps ✓
  - Google Business Profile checklist for Indian businesses
  - how long SEO takes
  - how to get more Google reviews
- **PPC:**
  - Google Ads cost per click in India ✓
  - minimum Google Ads budget for a small business
  - Meta ads cost in India ✓
  - Google Ads vs Instagram ads for a local business
  - click-to-WhatsApp ads for restaurants
- **Social media:**
  - social media marketing packages in India ✓
  - Instagram marketing for restaurants
  - how interior designers get clients from Instagram ✓
  - reels ideas for furniture stores
- **Websites:**
  - website development cost in India ✓
  - ecommerce website cost in India ✓
  - Shopify vs WooCommerce for Indian stores ✓
- **Video:**
  - ad film production cost in India ✓
  - corporate video production cost
  - product and reels shoot cost for ecommerce ✓
- **Influencer:**
  - micro-influencer rates in India ✓
  - how to find food influencers in Jaipur ✓
  - barter vs paid influencer collaborations

## Competitor pattern, for reference

The ten Jaipur agencies checked share these traits:

- All put "[service] company/agency in Jaipur" first in the title, and nine
  repeat it in the main heading.
- Almost all have a questions section, an industries section, and
  testimonials or a Google rating.
- Most show ₹ price ranges, named local case studies, Jaipur localities, and
  a full address with opening hours.
- Pages run 2,000-5,000 words.

Example: W3era's SEO page shows plans from ₹40,000 a month and 18 questions.
