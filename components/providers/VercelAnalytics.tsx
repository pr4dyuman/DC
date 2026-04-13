"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const INTERNAL_ANALYTICS_PATH_PREFIXES = ["/dashboard", "/super-admin", "/admin"];

function shouldSkipAnalyticsEvent(event: BeforeSendEvent) {
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
  return (
    <Analytics beforeSend={(event) => (shouldSkipAnalyticsEvent(event) ? null : event)} />
  );
}
