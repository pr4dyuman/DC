# Templates store

The website sells ready-made templates at `/templates`, with one page per
template at `/templates/<slug>`. The templates themselves live in the private
`codester-themes` repository.

| File | What it holds |
|---|---|
| `lib/marketing-templates-catalog.ts` | Name, niche, price and links for each template, in display order (newest first). Edit this to change a price or turn on buttons. |
| `lib/marketing-templates.ts` | The text and image list for each template page. |
| `public/templates/<slug>/` | Page screenshots (WebP), the hover preview (`card.webp`) and the social sharing image (`og.jpg`). |
| `scripts/template-images.mjs` | Makes those images from a template's listing screenshots. |
| `app/(template-demo)/templates/[slug]/demo/` | The full-screen demo page, `/templates/<slug>/demo`. |

This repository is public, so only screenshots go in it. Never copy a
template's `demo/`, `source/` or `package/` folder here: anyone could download
the paid template for free.

## Turn on the live demo and buy buttons

In `lib/marketing-templates-catalog.ts`, fill in the template's links. Each one
must be a full `https://` link; leave it `null` to hide the button.

| Field | What it does |
|---|---|
| `demoUrl` | Turns on the live demo. Use the demo's Cloudflare Pages link. |
| `checkoutUrl` | A payment link (Razorpay, Lemon Squeezy, Gumroad...). The main button becomes "Buy now". |
| `marketplaceUrl` | The Codester page. Used for the main button when there is no `checkoutUrl`. |

With no `checkoutUrl` and no `marketplaceUrl`, the main button says "Request
this template". It opens the contact form with the template already named in
the message, so you can reply with a payment link.

With a `demoUrl`, visitors can try the real site in three ways:

- **In the box.** Every template card, and the preview at the top of each
  template page, gets a "Try live demo" button. On a wide enough box it loads
  the demo right there at desktop size, so visitors can scroll and click
  around without leaving the store. "Full screen" and × sit in the box's bar.
- **Full screen.** `/templates/<slug>/demo` shows the demo filling the
  window, under a slim bar with Desktop, Tablet and Phone sizes, a "New tab"
  link and the buy button. On phones, "Try live demo" opens this page, since a
  desktop-size demo in a small box is too small to use. The page is kept out
  of search results.
- **Page tour.** The "Open live demo" link next to the screenshots.

The demo runs sandboxed: its scripts, forms and new-tab links work, but it can
never navigate our page away.

### Publish a demo

The demos live in one Cloudflare Pages project, `dc-template-demos`, with a
folder per template, so each one is at
`https://dc-template-demos.pages.dev/<folder>/`. (An older project,
`dc-template-previews`, holds outdated copies and is no longer linked.)

1. Copy each template's `demo` folder from `codester-themes` into a folder
   named after the template (`oscilla`, `sugo`, `vesper`, `marlowe-dental`,
   `mensah-hart`, `meridian-academy`...).
2. **In each copy, delete `package.json`, `tailwind.config.js` and the `src`
   folder.** The demo only loads the compiled `assets/css/style.css`; those
   three files are the template's editable source, which buyers pay for.
3. In Cloudflare, open Workers & Pages → `dc-template-demos` → Create
   deployment, and upload the folder that holds all the template folders.
4. Paste each link into `demoUrl`, ending with `/`.

## Change a price

Change `priceUsd` in `lib/marketing-templates-catalog.ts`. Every page, button
and contact message uses it.

## Add a new template

Claude Code can do all of these steps: ask it to "add the <name> template from
codester-themes to the templates store". To do it by hand:

1. **Make the images.** Extract `listing/screenshots.zip` from the template's
   folder in `codester-themes`. Then run this in this repository, on one line:

   ```bash
   npm run templates:images -- --slug meridian-academy --shots "C:\path\to\shots" --pages index,courses,course-pottery-wheel-basics,teachers,admissions,workshops
   ```

   - `--slug` is the page address: lowercase words joined by hyphens.
   - `--pages` picks up to six pages for the page tour, home page (`index`)
     first. Use the page part of the screenshot names: `courses` for
     `courses-1440.png` or `desktop-courses.png`. Both naming styles work,
     and a `screens` folder inside `--shots` is found on its own.
   - Add `--trim-top` if the screenshots start with a blank white strip above
     the site's header (Meridian Academy's do). Leave it off for templates
     with a white header, or it cuts the header's top edge.
   - It writes `public/templates/<slug>/` and prints the `card` and `tour` code
     for step 3.
   - If it says sharp did not load, run `npm install --no-save sharp` and try
     again.
   - A template that is not in `codester-themes` yet can be captured from its
     live demo instead: full-page screenshots at 1440 and 390 pixels wide,
     named `<page>-1440.png` and `<page>-390.png`. Oscilla's were made this
     way, with `?still` on each address and reduced motion turned on, so its
     WebGL plates and counters hold still.

2. **Add the settings.** In `lib/marketing-templates-catalog.ts`, add an entry
   to `MARKETING_TEMPLATE_CATALOG` with the same `slug`, plus `name`, `niche`,
   `priceUsd` and the three links (`null` until they exist). The list is in
   display order, newest first; with an odd number of templates the first one
   gets the wide card. If the template is listed in
   `MARKETING_TEMPLATES_IN_DESIGN` ("Next up"), remove it there.

3. **Add the page content.** In `lib/marketing-templates.ts`, copy an existing
   entry in `TEMPLATE_CONTENT`, give it the new slug, and fill it in from the
   template's `listing/listing.md`:
   - `title`: the listing title without the template name
   - `metaTitle`: name, niche and "Website Template", under 45 characters
   - `summary`: one sentence for the template cards
   - `description`: two short paragraphs
   - `accent`: the template's main colour, from its `tailwind.config.js`
   - `pageCount`: one per page design, as the listing counts them (Meridian
     Academy's 12 course pages count once), plus `stack`, `fonts`, `version`
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
   their own. The intro text and description on `/templates` and on the
   portfolio's templates shelf name the niches by hand ("academies,
   restaurants, estate agencies..."), so add the new one there.

Rules from the `codester-themes` repository apply here too: never describe a
template as hand-made or made without AI.
