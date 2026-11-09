import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Influencer Marketing Agency in Jaipur | Digital Corvids",
  description:
    "Influencer marketing in Jaipur: creator discovery and vetting, campaign briefs, content and paid amplification, with tracking of reach, sales and ROI.",
  path: "/services/influencer-marketing",
  keywords: ["influencer marketing agency in Jaipur", "Jaipur influencers for brand promotion", "micro influencer marketing India", "creator campaigns"],
});

export default function InfluencerMarketingLayout({ children }) {
  return children;
}
