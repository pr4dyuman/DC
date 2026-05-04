import AIBloggerSection from "@/components/marketing/AIBlogger";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "AI Blogger | Digital Corvids",
  description:
    "Discover AI Blogger by Digital Corvids: a content workflow for planning, generating, optimizing, reviewing, and scheduling SEO-focused blog posts.",
  path: "/services/ai-blogger",
  keywords: ["AI Blogger", "AI blog generator", "SEO blog workflow", "AI content planning"],
});

export default function AIBloggerPage() {
  return <AIBloggerSection />;
}
