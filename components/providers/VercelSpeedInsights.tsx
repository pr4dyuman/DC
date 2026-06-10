"use client";

import { SpeedInsights } from "@vercel/speed-insights/react";
import { usePathname } from "next/navigation";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";

const INTERNAL_SPEED_INSIGHTS_PATH_PREFIXES = ["/dashboard", "/super-admin", "/admin"];

type SpeedInsightsEvent = {
  url: string;
  route?: string;
  type: "vital";
};

function shouldSkipSpeedInsightsEvent(event: SpeedInsightsEvent) {
  if (!hasAnalyticsConsent()) return true;

  try {
    const url = new URL(event.url);
    return INTERNAL_SPEED_INSIGHTS_PATH_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
  } catch {
    return INTERNAL_SPEED_INSIGHTS_PATH_PREFIXES.some((prefix) => event.url.includes(prefix));
  }
}

export function VercelSpeedInsights() {
  const pathname = usePathname();
  const consent = useCookieConsent();

  if (consent !== "accepted") {
    return null;
  }

  return (
    <SpeedInsights
      framework="next"
      route={pathname || undefined}
      beforeSend={(event) => (shouldSkipSpeedInsightsEvent(event) ? null : event)}
    />
  );
}
