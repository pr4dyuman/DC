import ManageCompanySection from "@/components/marketing/ManageCompany";
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
  image: "/dashboard-mockup-640-q84.jpg",
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

export default function ManageCompanyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />
      <ManageCompanySection headingLevel="h1" imagePriority />
    </>
  );
}
