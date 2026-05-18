"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

const INTERNAL_SPEED_INSIGHTS_PATH_PREFIXES = ["/dashboard", "/super-admin", "/admin"];

type SpeedInsightsEvent = {
  url: string;
  route?: string;
  type: "vital";
};

function shouldSkipSpeedInsightsEvent(event: SpeedInsightsEvent) {
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
  return (
    <SpeedInsights
      beforeSend={(event) => (shouldSkipSpeedInsightsEvent(event) ? null : event)}
    />
  );
}
