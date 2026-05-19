const GA_QUERY_ALLOWLIST = ["category", "mode", "page", "source"];
const GA_INTERNAL_PATH_PREFIXES = ["/admin", "/api", "/dashboard", "/super-admin"];

const GA_EVENT_CONFIG = {
  contact_form_submitted: {
    name: "generate_lead",
    params: {
      form_name: "contact_us",
      method: "contact_form",
    },
  },
  get_started_click: {
    name: "get_started_click",
    params: {},
  },
  get_started_otp_requested: {
    name: "get_started_otp_requested",
    params: {
      method: "email_otp",
    },
  },
  get_started_signup_completed: {
    name: "sign_up",
    params: {
      method: "email_otp",
    },
  },
  get_started_login_completed: {
    name: "login",
    params: {
      method: "email_password",
    },
  },
  marketing_contact_click: {
    name: "contact_click",
    params: {},
  },
  newsletter_signup: {
    name: "newsletter_signup",
    params: {
      method: "footer_form",
    },
  },
};

const GA_ALLOWED_EVENT_PARAMS = new Set([
  "channel",
  "destination",
  "flow",
  "form_name",
  "has_company_name",
  "has_logo",
  "has_phone",
  "lead_type",
  "method",
  "source",
  "source_path",
]);

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export function isGoogleAnalyticsEnabled() {
  return /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);
}

export function shouldTrackGoogleAnalyticsPath(pathname = "") {
  const normalizedPath = pathname || "/";

  return !GA_INTERNAL_PATH_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
}

export function getSanitizedGoogleAnalyticsPath(pathname = "/", searchParams) {
  const normalizedPath = pathname || "/";
  const safeSearchParams = new URLSearchParams();

  for (const key of GA_QUERY_ALLOWLIST) {
    const values = typeof searchParams?.getAll === "function" ? searchParams.getAll(key) : [];
    for (const value of values) {
      if (value) {
        safeSearchParams.append(key, value.slice(0, 100));
      }
    }
  }

  const query = safeSearchParams.toString();
  return query ? `${normalizedPath}?${query}` : normalizedPath;
}

function ensureGtag() {
  if (typeof window === "undefined") return null;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!window.__dcGaConfigured && isGoogleAnalyticsEnabled()) {
    window.__dcGaConfigured = true;
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      send_page_view: false,
      transport_type: "beacon",
    });
  }

  return window.gtag;
}

function toSnakeCase(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();
}

function sanitizeEventParams(properties = {}) {
  return Object.entries(properties).reduce((params, [key, value]) => {
    const safeKey = toSnakeCase(key);
    if (!GA_ALLOWED_EVENT_PARAMS.has(safeKey)) return params;

    if (typeof value === "boolean") {
      params[safeKey] = value ? "true" : "false";
      return params;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      params[safeKey] = value;
      return params;
    }

    if (typeof value === "string") {
      params[safeKey] = value.slice(0, 100);
    }

    return params;
  }, {});
}

export function trackGoogleAnalyticsPageView({ pathname, searchParams }) {
  if (!isGoogleAnalyticsEnabled() || !shouldTrackGoogleAnalyticsPath(pathname)) return;

  const gtag = ensureGtag();
  if (!gtag) return;

  const pagePath = getSanitizedGoogleAnalyticsPath(pathname, searchParams);
  const pageLocation =
    typeof window !== "undefined" ? `${window.location.origin}${pagePath}` : pagePath;

  gtag("event", "page_view", {
    page_location: pageLocation,
    page_path: pagePath,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  });
}

export function trackGoogleAnalyticsEvent(eventName, properties = {}) {
  if (!isGoogleAnalyticsEnabled()) return;

  const gtag = ensureGtag();
  if (!gtag) return;

  const eventConfig = GA_EVENT_CONFIG[eventName] || { name: eventName, params: {} };

  gtag("event", eventConfig.name, {
    event_category: "marketing",
    ...eventConfig.params,
    ...sanitizeEventParams(properties),
  });
}
