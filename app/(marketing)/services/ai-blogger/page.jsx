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
    title: "Restructure Headings For Passage Ranking",
    href: "/blog/restructure-content-headings-passage-ranking-visibility",
    category: "SEO Writing",
    description: "Turn long-form headings into modular, answer-focused sections that search engines can evaluate and surface.",
  },
  {
    title: "Is AI-Generated Content Good For SEO?",
    href: "/blog/is-ai-generated-content-good-for-seo-the-strategic-playbook",
    category: "Editorial Quality",
    description: "See how AI-generated content affects SEO, what search guidelines say, and how to build a safe, human-led workflow.",
  },
  {
    title: "2026 Social Media Marketing Trends",
    href: "/blog/2026-social-media-marketing-trends-operationalizing-ai-and-creative",
    category: "Social Trends",
    description: "See the trends shaping AI content, social commerce, and social media workflows, with practical next steps.",
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
            description="Use these Digital Corvids articles to connect AI content production with SEO writing, editorial quality, and social trends."
            articles={relatedAIBloggerArticles}
          />
        </div>
      </div>
    </>
  );
}
