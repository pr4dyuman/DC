import ServicePage from "@/components/marketing/services/ServicePage";
import { getMarketingServicePage } from "@/lib/marketing-service-pages";

// The page's content is in lib/marketing-service-pages/influencer-marketing.ts; every
// service page shares the ServicePage layout. Metadata is in ./layout.js.
const service = getMarketingServicePage("influencer-marketing");

export default function InfluencerMarketingServices() {
  return <ServicePage service={service} />;
}
