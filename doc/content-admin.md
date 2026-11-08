# Content admin (`/admin`)

A small panel for the marketing site's blog posts, blog categories and
homepage testimonials, for people who should not have Super Admin access.
Super Admin → Blog Management and → Case Studies do more and are the main
tools; this panel covers the everyday edits.

## Signing in

- **Content admins** sign in at `/admin` with an account in the marketing
  database's `admins` collection. The session lasts a day; **Log out** ends it.
- **Super admins** who are signed in to the app can open `/admin` without a
  second password.

## What it changes

| Area | Routes | Notes |
|---|---|---|
| Session | `/api/auth-dc/login`, `/api/auth-dc/me`, `/api/auth-dc/logout` | Login is rate limited. |
| Blog posts | `/api/blog-dc` (list, create), `/api/blog-dc/<id>` (read, update, delete) | Saving refreshes `/blog`, the post and the sitemap. Deleting also removes links to the post from other posts and tells AI Blogger, the same as Super Admin. |
| Cover images | `/api/blog-dc/image` | JPG, PNG, GIF or WebP under about 4 MB, stored in Vercel Blob (or Azure). |
| Categories | `/api/category` | |
| Testimonials | `/api/testimonial` | |

Every change needs a content admin or super admin session (`lib/authMiddleware.js`)
and a request from the site itself. Blog edits are recorded in the blog audit log.
