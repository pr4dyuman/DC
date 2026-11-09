import type { MarketingContactServiceSlug } from "@/lib/marketing-contact";

import influencerMarketing from "./influencer-marketing";
import ppc from "./ppc";
import seo from "./seo";
import socialMediaMarketing from "./social-media-marketing";
import videoProductionAd from "./video-production-ad";
import webDevelopment from "./web-development";

/**
 * Content for the six service pages (/services/<slug>). Every page uses the
 * same layout (components/marketing/services/ServicePage.jsx); edit a page's
 * copy in its file here.
 *
 * Prices: `pricing.from` is null, so the page says "Custom quote". To show a
 * starting price, set it to the text to display, e.g. "₹15,000 a month".
 */
export type ServicePageData = {
    slug: MarketingContactServiceSlug;
    path: string;
    /** The H1. */
    title: string;
    /** The H1 in two parts, the second shown in yellow. Joined with a space they must equal `title`. */
    titleParts: [string, string];
    /** A shorter two-tone name for the service cards, when the H1 is long. Defaults to `titleParts`. */
    cardTitle?: [string, string];
    titleSize?: "lg" | "md";
    eyebrow: string;
    summary: string;
    /** One or two sentences for the service cards on /services and the homepage. */
    cardText: string;
    /** Four short points shown under the header. */
    highlights: string[];
    image: { src: string; alt: string };
    ctaLabel: string;
    resultsLabel: string;
    audience: { title: string; text: string }[];
    /**
     * What's included. Each is shown with its illustration and a two-tone
     * heading (white, then grey), alternating sides as on the original pages.
     */
    deliverables: {
        title: string;
        heading: [string, string];
        /** An illustration in /public. */
        image: string;
        text: string;
        items: string[];
    }[];
    process: { title: string; description: string }[];
    /** What every plan includes: the page's existing promises. */
    expectations: string[];
    pricing: { from: string | null };
    caseStudies: { services: string[]; title: string; linkLabel: string };
    faqs: { question: string; answer: string }[];
    relatedLinks: { title: string; href: string; description: string }[];
    relatedArticles: { title: string; href: string; category: string; description: string }[];
    /** The closing call to action: `title`, then `accent` in yellow. */
    closing: { title: string; accent: string; text: string };
    /** Search engine data, kept as it was before the redesign. */
    seo: { name: string; description: string; serviceType: string; breadcrumbName: string };
};

export const MARKETING_SERVICE_PAGES: ServicePageData[] = [
    webDevelopment,
    seo,
    socialMediaMarketing,
    videoProductionAd,
    ppc,
    influencerMarketing,
];

export function getMarketingServicePage(slug: string) {
    const page = MARKETING_SERVICE_PAGES.find((entry) => entry.slug === slug);
    if (!page) {
        throw new Error(`Unknown service page: ${slug}`);
    }
    return page;
}
