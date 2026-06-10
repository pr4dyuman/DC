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
import { useCookieConsent } from "@/hooks/useCookieConsent";

function GoogleAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useCookieConsent();
  const shouldTrackPath = shouldTrackGoogleAnalyticsPath(pathname);

  useEffect(() => {
    if (consent !== "accepted") return;
    trackGoogleAnalyticsPageView({ pathname, searchParams });
  }, [consent, pathname, searchParams]);

  if (consent !== "accepted" || !isGoogleAnalyticsEnabled() || !shouldTrackPath) {
    return null;
  }

  return (
    <Script
      id="ga-script"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="lazyOnload"
    />
  );
}

export function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner />
    </Suspense>
  );
}
