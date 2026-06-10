"use client";

import { track } from "@vercel/analytics";
import { trackGoogleAnalyticsEvent } from "@/lib/google-analytics";

export const MARKETING_EVENTS = {
  blogCardClick: "blog_card_click",
  blogCategoryClick: "blog_category_click",
  blogCtaClick: "blog_cta_click",
  blogExternalLinkClick: "blog_external_link_click",
  blogFaqToggle: "blog_faq_toggle",
  blogInternalLinkClick: "blog_internal_link_click",
  blogReadTime: "blog_read_time",
  blogRelatedServiceClick: "blog_related_service_click",
  blogScrollDepth: "blog_scroll_depth",
  blogShareClick: "blog_share_click",
  blogSourceClick: "blog_source_click",
  blogTocClick: "blog_toc_click",
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

function sanitizeMarketingProperties(properties = {}) {
  return Object.entries(properties).reduce((nextProperties, [key, value]) => {
    if (value === undefined || value === null) return nextProperties;

    if (typeof value === "boolean") {
      nextProperties[key] = value;
      return nextProperties;
    }

    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        nextProperties[key] = value;
      }
      return nextProperties;
    }

    if (typeof value === "string") {
      const normalizedValue = value.replace(/\s+/g, " ").trim();
      if (normalizedValue) {
        nextProperties[key] = normalizedValue.slice(0, 160);
      }
    }

    return nextProperties;
  }, {});
}

export function trackMarketingEvent(name, properties = {}) {
  if (!name) return;

  const safeProperties = sanitizeMarketingProperties(properties);

  try {
    track(name, safeProperties);
  } catch {
    // Analytics should never block a conversion flow.
  }

  trackGoogleAnalyticsEvent(name, safeProperties);
}
