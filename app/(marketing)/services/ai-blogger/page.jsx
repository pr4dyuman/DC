import AIBloggerSection from "@/components/marketing/AIBlogger";
import {
  buildMarketingMetadata,
  getMarketingBreadcrumbJsonLd,
  getMarketingServiceJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "AI Blogger | Digital Corvids",
  description:
    "Discover AI Blogger by Digital Corvids: a content workflow for planning, generating, optimizing, reviewing, and scheduling SEO-focused blog posts.",
  path: "/services/ai-blogger",
  keywords: ["AI Blogger", "AI blog generator", "SEO blog workflow", "AI content planning"],
});

const structuredData = [
  getMarketingServiceJsonLd({
    name: "AI Blogger",
    description:
      "AI-assisted blog planning, drafting, SEO optimization, review, scheduling, and publishing workflow for agencies and growth teams.",
    path: "/services/ai-blogger",
    serviceType: "AI Blog Workflow",
  }),
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "AI Blogger", path: "/services/ai-blogger" },
  ]),
];

export default function AIBloggerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      <AIBloggerSection />
    </>
  );
}
