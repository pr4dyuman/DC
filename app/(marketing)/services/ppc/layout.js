import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Google Ads & PPC Agency in Jaipur | Digital Corvids",
  description:
    "Google Ads, Meta, LinkedIn and Microsoft ads managed from Jaipur: campaign planning, ad copy, bidding and tracking, with reports on leads, sales and ROAS.",
  path: "/services/ppc",
  keywords: ["Google Ads agency in Jaipur", "PPC company in Jaipur", "Facebook ads agency Jaipur", "Meta ads agency Jaipur", "performance marketing agency Jaipur"],
});

export default function PpcLayout({ children }) {
  return children;
}
