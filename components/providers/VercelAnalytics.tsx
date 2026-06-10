"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

const INTERNAL_ANALYTICS_PATH_PREFIXES = ["/dashboard", "/super-admin", "/admin"];

function shouldSkipAnalyticsEvent(event: BeforeSendEvent) {
  if (!hasAnalyticsConsent()) return true;

  try {
    const url = new URL(event.url);
    return INTERNAL_ANALYTICS_PATH_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
  } catch {
    return INTERNAL_ANALYTICS_PATH_PREFIXES.some((prefix) => event.url.includes(prefix));
  }
}

export function VercelAnalytics() {
  const consent = useCookieConsent();

  if (consent !== "accepted") {
    return null;
  }

  return (
    <Analytics beforeSend={(event) => (shouldSkipAnalyticsEvent(event) ? null : event)} />
  );
}
