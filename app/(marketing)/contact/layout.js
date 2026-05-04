import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Contact Digital Corvids | Digital Marketing Agency Jaipur",
  description:
    "Contact Digital Corvids for SEO, PPC, social media marketing, web development, video production, influencer marketing, and AI blogging support.",
  path: "/contact",
  keywords: ["contact Digital Corvids", "digital marketing agency contact", "SEO agency Jaipur contact"],
});

export default function ContactLayout({ children }) {
  return children;
}
