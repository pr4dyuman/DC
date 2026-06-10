"use client";

import { useSyncExternalStore } from "react";
import {
  getCookieConsentSnapshot,
  subscribeToCookieConsent,
  type CookieConsentSnapshot,
} from "@/lib/cookie-consent";

const getServerSnapshot = (): CookieConsentSnapshot => "loading";

export function useCookieConsent() {
  return useSyncExternalStore(
    subscribeToCookieConsent,
    getCookieConsentSnapshot,
    getServerSnapshot,
  );
}
