import test from "node:test";
import assert from "node:assert/strict";

import {
  COOKIE_CONSENT_MAX_AGE_MS,
  COOKIE_CONSENT_VERSION,
  parseStoredCookieConsent,
} from "../lib/cookie-consent";

const NOW = Date.parse("2026-06-11T12:00:00.000Z");

function storedConsent(analytics: boolean, updatedAt = NOW) {
  return JSON.stringify({
    version: COOKIE_CONSENT_VERSION,
    analytics,
    updatedAt: new Date(updatedAt).toISOString(),
  });
}

test("parses accepted and rejected analytics choices", () => {
  assert.equal(parseStoredCookieConsent(storedConsent(true), NOW), "accepted");
  assert.equal(parseStoredCookieConsent(storedConsent(false), NOW), "rejected");
});

test("rejects expired, future, malformed, and old-version consent records", () => {
  assert.equal(
    parseStoredCookieConsent(storedConsent(true, NOW - COOKIE_CONSENT_MAX_AGE_MS - 1), NOW),
    null,
  );
  assert.equal(parseStoredCookieConsent(storedConsent(true, NOW + 2 * 24 * 60 * 60 * 1000), NOW), null);
  assert.equal(parseStoredCookieConsent("{not-json", NOW), null);
  assert.equal(
    parseStoredCookieConsent(
      JSON.stringify({
        version: COOKIE_CONSENT_VERSION + 1,
        analytics: true,
        updatedAt: new Date(NOW).toISOString(),
      }),
      NOW,
    ),
    null,
  );
});
