import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Contact Digital Corvids | Digital Marketing Agency in Jaipur",
  description:
    "Contact Digital Corvids in Malviya Nagar, Jaipur: call +91-8003177679, chat on WhatsApp or send a message about SEO, ads, social media, websites or video.",
  path: "/contact",
  keywords: ["contact Digital Corvids", "digital marketing agency in Malviya Nagar Jaipur", "digital marketing agency Jaipur contact", "Digital Corvids phone number"],
});

export default function ContactLayout({ children }) {
  return children;
}
