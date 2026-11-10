import { buildMarketingMetadata } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Agency OS 7-Day Free Trial | Digital Corvids",
  description:
    "Try Agency OS free for 7 days: projects, tasks, invoices, payroll and a client portal for your agency, plus an AI assistant. No credit card required.",
  path: "/get-started",
  keywords: ["Agency OS free trial", "agency management software", "agency project management", "client portal software"],
});

export default function GetStartedLayout({ children }) {
  return children;
}
