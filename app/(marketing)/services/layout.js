import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Digital Marketing Services in Jaipur | Digital Corvids",
  description:
    "SEO, Google and Meta ads, social media, website development, video production and influencer marketing from one team in Jaipur. Start with a free plan.",
  path: "/services",
  keywords: ["digital marketing services in Jaipur", "digital marketing packages Jaipur", "SEO services Jaipur", "Google Ads agency Jaipur", "social media marketing Jaipur", "website development Jaipur"],
});

export default function ServicesLayout({ children }) {
  return children;
}
