import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Digital Corvids Admin",
  description: "Private Digital Corvids administration area for managing website content.",
  path: "/admin",
  noIndex: true,
});

export default function AdminLayout({ children }) {
  return children;
}
