import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Influencer Marketing Services | Digital Corvids",
  description:
    "Plan and manage influencer campaigns with Digital Corvids, including creator discovery, campaign strategy, content coordination, performance tracking, and ROI reporting.",
  path: "/services/influencer-marketing",
  keywords: ["influencer marketing services", "creator campaigns", "influencer agency Jaipur", "brand creator strategy"],
});

export default function InfluencerMarketingLayout({ children }) {
  return children;
}
