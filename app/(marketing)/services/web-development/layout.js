import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Website Development Company in Jaipur | Digital Corvids",
  description:
    "Website development in Jaipur: fast, mobile-friendly business websites, online stores and web apps, with UX design, technical SEO and performance built in.",
  path: "/services/web-development",
  image: "/og-image?title=Website%20Development%20in%20Jaipur",
  keywords: ["website development company in Jaipur", "website designing company in Jaipur", "web development Jaipur", "Shopify website development Jaipur", "ecommerce website development Jaipur"],
});

export default function WebDevelopmentLayout({ children }) {
  return children;
}
