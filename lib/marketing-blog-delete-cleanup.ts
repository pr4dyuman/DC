import { MARKETING_SITE_URL } from "@/lib/marketing-seo";

export interface DeletedBlogLinkTarget {
  slug?: string;
  canonicalUrl?: string;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withoutTrailingSlash(value: string) {
  if (value === "/") {
    return value;
  }

  return value.replace(/\/+$/, "");
}

function addHrefCandidate(candidates: Set<string>, value?: string) {
  const raw = value?.trim();
  if (!raw) {
    return;
  }

  candidates.add(raw);
  candidates.add(withoutTrailingSlash(raw));

  if (!raw.endsWith("/")) {
    candidates.add(`${raw}/`);
  }
}

function getOrigin(value?: string) {
  const fallback = MARKETING_SITE_URL || "https://digitalcorvids.com";
  const raw = value?.trim() || fallback;

  try {
    return new URL(raw).origin.replace(/\/+$/, "");
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

export function buildDeletedBlogHrefCandidates(
  target: DeletedBlogLinkTarget,
  siteUrl?: string,
) {
  const candidates = new Set<string>();
  const slug = target.slug?.trim().replace(/^\/+|\/+$/g, "");

  if (slug) {
    const path = `/blog/${slug}`;
    const origin = getOrigin(siteUrl);

    addHrefCandidate(candidates, path);
    addHrefCandidate(candidates, `${origin}${path}`);
    addHrefCandidate(candidates, `https://www.digitalcorvids.com${path}`);
  }

  if (target.canonicalUrl) {
    addHrefCandidate(candidates, target.canonicalUrl);

    try {
      const parsed = new URL(target.canonicalUrl);
      addHrefCandidate(candidates, `${parsed.pathname}${parsed.search}${parsed.hash}`);
    } catch {
      // Keep only the raw canonical string for non-URL values.
    }
  }

  return Array.from(candidates).filter((candidate) => candidate && candidate !== "/");
}

export function stripDeletedBlogLinksFromContent(content: string, hrefCandidates: string[]) {
  if (!content || hrefCandidates.length === 0) {
    return content;
  }

  let nextContent = content;
  const sortedCandidates = [...new Set(hrefCandidates)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const candidate of sortedCandidates) {
    const escapedHref = escapeRegex(candidate);
    const markdownLinkPattern = new RegExp(
      `\\[([^\\]]+)\\]\\(\\s*${escapedHref}\\s*(?:\"[^\"]*\")?\\)`,
      "gi",
    );
    const htmlLinkPattern = new RegExp(
      `<a\\b(?=[^>]*\\bhref\\s*=\\s*["']${escapedHref}["'])[^>]*>([\\s\\S]*?)<\\/a>`,
      "gi",
    );

    nextContent = nextContent.replace(markdownLinkPattern, "$1");
    nextContent = nextContent.replace(htmlLinkPattern, "$1");
  }

  return nextContent;
}
