import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Get Started With Digital Corvids | Growth Strategy Call",
  description:
    "Start your Digital Corvids project for SEO, websites, PPC, social media, video production, influencer campaigns, or AI-powered blog workflows.",
  path: "/get-started",
  keywords: ["start digital marketing project", "Digital Corvids get started", "growth strategy call"],
});

export default function GetStartedLayout({ children }) {
  return children;
}
