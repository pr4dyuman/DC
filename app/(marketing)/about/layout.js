import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "About Digital Corvids | Digital Marketing Team in Jaipur",
  description:
    "Meet Digital Corvids, a Jaipur digital marketing team helping brands grow through SEO, paid media, social content, websites, video, and practical strategy.",
  path: "/about",
  keywords: ["Digital Corvids about", "digital marketing team Jaipur", "marketing agency Jaipur"],
});

export default function AboutLayout({ children }) {
  return children;
}
