"use client";

import { track } from "@vercel/analytics";

export const MARKETING_EVENTS = {
  contactFormSubmitted: "contact_form_submitted",
  getStartedClick: "get_started_click",
  getStartedOtpRequested: "get_started_otp_requested",
  getStartedSignupCompleted: "get_started_signup_completed",
  getStartedLoginCompleted: "get_started_login_completed",
  marketingContactClick: "marketing_contact_click",
  newsletterSignup: "newsletter_signup",
};

export function getGetStartedFlow({ isAIBloggerFlow = false, directAuthMode = false } = {}) {
  if (isAIBloggerFlow) return "ai_blogger";
  if (directAuthMode) return "direct_auth";
  return "standard";
}

export function trackMarketingEvent(name, properties = {}) {
  if (!name) return;

  try {
    track(name, properties);
  } catch {
    // Analytics should never block a conversion flow.
  }
}
