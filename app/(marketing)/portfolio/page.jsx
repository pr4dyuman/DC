import PortfolioPageContent from "@/components/marketing/portfolio/PortfolioPageContent";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Selected Work | Digital Corvids Portfolio",
  description:
    "Explore selected Digital Corvids client websites and web apps with live walkthroughs, and see how we report SEO, social, ads, video and influencer work.",
  path: "/portfolio",
  keywords: [
    "Digital Corvids portfolio",
    "digital agency portfolio Jaipur",
    "web app development portfolio",
    "website development portfolio",
    "ecommerce website portfolio",
  ],
});

export default function PortfolioPage() {
  return <PortfolioPageContent />;
}
