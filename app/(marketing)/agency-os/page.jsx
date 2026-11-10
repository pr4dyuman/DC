import ManageCompanySection from "@/components/marketing/ManageCompany";
import RelatedArticlesSection from "@/components/marketing/RelatedArticlesSection";
import { MARKETING_PRODUCTS } from "@/lib/marketing-products";
import {
  MARKETING_SITE_URL,
  buildMarketingMetadata,
  getMarketingBreadcrumbJsonLd,
  marketingAbsoluteUrl,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

// Agency OS is a product, so it lives under Products. Its old address,
// /services/manage-company, redirects here (next.config.ts).
const DESCRIPTION =
  "Agency OS gives your team one place for projects, invoices and people, and every client a portal to follow their work. Free for 7 days.";

export const metadata = buildMarketingMetadata({
  title: "Agency OS: Agency Management Software | Digital Corvids",
  description: DESCRIPTION,
  path: "/agency-os",
  image: "/dashboard-mockup-1600-q92.webp",
  keywords: [
    "Agency OS",
    "agency management software",
    "client portal software",
    "AI agency management",
    "project and invoice management",
  ],
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Agency OS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: DESCRIPTION,
    url: marketingAbsoluteUrl("/agency-os"),
    image: marketingAbsoluteUrl("/dashboard-mockup-1600-q92.webp"),
    publisher: { "@id": `${MARKETING_SITE_URL}/#organization` },
  },
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    { name: "Agency OS", path: "/agency-os" },
  ]),
];

const otherProducts = MARKETING_PRODUCTS.filter((product) => product.id !== "agency-os").map((product) => ({
  title: product.name,
  href: product.href,
  category: product.external ? "Separate website" : "Product",
  description: product.description,
}));

const relatedAgencyOsArticles = [
  {
    title: "Custom Web App Architecture For Growing Businesses",
    href: "/blog/customized-web-application-development-architecture",
    category: "Business Systems",
    description: "Learn how custom web application architecture connects core layers and balances scalability with maintainability.",
  },
  {
    title: "Conversion Funnel Mapping And Optimization",
    href: "/blog/conversion-funnel-mapping-and-optimization-to-stop-leaks",
    category: "Performance Tracking",
    description: "Track funnel leaks in GA4, analyze user behavior, and optimize touchpoints across your conversion funnel.",
  },
  {
    title: "Building Data-Driven PPC Campaigns",
    href: "/blog/building-data-driven-ppc-campaigns-the-modern-roi-framework",
    category: "Growth Tracking",
    description: "Merge clean data analysis with performance creative to run transparent PPC campaigns and improve ROI.",
  },
];

export default function AgencyOsPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      <ManageCompanySection
        headingLevel="h1"
        eyebrow="agency management software for agencies tired of chasing updates"
        showServiceLink={false}
        showFeatures
      />
      <div className="bg-black text-white">
        <div className="mx-auto max-w-[var(--site-frame)] px-[var(--site-gutter)] pb-16 sm:pb-20 lg:pb-24">
          <RelatedArticlesSection
            eyebrow="Also From Digital Corvids"
            title="More Products"
            description="Other things our team has built: ready-made websites you can launch quickly, and a tool for planning SEO content."
            articles={otherProducts}
            actionLabel="Explore Product"
          />
          <RelatedArticlesSection
            eyebrow="Growth Systems Reading List"
            title="Guides For Connected Business Systems"
            description="Use these Digital Corvids articles to plan scalable business systems, funnel tracking, and data-driven growth reporting."
            articles={relatedAgencyOsArticles}
          />
        </div>
      </div>
    </main>
  );
}
