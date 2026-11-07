import MarketingConversionTracker from "@/components/marketing/MarketingConversionTracker";
import { GoogleAnalytics } from "@/components/providers/GoogleAnalytics";

// Full-screen template demos (/templates/<slug>/demo): the demo gets the whole
// window, so these pages skip the marketing header and footer but keep
// analytics and the template button tracking.
export default function TemplateDemoLayout({ children }) {
  return (
    <div className="bg-black text-white">
      <MarketingConversionTracker />
      <GoogleAnalytics />
      {children}
    </div>
  );
}
