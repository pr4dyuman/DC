"use client";

import { useEffect } from "react";
import { MARKETING_EVENTS, trackMarketingEvent } from "@/lib/marketing-analytics";

const SCROLL_MILESTONES = [25, 50, 75, 90, 100];
const READ_TIME_MILESTONES = [15, 30, 60, 120];

function truncate(value = "", maxLength = 100) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function toNumber(value) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getSourcePath() {
  if (typeof window === "undefined") return "";
  return window.location.pathname || "/";
}

function getLinkText(anchor) {
  return truncate(anchor?.textContent || anchor?.getAttribute("aria-label") || "", 80);
}

function getSafeLinkDestination(anchor) {
  if (typeof window === "undefined" || !anchor) {
    return {};
  }

  const rawHref = anchor.getAttribute("href") || "";
  if (!rawHref || rawHref.startsWith("#")) {
    return { targetPath: truncate(rawHref, 100) };
  }

  if (rawHref.startsWith("mailto:")) {
    return { targetUrl: "mailto", linkDomain: "email" };
  }

  if (rawHref.startsWith("tel:")) {
    return { targetUrl: "tel", linkDomain: "phone" };
  }

  try {
    const url = new URL(anchor.href || rawHref, window.location.origin);
    const targetPath = `${url.pathname}${url.hash ? url.hash.slice(0, 80) : ""}`;
    const normalizedHost = url.hostname.replace(/^www\./, "");

    if (url.origin === window.location.origin) {
      return {
        targetPath: truncate(targetPath || "/", 100),
        targetUrl: truncate(targetPath || "/", 100),
        linkDomain: normalizedHost,
        isInternal: true,
      };
    }

    return {
      targetUrl: truncate(`${url.origin}${url.pathname}`, 160),
      linkDomain: truncate(normalizedHost, 80),
      isInternal: false,
    };
  } catch {
    return { targetUrl: truncate(rawHref, 120) };
  }
}

function buildBlogPayload(blog = {}, properties = {}) {
  return {
    blogSlug: blog.slug,
    blogCategory: blog.category,
    sourcePath: getSourcePath(),
    ...properties,
  };
}

function trackBlogEvent(eventName, blog, properties = {}) {
  trackMarketingEvent(eventName, buildBlogPayload(blog, properties));
}

function getCtaType(path = "") {
  if (path === "/contact" || path.startsWith("/contact#")) return "contact";
  if (path === "/get-started" || path.startsWith("/get-started#")) return "get_started";
  return "";
}

export function BlogIndexAnalyticsTracker() {
  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const categoryLink = target.closest("a[data-blog-category-filter]");
      if (categoryLink) {
        trackMarketingEvent(MARKETING_EVENTS.blogCategoryClick, {
          blogCategory: categoryLink.getAttribute("data-blog-category") || "",
          sourcePath: getSourcePath(),
          targetPath: getSafeLinkDestination(categoryLink).targetPath || "/blog",
        });
        return;
      }

      const cardLink = target.closest("a[data-blog-card-link]");
      if (!cardLink) return;

      trackMarketingEvent(MARKETING_EVENTS.blogCardClick, {
        blogSlug: cardLink.getAttribute("data-blog-slug") || "",
        blogCategory: cardLink.getAttribute("data-blog-category") || "",
        sourcePath: getSourcePath(),
        linkSection: cardLink.getAttribute("data-blog-card-link") || "blog_list",
        position: toNumber(cardLink.getAttribute("data-blog-position")),
        isFeatured: cardLink.getAttribute("data-blog-featured") === "true",
        targetPath: getSafeLinkDestination(cardLink).targetPath || "",
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

export function BlogPostAnalyticsTracker({ slug, category }) {
  useEffect(() => {
    const blog = { slug, category };
    const sentDepths = new Set();
    const sentReadTimes = new Set();
    let activeSeconds = 0;
    let ticking = false;

    const sendScrollDepth = () => {
      ticking = false;
      const documentElement = document.documentElement;
      const maxScroll = Math.max(
        documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight,
        0,
      );
      const percent = maxScroll <= 0
        ? 100
        : Math.min(100, Math.round((window.scrollY / maxScroll) * 100));

      for (const milestone of SCROLL_MILESTONES) {
        if (percent >= milestone && !sentDepths.has(milestone)) {
          sentDepths.add(milestone);
          trackBlogEvent(MARKETING_EVENTS.blogScrollDepth, blog, {
            scrollPercent: milestone,
          });
        }
      }
    };

    const requestScrollCheck = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sendScrollDepth);
    };

    const readTimer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      activeSeconds += 1;

      for (const milestone of READ_TIME_MILESTONES) {
        if (activeSeconds >= milestone && !sentReadTimes.has(milestone)) {
          sentReadTimes.add(milestone);
          trackBlogEvent(MARKETING_EVENTS.blogReadTime, blog, {
            engagementSeconds: milestone,
          });
        }
      }
    }, 1000);

    window.addEventListener("scroll", requestScrollCheck, { passive: true });
    window.addEventListener("resize", requestScrollCheck);
    requestScrollCheck();

    return () => {
      window.clearInterval(readTimer);
      window.removeEventListener("scroll", requestScrollCheck);
      window.removeEventListener("resize", requestScrollCheck);
    };
  }, [category, slug]);

  useEffect(() => {
    const blog = { slug, category };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const faqSummary = target.closest("summary[data-blog-faq-toggle]");
      if (faqSummary) {
        const details = faqSummary.closest("details");
        trackBlogEvent(MARKETING_EVENTS.blogFaqToggle, blog, {
          position: toNumber(faqSummary.getAttribute("data-blog-faq-position")),
          linkText: getLinkText(faqSummary),
          willOpen: details ? !details.open : undefined,
        });
        return;
      }

      const anchor = target.closest("a[href]");
      if (!anchor) return;

      const analyticsType = anchor.getAttribute("data-blog-analytics") || "";
      const destination = getSafeLinkDestination(anchor);
      const linkText = getLinkText(anchor);
      const sharedPayload = {
        ...destination,
        linkText,
        linkSection: analyticsType || (anchor.closest(".blog-prose") ? "article_body" : ""),
      };

      if (analyticsType === "toc") {
        trackBlogEvent(MARKETING_EVENTS.blogTocClick, blog, sharedPayload);
        return;
      }

      if (analyticsType === "share") {
        trackBlogEvent(MARKETING_EVENTS.blogShareClick, blog, {
          ...sharedPayload,
          sharePlatform: anchor.getAttribute("data-share-platform") || linkText,
        });
        return;
      }

      if (analyticsType === "related-service") {
        trackBlogEvent(MARKETING_EVENTS.blogRelatedServiceClick, blog, sharedPayload);
        return;
      }

      if (analyticsType === "source") {
        trackBlogEvent(MARKETING_EVENTS.blogSourceClick, blog, sharedPayload);
        return;
      }

      const ctaType = getCtaType(destination.targetPath || "");
      if (ctaType) {
        trackBlogEvent(MARKETING_EVENTS.blogCtaClick, blog, {
          ...sharedPayload,
          ctaType,
        });
        return;
      }

      if (!anchor.closest(".blog-prose")) return;

      trackBlogEvent(
        destination.isInternal
          ? MARKETING_EVENTS.blogInternalLinkClick
          : MARKETING_EVENTS.blogExternalLinkClick,
        blog,
        sharedPayload,
      );
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [category, slug]);

  return null;
}
