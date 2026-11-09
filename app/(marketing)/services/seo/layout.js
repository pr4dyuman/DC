import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "SEO Company in Jaipur | Local SEO Services | Digital Corvids",
  description:
    "SEO services in Jaipur: technical SEO, keyword research, content, local SEO and Google Business Profile, with monthly ranking and lead reports.",
  path: "/services/seo",
  keywords: ["SEO company in Jaipur", "SEO services in Jaipur", "local SEO services Jaipur", "Google Business Profile optimization Jaipur", "technical SEO"],
});

export default function SeoLayout({ children }) {
  return children;
}
