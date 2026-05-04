import ManageCompanySection from "@/components/marketing/ManageCompany";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Manage Your Company With AI | Digital Corvids",
  description:
    "Your all-in-one agency management platform. Track projects, manage finances, automate invoicing, and let AI handle the heavy lifting.",
  path: "/services/manage-company",
  image: "/dashboard-mockup.png",
  keywords: ["agency management software", "Agency OS", "AI agency management", "project finance automation"],
});

export default function ManageCompanyPage() {
  return <ManageCompanySection headingLevel="h1" />;
}
