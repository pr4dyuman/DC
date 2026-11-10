# Blog fixes from the November search data review

The blog text these fixes change lives in the database, not in the code, so
they are applied by running a script against it. They come from
`doc/search-data-review-2026-11.md`:

- The Jaipur SEO article:
  - a new meta title and description
  - the garbled scorecard heading fixed
  - "400%" taken out of a heading
  - one link to `/services/seo` worded "SEO company in Jaipur", with the
    sentence rewritten so it still reads well
- Five articles get meta titles short enough that Google shows them in full,
  and the technical SEO article gets a real description.

The Jaipur article's title and description leave out cost until its "what
SEO costs in Jaipur" section is written with real prices.

## Run it

From the repository root, on a computer whose `.env.local` holds the
production `MONGODB_URI` (and `MARKETING_DB_URI`, if the blog uses its own
cluster):

```bash
node --env-file=.env.local scripts/blog-fixes-2026-11/apply-review-fixes.mjs
```

The first command is a dry run: it lists every change and every skip. Then:

```bash
node --env-file=.env.local scripts/blog-fixes-2026-11/apply-review-fixes.mjs --apply
```

The script skips anything that no longer matches what was there on 10 November,
so it never overwrites an edit made since in the blog editor. Skipped items
are listed for the editor instead. Running it twice is safe.

## Undo

Before writing, it saves the original posts to `backups/` (git-ignored). To
restore a post, set its saved fields back.
