/**
 * Server-safe HTML sanitising for marketing blog posts, used when a post is
 * saved from /admin and when the public post page renders it.
 *
 * isomorphic-dompurify is intentionally NOT used: in Next.js 16 production,
 * dompurify touches browser globals (window/document) when its module loads,
 * which crashes the route or page before it runs. Post HTML comes from the
 * editors and AI Blogger, so a targeted strip of dangerous patterns is enough.
 */
export function sanitizeMarketingBlogHtml(html = ""): string {
    return html
        // Remove script blocks entirely
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        // Remove style blocks entirely
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        // Strip inline event handlers (onclick, onload, onerror, etc.)
        .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
        // Neutralise javascript: URIs
        .replace(/javascript\s*:/gi, "void:");
}
