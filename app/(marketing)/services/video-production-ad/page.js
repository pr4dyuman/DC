import ServicePage from "@/components/marketing/services/ServicePage";
import { getMarketingServicePage } from "@/lib/marketing-service-pages";

// The page's content is in lib/marketing-service-pages/video-production-ad.ts; every
// service page shares the ServicePage layout. Metadata is in ./layout.js.
const service = getMarketingServicePage("video-production-ad");

export default function VideoProductionServices() {
  return <ServicePage service={service} />;
}
