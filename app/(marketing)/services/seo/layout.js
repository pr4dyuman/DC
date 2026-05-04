import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "SEO Services in Jaipur | Digital Corvids",
  description:
    "Improve organic visibility with Digital Corvids SEO services: technical SEO, keyword strategy, content planning, on-page optimization, and transparent reporting.",
  path: "/services/seo",
  keywords: ["SEO services Jaipur", "technical SEO", "SEO agency Jaipur", "keyword research"],
});

export default function SeoLayout({ children }) {
  return children;
}
