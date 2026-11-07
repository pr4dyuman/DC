/**
 * Template store settings: names, prices and links for /templates.
 *
 * This is the file to edit when a template goes live. Paste each link as a
 * full https:// URL:
 *
 * - demoUrl: the live demo, for example the Cloudflare Pages link
 *   (https://<project>.pages.dev/<template>/). Lets visitors try the demo
 *   inside the template's preview box and on its full-screen demo page
 *   (/templates/<slug>/demo).
 * - checkoutUrl: a direct payment link (Razorpay, Lemon Squeezy, Gumroad...).
 *   Turns the main button into "Buy now".
 * - marketplaceUrl: the Codester listing. Used for the main button when
 *   there is no checkoutUrl.
 *
 * With neither checkoutUrl nor marketplaceUrl, the main button is
 * "Request this template": it opens the contact form with the template named
 * in the message, so the sale can be closed by email.
 *
 * Kept separate from the page content so the contact form can name a
 * template without loading every template's copy.
 */
export type MarketingTemplateCatalogEntry = {
    slug: string;
    name: string;
    niche: string;
    priceUsd: number;
    demoUrl: string | null;
    checkoutUrl: string | null;
    marketplaceUrl: string | null;
};

// Shown in this order on /templates, newest first. With an odd number of
// templates, the first one gets the wide card at the top of the grid.
export const MARKETING_TEMPLATE_CATALOG: MarketingTemplateCatalogEntry[] = [
    {
        slug: "meridian-academy",
        name: "Meridian Academy",
        niche: "Education academy",
        priceUsd: 29,
        demoUrl: "https://dc-template-previews.pages.dev/meridian-academy/",
        checkoutUrl: null,
        marketplaceUrl: null,
    },
    {
        slug: "sugo-restaurant",
        name: "SUGO",
        niche: "Restaurant, café & wine bar",
        priceUsd: 29,
        demoUrl: "https://dc-template-previews.pages.dev/sugo/",
        checkoutUrl: null,
        marketplaceUrl: null,
    },
    {
        slug: "vesper-real-estate",
        name: "Vesper",
        niche: "Real estate agency",
        priceUsd: 29,
        demoUrl: "https://dc-template-previews.pages.dev/vesper/",
        checkoutUrl: null,
        marketplaceUrl: null,
    },
    {
        slug: "marlowe-dental-clinic",
        name: "Marlowe Dental",
        niche: "Dental & medical clinic",
        priceUsd: 29,
        demoUrl: "https://dc-template-previews.pages.dev/marlowe-dental/",
        checkoutUrl: null,
        marketplaceUrl: null,
    },
    {
        slug: "mensah-hart-law-firm",
        name: "Mensah & Hart",
        niche: "Law firm & consultancy",
        priceUsd: 29,
        demoUrl: "https://dc-template-previews.pages.dev/mensah-hart/",
        checkoutUrl: null,
        marketplaceUrl: null,
    },
];

/** Templates still being designed, shown as "next up" on /templates. */
export const MARKETING_TEMPLATES_IN_DESIGN: Array<{ name: string; niche: string }> = [];

export function getMarketingTemplateCatalogEntry(slug: string | null | undefined) {
    if (!slug) {
        return undefined;
    }

    return MARKETING_TEMPLATE_CATALOG.find((entry) => entry.slug === slug);
}

/** Returns the link only when it is a valid https:// URL, so a typo can never become a broken or unsafe button. */
export function toSafeTemplateUrl(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    try {
        const url = new URL(value.trim());
        return url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}

export function formatTemplatePrice(priceUsd: number) {
    return `$${priceUsd}`;
}

export type TemplateContactIntent = "buy" | "customise";

export function getTemplateContactHref(slug: string, intent: TemplateContactIntent = "buy") {
    const params = new URLSearchParams({ template: slug });
    if (intent === "customise") {
        params.set("intent", "customise");
    }

    return `/contact?${params.toString()}#contact-form`;
}

/** The contact-form message a template request link starts with. */
export function getTemplateContactMessage(slug: string | null | undefined, intent: string | null | undefined) {
    const entry = getMarketingTemplateCatalogEntry(slug);
    if (!entry) {
        return intent === "customise"
            ? "Hi Digital Corvids, I'd like one of your website templates customised for my business. Here's what I need: "
            : "";
    }

    const label = `${entry.name} template (${entry.niche}, ${formatTemplatePrice(entry.priceUsd)})`;

    if (intent === "customise") {
        return `Hi Digital Corvids, I'm interested in the ${label} and would like your team to customise it for my business. Here's what I need: `;
    }

    return `Hi Digital Corvids, I'd like to buy the ${label}. Please send me the payment link and download details.`;
}
