# Templates store

The website sells ready-made templates at `/templates`, with one page per
template at `/templates/<slug>`. The templates themselves live in the private
`codester-themes` repository.

| File | What it holds |
|---|---|
| `lib/marketing-templates-catalog.ts` | Name, niche, price and links for each template. Edit this to change a price or turn on buttons. |
| `lib/marketing-templates.ts` | The text and image list for each template page. |
| `public/templates/<slug>/` | Page screenshots (WebP), the hover preview (`card.webp`) and the social sharing image (`og.jpg`). |
| `scripts/template-images.mjs` | Makes those images from a template's listing screenshots. |

This repository is public, so only screenshots go in it. Never copy a
template's `demo/`, `source/` or `package/` folder here: anyone could download
the paid template for free.

## Turn on the live demo and buy buttons

In `lib/marketing-templates-catalog.ts`, fill in the template's links. Each one
must be a full `https://` link; leave it `null` to hide the button.

| Field | What it does |
|---|---|
| `demoUrl` | Adds "Live demo" buttons. Use the demo's Cloudflare Pages link. |
| `checkoutUrl` | A payment link (Razorpay, Lemon Squeezy, Gumroad...). The main button becomes "Buy now". |
| `marketplaceUrl` | The Codester page. Used for the main button when there is no `checkoutUrl`. |

With no `checkoutUrl` and no `marketplaceUrl`, the main button says "Request
this template". It opens the contact form with the template already named in
the message, so you can reply with a payment link.

To publish a demo: in Cloudflare, go to Workers & Pages → Create → Pages →
Upload assets, upload the template's `demo` folder from `codester-themes`,
deploy, and copy the `*.pages.dev` link.

## Change a price

Change `priceUsd` in `lib/marketing-templates-catalog.ts`. Every page, button
and contact message uses it.

## Add a new template

Claude Code can do all of these steps: ask it to "add the <name> template from
codester-themes to the templates store". To do it by hand:

1. **Make the images.** Extract `listing/screenshots.zip` from the template's
   folder in `codester-themes`. Then run this in this repository, on one line:

   ```bash
   npm run templates:images -- --slug academy-education --shots "C:\path\to\shots" --pages index,courses,course,admissions,fees,contact
   ```

   - `--slug` is the page address: lowercase words joined by hyphens.
   - `--pages` picks up to six pages for the page tour, home page (`index`)
     first. Use the screenshot names without `-1440.png`.
   - It writes `public/templates/<slug>/` and prints the `card` and `tour` code
     for step 3.
   - If it says sharp did not load, run `npm install --no-save sharp` and try
     again.

2. **Add the settings.** In `lib/marketing-templates-catalog.ts`, add an entry
   to `MARKETING_TEMPLATE_CATALOG` with the same `slug`, plus `name`, `niche`,
   `priceUsd` and the three links (`null` until they exist). If the template
   is listed in `MARKETING_TEMPLATES_IN_DESIGN` ("Next up"), remove it there.

3. **Add the page content.** In `lib/marketing-templates.ts`, copy an existing
   entry in `TEMPLATE_CONTENT`, give it the new slug, and fill it in from the
   template's `listing/listing.md`:
   - `title`: the listing title without the template name
   - `metaTitle`: name, niche and "Website Template", under 45 characters
   - `summary`: one sentence for the template cards
   - `description`: two short paragraphs
   - `accent`: the template's main colour, from its `tailwind.config.js`
   - `pageCount`, `stack`, `fonts`, `version`
   - `signature`: four standout features, each a title and one sentence
   - `features` and `pages`: the lists from the listing
   - `card` and `tour`: paste what step 1 printed
   - `keywords`: four or five search phrases

4. **Check it.**

   ```bash
   npx tsx --test tests/marketing-templates.test.ts
   ```

   The test fails if an image is missing. Then run `npm run dev` and open
   `http://localhost:3000/templates`.

5. **Publish.** Commit and push. The sitemap, `llms.txt`, the portfolio's
   templates shelf and the "More templates" lists pick up the new template on
   their own.

Rules from the `codester-themes` repository apply here too: never describe a
template as hand-made or made without AI.
