import { unstable_cache } from "next/cache";
import dbConnect from "@/lib/marketing-db";
import Blog from "@/models/marketing/Blog";
import {
  LEGACY_REDIRECTED_BLOG_SLUGS,
  REMOVED_BLOG_SLUGS,
  getMarketingBlogPublicCategory,
} from "@/lib/marketing-blog-cleanup";

// Coarse topic from the slug and title only: the stored editorial categories
// are too fragmented to group posts ("SEO API", "SEO Strategy", ...).
function getBlogTopic(blog) {
  return getMarketingBlogPublicCategory({ slug: blog.slug, title: blog.title });
}

function toPlainExcerpt(value = "") {
  const text = String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 160 ? `${text.slice(0, 160).trimEnd()}...` : text;
}

// Published posts that can be linked (no removed or redirecting slugs), newest
// first. One cached list serves the homepage and every post page.
const getCachedMarketingBlogLinks = unstable_cache(
  async () => {
    await dbConnect();
    const blogs = await Blog.find({
      status: "published",
      slug: { $nin: [...REMOVED_BLOG_SLUGS, ...LEGACY_REDIRECTED_BLOG_SLUGS] },
    })
      .select("title category shortDescription metaDescription slug publishedAt createdAt")
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    return blogs
      .filter((blog) => blog.slug && blog.title)
      .map((blog) => ({
        slug: blog.slug,
        href: `/blog/${blog.slug}`,
        title: blog.title,
        category: getMarketingBlogPublicCategory(blog),
        topic: getBlogTopic(blog),
        description: toPlainExcerpt(blog.shortDescription || blog.metaDescription || ""),
      }));
  },
  ["marketing-blog-links"],
  { revalidate: 300, tags: ["marketing-published-blog-list"] }
);

export async function getMarketingBlogLinks() {
  try {
    const links = await getCachedMarketingBlogLinks();
    // Filter again outside the cache so a deploy that retires more slugs takes
    // effect at once instead of after the cached list expires.
    return links.filter(
      (link) => !REMOVED_BLOG_SLUGS.has(link.slug) && !LEGACY_REDIRECTED_BLOG_SLUGS.has(link.slug)
    );
  } catch (error) {
    console.warn("[Blog Links] Failed to load published posts.", error);
    return [];
  }
}

// Same topic first, then other topics. Both start with the posts published
// just before this one and wrap around to the newest, so related links spread
// across all posts instead of all pointing at the newest few.
export function pickRelatedMarketingBlogLinks(links, post, limit = 4) {
  const index = links.findIndex((link) => link.slug === post.slug);
  const ordered = index === -1 ? links : [...links.slice(index + 1), ...links.slice(0, index)];
  const topic = getBlogTopic(post);

  return [
    ...ordered.filter((link) => link.topic === topic),
    ...ordered.filter((link) => link.topic !== topic),
  ].slice(0, limit);
}
