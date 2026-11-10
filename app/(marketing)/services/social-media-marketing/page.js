import ServicePage from "@/components/marketing/services/ServicePage";
import { getMarketingServicePage } from "@/lib/marketing-service-pages";

// The page's content is in lib/marketing-service-pages/social-media-marketing.ts; every
// service page shares the ServicePage layout. Metadata is in ./layout.js.
const service = getMarketingServicePage("social-media-marketing");

export default function SocialMediaMarketingServices() {
  return <ServicePage service={service} />;
}
