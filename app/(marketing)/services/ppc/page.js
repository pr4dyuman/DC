import ServicePage from "@/components/marketing/services/ServicePage";
import { getMarketingServicePage } from "@/lib/marketing-service-pages";

// The page's content is in lib/marketing-service-pages/ppc.ts; every
// service page shares the ServicePage layout. Metadata is in ./layout.js.
const service = getMarketingServicePage("ppc");

export default function PPCServices() {
  return <ServicePage service={service} />;
}
