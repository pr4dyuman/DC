import PortfolioPageContent from "@/components/marketing/portfolio/PortfolioPageContent";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

// The full portfolio with sample case studies for every service, so the team
// can see the layout before real results are added. Hidden from search engines
// and linked from nowhere on the site.
export const metadata = buildMarketingMetadata({
  title: "Portfolio Preview | Digital Corvids",
  description: "Internal preview of the Digital Corvids portfolio with sample case studies.",
  path: "/portfolio/preview",
  noIndex: true,
});

export default function PortfolioPreviewPage() {
  return <PortfolioPageContent preview />;
}
