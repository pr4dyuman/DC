import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Digital Marketing Services | Digital Corvids",
  description:
    "Explore Digital Corvids services for SEO, PPC advertising, social media marketing, web development, video production, and influencer marketing.",
  path: "/services",
  keywords: ["digital marketing services", "SEO services", "PPC advertising", "social media marketing", "web development"],
});

export default function ServicesLayout({ children }) {
  return children;
}
