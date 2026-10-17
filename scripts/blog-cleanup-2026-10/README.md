# Blog cleanup, October 2026

One-off scripts for the blog cleanup that ships with the `seo/2026-10-16-blog-cleanup` branch.
Run them from the repository root with the production database variables
(`MONGODB_URI`, and `MARKETING_DB_URI` if the blog uses its own cluster). Both
scripts are dry runs unless you add `--apply`, and both save a JSON backup in
`backups/` (git-ignored) before they change anything.

## Order

1. Deploy the branch. From then on the 73 removed posts redirect (57) or return
   404 (16), and they are hidden from `/blog` and the sitemap.
2. Delete the removed posts from the database:

   ```bash
   node --env-file=.env.local scripts/blog-cleanup-2026-10/delete-removed-posts.mjs          # check the list
   node --env-file=.env.local scripts/blog-cleanup-2026-10/delete-removed-posts.mjs --apply
   ```

   This mirrors the super-admin bulk delete: it removes the posts, removes
   `internalLinks` entries that point at them, repoints inline links to the
   redirect target (or unlinks them for the 404 posts) and marks the matching
   AI Blogger posts as no longer published.
3. Apply the reviewed text fixes to the 23 kept posts:

   ```bash
   node --env-file=.env.local scripts/blog-cleanup-2026-10/apply-kept-post-fixes.mjs          # shows every match
   node --env-file=.env.local scripts/blog-cleanup-2026-10/apply-kept-post-fixes.mjs --apply
   ```

   Edits that don't match the stored text are reported as `SKIP` and left for
   the super-admin editor; nothing is changed by guesswork.
4. Delete or unpublish the same 73 posts in zSEO as well, so the webhook does
   not send them again.

## Undo

Each backup file holds the original documents. Restore a post by re-inserting
its document (deleted posts) or by setting its saved fields back (edited posts).
