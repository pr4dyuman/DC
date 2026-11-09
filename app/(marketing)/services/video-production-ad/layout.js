import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Video Production & Ad Film Company in Jaipur | Digital Corvids",
  description:
    "Video production and ad films in Jaipur: concept, scripting, shoots, editing and distribution for ads, reels, YouTube and brand stories.",
  path: "/services/video-production-ad",
  keywords: ["video production company in Jaipur", "ad film production house in Jaipur", "ad film makers in Jaipur", "corporate video production Jaipur", "reels production Jaipur"],
});

export default function VideoProductionLayout({ children }) {
  return children;
}
