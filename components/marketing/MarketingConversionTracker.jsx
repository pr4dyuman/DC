"use client";

import { useEffect } from "react";
import { MARKETING_EVENTS, trackMarketingEvent } from "@/lib/marketing-analytics";

function getAnchorDestination(anchor) {
  const rawHref = anchor.getAttribute("href") || "";
  const fullHref = anchor.href || rawHref;

  if (rawHref.startsWith("mailto:")) {
    return { channel: "email", destination: "mailto" };
  }

  if (rawHref.startsWith("tel:")) {
    return { channel: "phone", destination: "tel" };
  }

  try {
    const url = new URL(fullHref, window.location.origin);
    const normalizedPath = url.pathname.replace(/\/$/, "") || "/";
    const host = url.hostname.replace(/^www\./, "");

    if (host === "wa.me" || host === "api.whatsapp.com") {
      return { channel: "whatsapp", destination: host };
    }

    if (host.includes("instagram.com")) {
      return { channel: "instagram", destination: host };
    }

    if (host.includes("linkedin.com")) {
      return { channel: "linkedin", destination: host };
    }

    if (host.includes("facebook.com")) {
      return { channel: "facebook", destination: host };
    }

    if (url.origin === window.location.origin && normalizedPath === "/get-started") {
      return { channel: "get_started", destination: normalizedPath };
    }
  } catch {
    return null;
  }

  return null;
}

export default function MarketingConversionTracker() {
  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!anchor) return;

      const conversion = getAnchorDestination(anchor);
      if (!conversion) return;

      const eventName =
        conversion.channel === "get_started"
          ? MARKETING_EVENTS.getStartedClick
          : MARKETING_EVENTS.marketingContactClick;

      trackMarketingEvent(eventName, {
        channel: conversion.channel,
        destination: conversion.destination,
        sourcePath: window.location.pathname,
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
