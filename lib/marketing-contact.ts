import { MARKETING_PHONE_E164 } from "@/lib/marketing-seo";

/**
 * Links into the contact form and to WhatsApp.
 *
 * A service page links to /contact?service=<slug>#contact-form, where <slug>
 * is the page's path segment (/services/seo -> "seo"); the homepage's free
 * plan button adds ?intent=plan. The contact form then starts the message
 * with that request, so a visitor knows what to write and the enquiry says
 * which service it is about.
 */
export const MARKETING_CONTACT_SERVICES = [
    { slug: "seo", label: "SEO" },
    { slug: "ppc", label: "PPC advertising" },
    { slug: "social-media-marketing", label: "social media marketing" },
    { slug: "web-development", label: "web development" },
    { slug: "video-production-ad", label: "video production" },
    { slug: "influencer-marketing", label: "influencer marketing" },
] as const;

export type MarketingContactServiceSlug = (typeof MARKETING_CONTACT_SERVICES)[number]["slug"];

export const MARKETING_CONTACT_PLAN_INTENT = "plan";

export function getMarketingContactService(slug: string | null | undefined) {
    if (!slug) {
        return undefined;
    }

    return MARKETING_CONTACT_SERVICES.find((service) => service.slug === slug);
}

export function getMarketingContactHref(
    options: { service?: MarketingContactServiceSlug; intent?: typeof MARKETING_CONTACT_PLAN_INTENT } = {},
) {
    const params = new URLSearchParams();
    if (options.service) {
        params.set("service", options.service);
    }
    if (options.intent) {
        params.set("intent", options.intent);
    }

    const query = params.toString();
    return `/contact${query ? `?${query}` : ""}#contact-form`;
}

/** The opening line for the contact form's message, or "" when the link names no request. */
export function getMarketingContactMessage(service: string | null | undefined, intent: string | null | undefined) {
    const entry = getMarketingContactService(service);
    if (entry) {
        return `Hi Digital Corvids, I'm interested in ${entry.label} for my business. Here's a bit about us and what we'd like to achieve: `;
    }

    if (intent === MARKETING_CONTACT_PLAN_INTENT) {
        return "Hi Digital Corvids, I'd like a free marketing plan for my business. Here's a bit about us and what we'd like to achieve: ";
    }

    return "";
}

const WHATSAPP_NUMBER = MARKETING_PHONE_E164.replace(/\D/g, "");

function getWhatsAppTopic(pathname: string) {
    const service = MARKETING_CONTACT_SERVICES.find(
        (entry) => pathname === `/services/${entry.slug}` || pathname.startsWith(`/services/${entry.slug}/`),
    );
    if (service) {
        return `your ${service.label} services`;
    }

    if (pathname.startsWith("/agency-os") || pathname.startsWith("/get-started")) {
        return "Agency OS";
    }

    if (pathname.startsWith("/templates")) {
        return "your website templates";
    }

    if (pathname.startsWith("/products")) {
        return "your products";
    }

    return "your services";
}

/** A wa.me chat link whose first message names what the visitor was looking at. */
export function getMarketingWhatsAppHref(pathname: string | null | undefined) {
    const text = `Hi Digital Corvids, I'd like to know more about ${getWhatsAppTopic(pathname || "/")}.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
