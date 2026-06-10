"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Settings2, X } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import {
  applyAnalyticsConsent,
  COOKIE_SETTINGS_OPEN_EVENT,
  saveCookieConsent,
} from "@/lib/cookie-consent";

const INTERNAL_PATH_PREFIXES = ["/dashboard", "/super-admin", "/admin", "/api"];

function isInternalPath(pathname: string) {
  return INTERNAL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function CookieConsentBanner() {
  const pathname = usePathname();
  const consent = useCookieConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    if (consent === "loading") return;
    applyAnalyticsConsent(consent === "accepted");
  }, [consent]);

  useEffect(() => {
    const handleOpenSettings = () => {
      setAnalyticsAllowed(consent === "accepted");
      setShowDetails(true);
      setSettingsOpen(true);
    };

    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettings);
  }, [consent]);

  const decide = (allowed: boolean) => {
    saveCookieConsent(allowed ? "accepted" : "rejected");
    setAnalyticsAllowed(allowed);
    setSettingsOpen(false);
    setShowDetails(false);
  };

  if (
    consent === "loading" ||
    isInternalPath(pathname) ||
    (consent !== "unset" && !settingsOpen)
  ) {
    return null;
  }

  const canClose = consent === "accepted" || consent === "rejected";

  return (
    <section
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-5xl rounded-2xl border border-white/20 bg-[#090909]/95 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      {canClose && (
        <button
          type="button"
          aria-label="Close cookie settings"
          onClick={() => {
            setSettingsOpen(false);
            setShowDetails(false);
          }}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5EE30]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      <div className={canClose ? "pr-10" : ""}>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#F5EE30]">
          Your privacy choices
        </p>
        <h2 id="cookie-consent-title" className="font-suifak text-3xl sm:text-4xl">
          Cookies and analytics
        </h2>
        <p
          id="cookie-consent-description"
          className="mt-2 max-w-3xl font-glacial text-sm leading-6 text-gray-300 sm:text-base"
        >
          We use essential storage for features such as login, security, and preferences.
          With your permission, we also use Google Analytics, Vercel Analytics, and Speed
          Insights to understand and improve the website.
        </p>
      </div>

      {showDetails && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-[#F5EE30] p-1 text-black">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-glacial-bold text-base">Essential</h3>
                <p className="mt-1 font-glacial text-sm leading-5 text-gray-400">
                  Required for authentication, security, forms, consent choices, and appearance
                  preferences. These cannot be switched off.
                </p>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/15 bg-white/[0.04] p-4">
            <span>
              <span className="block font-glacial-bold text-base">Analytics</span>
              <span className="mt-1 block font-glacial text-sm leading-5 text-gray-400">
                Helps us measure visits and improve performance. Disabled unless you allow it.
              </span>
            </span>
            <input
              type="checkbox"
              checked={analyticsAllowed}
              onChange={(event) => setAnalyticsAllowed(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#F5EE30]"
            />
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {showDetails ? (
          <button
            type="button"
            onClick={() => decide(analyticsAllowed)}
            className="rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
          >
            Save choices
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => decide(true)}
              className="rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              Accept analytics
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              className="rounded-full border border-white bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              Reject analytics
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalyticsAllowed(false);
                setShowDetails(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Manage preferences
            </button>
          </>
        )}

        <Link
          href="/privacy"
          prefetch={false}
          className="px-2 py-2 text-center font-glacial text-sm text-gray-300 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5EE30]"
        >
          Privacy &amp; Cookies
        </Link>
      </div>
    </section>
  );
}
