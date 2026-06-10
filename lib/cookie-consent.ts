export const COOKIE_CONSENT_STORAGE_KEY = "dc_cookie_consent";
export const COOKIE_CONSENT_CHANGE_EVENT = "dc:cookie-consent-change";
export const COOKIE_SETTINGS_OPEN_EVENT = "dc:cookie-settings-open";

export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export type CookieConsentPreference = "accepted" | "rejected";
export type CookieConsentSnapshot = CookieConsentPreference | "unset" | "loading";

type StoredCookieConsent = {
  version: number;
  analytics: boolean;
  updatedAt: string;
};

type ConsentAwareWindow = Window &
  Record<string, unknown> & {
    __dcGaConfigured?: boolean;
    gtag?: (...args: unknown[]) => void;
  };

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export function parseStoredCookieConsent(
  rawValue: string | null,
  now = Date.now(),
): CookieConsentPreference | null {
  if (!rawValue) return null;

  try {
    const stored = JSON.parse(rawValue) as Partial<StoredCookieConsent>;
    const updatedAt = Date.parse(stored.updatedAt || "");
    const isExpired =
      !Number.isFinite(updatedAt) ||
      updatedAt > now + 24 * 60 * 60 * 1000 ||
      now - updatedAt > COOKIE_CONSENT_MAX_AGE_MS;

    if (
      stored.version !== COOKIE_CONSENT_VERSION ||
      typeof stored.analytics !== "boolean" ||
      isExpired
    ) {
      return null;
    }

    return stored.analytics ? "accepted" : "rejected";
  } catch {
    return null;
  }
}

export function getCookieConsentSnapshot(): CookieConsentSnapshot {
  if (typeof window === "undefined") return "loading";

  try {
    const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const preference = parseStoredCookieConsent(rawValue);

    if (!preference && rawValue) {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    }

    return preference || "unset";
  } catch {
    return "unset";
  }
}

export function hasAnalyticsConsent() {
  return getCookieConsentSnapshot() === "accepted";
}

function expireCookie(name: string, domain?: string) {
  const domainAttribute = domain ? `; Domain=${domain}` : "";
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domainAttribute}`;
}

function deleteGoogleAnalyticsCookies() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const analyticsCookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid" || name.startsWith("_gat"));

  const hostnameParts = window.location.hostname.split(".").filter(Boolean);
  const domains = hostnameParts
    .slice(0, -1)
    .map((_, index) => `.${hostnameParts.slice(index).join(".")}`);

  for (const name of analyticsCookieNames) {
    expireCookie(name);
    for (const domain of domains) {
      expireCookie(name, domain);
    }
  }
}

export function applyAnalyticsConsent(allowed: boolean) {
  if (typeof window === "undefined") return;

  const browserWindow = window as unknown as ConsentAwareWindow;

  if (GA_MEASUREMENT_ID) {
    browserWindow[`ga-disable-${GA_MEASUREMENT_ID}`] = !allowed;
  }

  browserWindow.gtag?.("consent", "update", {
    analytics_storage: allowed ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (!allowed) {
    browserWindow.__dcGaConfigured = false;
    deleteGoogleAnalyticsCookies();
  }
}

export function saveCookieConsent(preference: CookieConsentPreference) {
  if (typeof window === "undefined") return;

  const stored: StoredCookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    analytics: preference === "accepted",
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    return;
  }

  applyAnalyticsConsent(stored.analytics);
  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
}

export function subscribeToCookieConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === COOKIE_CONSENT_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_SETTINGS_OPEN_EVENT));
}
