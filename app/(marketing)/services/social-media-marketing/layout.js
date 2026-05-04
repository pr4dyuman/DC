import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Social Media Marketing Services | Digital Corvids",
  description:
    "Grow your brand with Digital Corvids social media marketing: content strategy, creative production, paid social campaigns, analytics, and platform management.",
  path: "/services/social-media-marketing",
  keywords: ["social media marketing services", "social media agency Jaipur", "paid social campaigns", "content strategy"],
});

export default function SocialMediaMarketingLayout({ children }) {
  return children;
}
