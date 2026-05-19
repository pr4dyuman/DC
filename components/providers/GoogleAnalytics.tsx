"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsEnabled,
  shouldTrackGoogleAnalyticsPath,
  trackGoogleAnalyticsPageView,
} from "@/lib/google-analytics";

function GoogleAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldTrackPath = shouldTrackGoogleAnalyticsPath(pathname);

  useEffect(() => {
    trackGoogleAnalyticsPageView({ pathname, searchParams });
  }, [pathname, searchParams]);

  if (!isGoogleAnalyticsEnabled() || !shouldTrackPath) {
    return null;
  }

  return (
    <>
      <Script
        id="ga-data-layer"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
if (!window.__dcGaConfigured) {
  window.__dcGaConfigured = true;
  window.gtag('js', new Date());
  window.gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)}, {
    anonymize_ip: true,
    send_page_view: false,
    transport_type: 'beacon'
  });
}
          `.trim(),
        }}
      />
      <Script
        id="ga-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
    </>
  );
}

export function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner />
    </Suspense>
  );
}
