import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Web Development Services | Digital Corvids",
  description:
    "Build fast, secure, conversion-focused websites with Digital Corvids web development, UX design, responsive development, technical SEO, and performance optimization.",
  path: "/services/web-development",
  keywords: ["web development services", "website design Jaipur", "conversion focused websites", "technical SEO websites"],
});

export default function WebDevelopmentLayout({ children }) {
  return children;
}
