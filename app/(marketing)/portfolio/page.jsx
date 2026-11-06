import PortfolioPageContent from "@/components/marketing/portfolio/PortfolioPageContent";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Selected Work | Digital Corvids Portfolio",
  description:
    "Explore selected Digital Corvids client websites and web apps with live walkthroughs, plus the website templates we design and sell.",
  path: "/portfolio",
  keywords: [
    "Digital Corvids portfolio",
    "digital agency portfolio Jaipur",
    "web app development portfolio",
    "website development portfolio",
    "ecommerce website portfolio",
    "website templates",
  ],
});

export default function PortfolioPage() {
  return <PortfolioPageContent />;
}
