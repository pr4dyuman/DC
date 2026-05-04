import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "PPC Advertising Services | Digital Corvids",
  description:
    "Launch performance-focused PPC campaigns with Digital Corvids across Google, Bing, and social platforms, with testing, tracking, bid management, and ROI reporting.",
  path: "/services/ppc",
  keywords: ["PPC advertising services", "Google Ads agency", "paid media agency", "PPC agency Jaipur"],
});

export default function PpcLayout({ children }) {
  return children;
}
