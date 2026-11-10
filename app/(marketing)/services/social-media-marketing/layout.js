import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Social Media Marketing Agency in Jaipur | Digital Corvids",
  description:
    "Social media marketing in Jaipur for Instagram, Facebook, LinkedIn and Pinterest: content and reels, paid social ads and monthly analytics. Get a free plan.",
  path: "/services/social-media-marketing",
  image: "/og-image?title=Social%20Media%20Marketing%20in%20Jaipur",
  keywords: ["social media marketing agency in Jaipur", "Instagram marketing agency Jaipur", "social media marketing company Jaipur", "social media management Jaipur"],
});

export default function SocialMediaMarketingLayout({ children }) {
  return children;
}
