import AIBloggerSection from "@/components/marketing/AIBlogger";
import RelatedArticlesSection from "@/components/marketing/RelatedArticlesSection";
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

const relatedAIBloggerServices = [
  {
    title: "SEO Services",
    href: "/services/seo",
    category: "Organic Growth",
    description: "Connect AI-assisted content planning with technical SEO, internal links, and search intent.",
  },
  {
    title: "Web Development",
    href: "/services/web-development",
    category: "Publishing Foundation",
    description: "Build fast, crawlable blog and landing page experiences that support content performance.",
  },
  {
    title: "Social Media Marketing",
    href: "/services/social-media-marketing",
    category: "Distribution",
    description: "Turn blog ideas into platform-ready social content, campaigns, and recurring calendars.",
  },
  {
    title: "Manage Company",
    href: "/services/manage-company",
    category: "Workflow Control",
    description: "Coordinate content operations with broader agency projects, teams, and reporting.",
  },
];

const relatedAIBloggerArticles = [
  {
    title: "The 2026 SEO Management Workflow",
    href: "/blog/the-2026-seo-management-workflow-scaling-content-with-ai",
    category: "SEO Workflow",
    description: "See how AI-assisted content, editorial checks, and SEO operations can work together.",
  },
  {
    title: "Brand Voice Guardrails For AI Assets",
    href: "/blog/brand-voice-insurance-editorial-guardrails-for-ai-generated-assets",
    category: "Editorial Quality",
    description: "Build review guardrails that keep AI-generated content consistent, useful, and brand-safe.",
  },
  {
    title: "High-ROI Content Distribution",
    href: "/blog/how-to-build-a-high-roi-content-distribution-engine-for-2026",
    category: "Distribution",
    description: "Turn published blog content into a wider distribution engine across search and campaigns.",
  },
];

export default function AIBloggerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      <AIBloggerSection />
      <div className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <RelatedArticlesSection
            eyebrow="Connected Services"
            title="Support The Content Engine"
            description="AI Blogger works best when content strategy, SEO, site performance, social distribution, and agency workflow stay aligned."
            articles={relatedAIBloggerServices}
            actionLabel="Explore Service"
          />
          <RelatedArticlesSection
            eyebrow="AI Content Reading List"
            title="Guides For Better AI-Assisted Content"
            description="Use these Digital Corvids articles to connect AI content production with SEO, brand voice, and distribution."
            articles={relatedAIBloggerArticles}
          />
        </div>
      </div>
    </>
  );
}
