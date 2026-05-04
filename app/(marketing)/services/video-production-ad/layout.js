import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Video Production and Ad Films | Digital Corvids",
  description:
    "Create high-impact videos and ad films with Digital Corvids, from pre-production and scripting to production, post-production, distribution, and performance creative.",
  path: "/services/video-production-ad",
  keywords: ["video production agency", "ad films", "brand videos", "video production Jaipur"],
});

export default function VideoProductionLayout({ children }) {
  return children;
}
