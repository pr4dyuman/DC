import ServicePage from "@/components/marketing/services/ServicePage";
import { getMarketingServicePage } from "@/lib/marketing-service-pages";

// The page's content is in lib/marketing-service-pages/seo.ts; every
// service page shares the ServicePage layout. Metadata is in ./layout.js.
const service = getMarketingServicePage("seo");

export default function SEOServices() {
  return <ServicePage service={service} />;
}
