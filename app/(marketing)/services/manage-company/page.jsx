import ManageCompanySection from "@/components/marketing/ManageCompany";
import RelatedArticlesSection from "@/components/marketing/RelatedArticlesSection";
import {
  buildMarketingMetadata,
  getMarketingBreadcrumbJsonLd,
  getMarketingServiceJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Manage Your Company With AI | Digital Corvids",
  description:
    "Your all-in-one agency management platform. Track projects, manage finances, automate invoicing, and let AI handle the heavy lifting.",
  path: "/services/manage-company",
  image: "/dashboard-mockup-1600-q92.webp",
  keywords: ["agency management software", "Agency OS", "AI agency management", "project finance automation"],
});

const structuredData = [
  getMarketingServiceJsonLd({
    name: "Manage Your Company With AI",
    description:
      "Agency management platform for tracking projects, managing finances, automating invoicing, coordinating teams, and using AI assistance across operations.",
    path: "/services/manage-company",
    serviceType: "Agency Management Software",
  }),
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Manage Your Company With AI", path: "/services/manage-company" },
  ]),
];

const relatedManageCompanyServices = [
  {
    title: "AI Blogger",
    href: "/services/ai-blogger",
    category: "Content Operations",
    description: "Add a structured AI content workflow to your agency operating system.",
  },
  {
    title: "Web Development",
    href: "/services/web-development",
    category: "Client Portals",
    description: "Build fast, reliable web experiences that support client and team workflows.",
  },
  {
    title: "PPC Advertising",
    href: "/services/ppc",
    category: "Growth Tracking",
    description: "Connect campaign spend, lead quality, and reporting with clearer business outcomes.",
  },
];

const relatedManageCompanyArticles = [
  {
    title: "AI-Powered Financial Intelligence For Agency Operations",
    href: "/blog/how-ai-powered-financial-intelligence-improves-agency-operations-2026",
    category: "Agency Finance",
    description: "See how AI can improve agency finance visibility, operations decisions, and workflow control.",
  },
  {
    title: "Manage Your Company With AI-Driven Workflows",
    href: "/blog/how-to-manage-your-company-with-ai-driven-workflows-in-2026",
    category: "Operations",
    description: "Explore practical ways AI workflows can organize projects, teams, and recurring agency tasks.",
  },
  {
    title: "Enterprise AI Distribution Strategy",
    href: "/blog/enterprise-ai-distribution-strategy-2026-scaling-agentic-workflows",
    category: "AI Operations",
    description: "Plan how agentic workflows, content distribution, and operations systems can scale together.",
  },
];

export default function ManageCompanyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      <ManageCompanySection headingLevel="h1" imagePriority />
      <div className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <RelatedArticlesSection
            eyebrow="Connected Services"
            title="Build The Operating System Around Growth"
            description="Manage Company works best when operations, content, web infrastructure, and campaign reporting stay connected."
            articles={relatedManageCompanyServices}
            actionLabel="Explore Service"
          />
          <RelatedArticlesSection
            eyebrow="Agency Operations Reading List"
            title="Guides For AI-Powered Management"
            description="Use these Digital Corvids articles to plan more organized agency workflows, finance visibility, and management systems."
            articles={relatedManageCompanyArticles}
          />
        </div>
      </div>
    </>
  );
}
