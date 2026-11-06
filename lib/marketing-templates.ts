import {
    MARKETING_TEMPLATE_CATALOG,
    type MarketingTemplateCatalogEntry,
    formatTemplatePrice,
    getTemplateContactHref,
    toSafeTemplateUrl,
} from "@/lib/marketing-templates-catalog";

/**
 * Page content for the /templates store. Names, prices and links live in
 * lib/marketing-templates-catalog.ts; this file holds the copy and images.
 *
 * Copy comes from each template's Codester listing (listing/listing.md in the
 * private codester-themes repository). Images in public/templates/ are
 * screenshots of the demos only: the template source stays private.
 */

export type MarketingTemplateImage = {
    src: string;
    width: number;
    height: number;
};

export type MarketingTemplateTourPage = {
    id: string;
    label: string;
    desktop: MarketingTemplateImage;
    mobile?: MarketingTemplateImage;
};

type MarketingTemplateContent = {
    title: string;
    metaTitle: string;
    summary: string;
    description: string[];
    accent: string;
    pageCount: number;
    stack: string[];
    fonts: string;
    version: string;
    signature: Array<{ title: string; text: string }>;
    features: string[];
    pages: string[];
    card: MarketingTemplateImage;
    tour: MarketingTemplateTourPage[];
    keywords: string[];
};

export type MarketingTemplatePurchase = {
    kind: "checkout" | "marketplace" | "request";
    href: string;
    label: string;
    external: boolean;
};

export type MarketingTemplate = MarketingTemplateCatalogEntry &
    MarketingTemplateContent & {
        path: string;
        priceLabel: string;
        ogImage: string;
        purchase: MarketingTemplatePurchase;
        customiseHref: string;
    };

function image(slug: string, file: string, width: number, height: number): MarketingTemplateImage {
    return { src: `/templates/${slug}/${file}`, width, height };
}

const TEMPLATE_CONTENT: Record<string, MarketingTemplateContent> = {
    "sugo-restaurant": {
        title: "Poster Restaurant, Café & Wine Bar HTML Template",
        metaTitle: "SUGO Restaurant & Café Website Template",
        summary:
            "A bold, poster-style website for restaurants, bistros, cafés and wine bars, with a filterable menu and table booking.",
        description: [
            "SUGO is a bold, poster-led HTML template for restaurants, bistros, cafés and wine bars that want a website with the confidence of a printed street poster. A tomato-red, pink, white and ink palette, oversized display type and square-edged panels give the demo restaurant a clear identity, without dark backgrounds, gold scripts or stock-template sameness.",
            "Menu categories are easy to scan, dishes carry prices and allergen notes, and diners can filter by vegetarian, vegan, gluten-free, no nuts and spicy. The reservation and private dining forms validate in the browser, opening hours show a live open-now label, and phones keep a “Book a table” bar in view while scrolling.",
        ],
        accent: "#D8341E",
        pageCount: 11,
        stack: ["HTML5", "Tailwind CSS 3.4", "Plain JavaScript"],
        fonts: "Gloock and Familjen Grotesk, self-hosted (OFL)",
        version: "1.0.0",
        signature: [
            {
                title: "Menu with dietary filters",
                text: "Scannable categories with prices, dietary badges and per-dish allergen notes, filterable by vegetarian, vegan, gluten-free, no nuts and spicy.",
            },
            {
                title: "Reservations and private dining",
                text: "A booking form with date, time, guests, occasion and notes, plus set menus and an enquiry form for events.",
            },
            {
                title: "Live open-now label",
                text: "Opening hours paired with a JavaScript label that tells diners whether the restaurant is open right now.",
            },
            {
                title: "Book-a-table bar on phones",
                text: "A persistent mobile bar keeps the booking action in reach while visitors scroll the menu.",
            },
        ],
        features: [
            "11 complete, responsive HTML pages",
            "Poster-style visual system with oversized display typography",
            "Menu category navigation and dietary filters",
            "Prices, dietary badges and per-dish allergen notes",
            "Reservation form with date, time, guests, occasion and notes",
            "Private dining and events page with set menus and enquiry form",
            "Browser form validation with field-level errors and success messages",
            "Opening hours with a JavaScript open-now label",
            "Events list for recurring and ticketed nights",
            "Gallery with a keyboard-friendly lightbox and captions",
            "Mobile navigation and a persistent “Book a table” bar",
            "Lazy-loaded WebP images sized to their slots",
            "Semantic HTML, labelled form controls, visible focus and reduced-motion support",
            "No analytics, advertising, tracking or external scripts",
        ],
        pages: [
            "Home",
            "Menu",
            "Our story",
            "Reservations",
            "Private dining and events",
            "Gallery",
            "Team",
            "Journal",
            "Journal post",
            "Visit us",
            "404",
        ],
        card: image("sugo-restaurant", "card.webp", 960, 3200),
        tour: [
            {
                id: "home",
                label: "Home",
                desktop: image("sugo-restaurant", "index-desktop.webp", 1440, 8549),
                mobile: image("sugo-restaurant", "index-mobile.webp", 390, 11558),
            },
            {
                id: "menu",
                label: "Menu",
                desktop: image("sugo-restaurant", "menu-desktop.webp", 1440, 4154),
                mobile: image("sugo-restaurant", "menu-mobile.webp", 390, 6995),
            },
            {
                id: "reservations",
                label: "Reservations",
                desktop: image("sugo-restaurant", "reservations-desktop.webp", 1440, 1768),
                mobile: image("sugo-restaurant", "reservations-mobile.webp", 390, 3059),
            },
            {
                id: "private-dining",
                label: "Private dining",
                desktop: image("sugo-restaurant", "private-dining-desktop.webp", 1440, 3806),
                mobile: image("sugo-restaurant", "private-dining-mobile.webp", 390, 5295),
            },
            {
                id: "gallery",
                label: "Gallery",
                desktop: image("sugo-restaurant", "gallery-desktop.webp", 1440, 2778),
                mobile: image("sugo-restaurant", "gallery-mobile.webp", 390, 2433),
            },
            {
                id: "visit",
                label: "Visit us",
                desktop: image("sugo-restaurant", "visit-desktop.webp", 1440, 2495),
                mobile: image("sugo-restaurant", "visit-mobile.webp", 390, 3780),
            },
        ],
        keywords: [
            "restaurant website template",
            "cafe website template",
            "wine bar website template",
            "restaurant HTML template",
            "Tailwind restaurant template",
        ],
    },
    "vesper-real-estate": {
        title: "Real Estate Agency Website Template",
        metaTitle: "Vesper Real Estate Agency Website Template",
        summary:
            "A dark, gallery-like site for estate agencies and boutique developers, with property search and saved homes driven by one data file.",
        description: [
            "Vesper is a dark, gallery-like website template for estate agencies, independent agents and boutique property developers. Every home is shown at dusk with its lights on, and the facts sit in a crisp spec bar like a car configurator: no accent colour and no stock-photo clichés, just photographs, light and numbers.",
            "A single JSON file drives the whole register. Add a home once and it appears on the home page, the search page, the agent profiles and the costs table. Visitors can filter and sort, switch between grid and list, and save homes to a drawer that stays in their browser.",
        ],
        accent: "#F2EFEA",
        pageCount: 11,
        stack: ["HTML5", "Tailwind CSS v4", "Plain JavaScript", "JSON data file"],
        fonts: "Anybody, self-hosted (OFL)",
        version: "1.0.0",
        signature: [
            {
                title: "Property search from one JSON file",
                text: "Filter by buy or rent, type, price, bedrooms, bathrooms and area, sort the results and switch between a grid and a list.",
            },
            {
                title: "Saved homes drawer",
                text: "Visitors save properties to a drawer that persists in their browser between visits.",
            },
            {
                title: "Property pages that sell",
                text: "A gallery with lightbox, key facts, a drawn floor plan, amenities and a book-a-viewing form on every home.",
            },
            {
                title: "Mortgage calculator",
                text: "A live monthly cost from deposit, rate and term, right next to the asking price.",
            },
        ],
        features: [
            "11 complete pages, responsive from 360 px to 1920 px",
            "Property search with buy or rent, type, price, bedroom, bathroom and area filters",
            "Sorting and a grid/list toggle, all driven by a JSON data file",
            "Saved properties kept in localStorage, with a saved-homes drawer",
            "Property gallery with a lightbox and photo-cycling cards with touch controls",
            "Key facts, floor plan and amenities on every property page",
            "Mortgage calculator with deposit, rate and term",
            "Book-a-viewing, valuation request, contact and agent contact forms with validation",
            "Drawn map with instructions for embedding a real Google Map",
            "Inline SVG icons and WebP images",
            "Keyboard usable, AA contrast and reduced motion respected",
            "No backend, no jQuery, no analytics, no tracking and no external scripts",
        ],
        pages: [
            "Home",
            "Properties",
            "Property detail",
            "Agents",
            "Agent profile",
            "Sell with us",
            "About",
            "Journal",
            "Journal post",
            "Contact",
            "404",
        ],
        card: image("vesper-real-estate", "card.webp", 960, 3200),
        tour: [
            {
                id: "home",
                label: "Home",
                desktop: image("vesper-real-estate", "index-desktop.webp", 1440, 11242),
                mobile: image("vesper-real-estate", "index-mobile.webp", 390, 14997),
            },
            {
                id: "properties",
                label: "Properties",
                desktop: image("vesper-real-estate", "properties-desktop.webp", 1440, 3434),
                mobile: image("vesper-real-estate", "properties-mobile.webp", 390, 7037),
            },
            {
                id: "property",
                label: "Property detail",
                desktop: image("vesper-real-estate", "property-desktop.webp", 1440, 8137),
                mobile: image("vesper-real-estate", "property-mobile.webp", 390, 10206),
            },
            {
                id: "agents",
                label: "Agents",
                desktop: image("vesper-real-estate", "agents-desktop.webp", 1440, 2026),
                mobile: image("vesper-real-estate", "agents-mobile.webp", 390, 3139),
            },
            {
                id: "sell",
                label: "Sell with us",
                desktop: image("vesper-real-estate", "sell-desktop.webp", 1440, 2339),
            },
            {
                id: "contact",
                label: "Contact",
                desktop: image("vesper-real-estate", "contact-desktop.webp", 1440, 2095),
                mobile: image("vesper-real-estate", "contact-mobile.webp", 390, 3088),
            },
        ],
        keywords: [
            "real estate website template",
            "estate agency website template",
            "property listing template",
            "real estate HTML template",
            "Tailwind real estate template",
        ],
    },
    "marlowe-dental-clinic": {
        title: "Dental & Medical Clinic HTML Template",
        metaTitle: "Marlowe Dental Clinic Website Template",
        summary:
            "A calm, daylight-toned clinic website with a live “Today at the clinic” card, appointment requests and full fee tables.",
        description: [
            "Marlowe Dental is a complete HTML template for dental and medical clinics, designed around the questions patients actually ask: will it hurt, how long does it take, what does it cost, and are you open now? Its “Daylight” design pairs a cool near-white page with warm apricot fields, graphite text and soft rounded shapes, a calm alternative to the usual blue-and-white clinic look.",
            "All 13 pages come with specific sample content for a fictional London clinic, including a dental implant treatment page with steps, a full fee breakdown and suitability guidance. The doctors list filters by speciality, the journal filters by topic, and the forms validate in the browser.",
        ],
        accent: "#F6C49C",
        pageCount: 13,
        stack: ["HTML5", "Tailwind CSS v3", "Plain JavaScript"],
        fonts: "Gabarito, self-hosted (OFL)",
        version: "1.0.0",
        signature: [
            {
                title: "“Today at the clinic” card",
                text: "Works out, in the clinic's own time zone, whether it is open right now, today's hours and the next free appointment.",
            },
            {
                title: "Appointment requests",
                text: "Treatment, doctor, date, time slot, patient details and consent, validated in the browser with clear error and success states.",
            },
            {
                title: "Treatment journey",
                text: "A step track that shows patients exactly what a visit involves, plus a detailed treatment page with fees and suitability.",
            },
            {
                title: "Fees, doctors and FAQ",
                text: "Full fees and insurance tables, doctors filtered by speciality, an FAQ accordion and an emergency strip on every page.",
            },
        ],
        features: [
            "13 complete pages with realistic sample content",
            "Live “Today at the clinic” card: open or closed, today's hours and next free appointment",
            "Appointment request form with browser validation and error and success states",
            "Contact form with the same validation pattern",
            "Opening-hours table with an automatic “open now” label",
            "Doctors filtered by speciality and journal filtered by topic",
            "Treatment journey step track, fees and insurance tables, FAQ accordion",
            "Emergency-contact strip on every page",
            "Responsive from 360 px to 1920 px with a mobile menu",
            "Keyboard accessible, visible focus, AA contrast and reduced-motion support",
            "Icons drawn as inline SVG",
            "No jQuery, no runtime frameworks and no analytics, tracking or external scripts",
        ],
        pages: [
            "Home",
            "About",
            "Treatments",
            "Treatment detail",
            "Doctors",
            "Doctor profile",
            "Book an appointment",
            "Fees and insurance",
            "FAQ",
            "Journal",
            "Journal post",
            "Contact",
            "404",
        ],
        card: image("marlowe-dental-clinic", "card.webp", 960, 3200),
        tour: [
            {
                id: "home",
                label: "Home",
                desktop: image("marlowe-dental-clinic", "index-desktop.webp", 1440, 9834),
                mobile: image("marlowe-dental-clinic", "index-mobile.webp", 390, 16380),
            },
            {
                id: "treatments",
                label: "Treatments",
                desktop: image("marlowe-dental-clinic", "treatments-desktop.webp", 1440, 3342),
            },
            {
                id: "treatment",
                label: "Treatment detail",
                desktop: image("marlowe-dental-clinic", "treatment-desktop.webp", 1440, 5995),
                mobile: image("marlowe-dental-clinic", "treatment-mobile.webp", 390, 11595),
            },
            {
                id: "doctors",
                label: "Doctors",
                desktop: image("marlowe-dental-clinic", "doctors-desktop.webp", 1440, 2549),
                mobile: image("marlowe-dental-clinic", "doctors-mobile.webp", 390, 4807),
            },
            {
                id: "book",
                label: "Book a visit",
                desktop: image("marlowe-dental-clinic", "book-desktop.webp", 1440, 1716),
                mobile: image("marlowe-dental-clinic", "book-mobile.webp", 390, 3965),
            },
            {
                id: "fees",
                label: "Fees & insurance",
                desktop: image("marlowe-dental-clinic", "fees-desktop.webp", 1440, 2313),
                mobile: image("marlowe-dental-clinic", "fees-mobile.webp", 390, 4399),
            },
        ],
        keywords: [
            "dental clinic website template",
            "dentist website template",
            "medical clinic HTML template",
            "clinic appointment booking template",
            "Tailwind clinic template",
        ],
    },
    "mensah-hart-law-firm": {
        title: "Law Firm Website Template",
        metaTitle: "Mensah & Hart Law Firm Website Template",
        summary:
            "A Swiss-style typographic site for law firms, solo lawyers and legal or tax consultancies, with filterable case results.",
        description: [
            "Mensah & Hart is a complete website template for a law firm, a solo lawyer, or a legal or tax consultancy, designed in a Swiss typographic direction: a field of ultramarine, one neo-grotesque typeface, black-and-white photography and large type doing the work that decoration usually does.",
            "There are no gavels, no scales and no dark wood libraries. The hero is a statement, practice areas run as one line of large links, and case results are poster-size figures, each labelled as a fictional example.",
        ],
        accent: "#0E33A8",
        pageCount: 12,
        stack: ["HTML5", "Tailwind CSS 4", "Plain JavaScript"],
        fonts: "Libre Franklin, self-hosted (OFL)",
        version: "1.0.0",
        signature: [
            {
                title: "Consultation requests",
                text: "Matter type, urgency, preferred contact method, a short description and consent, validated in the browser.",
            },
            {
                title: "Filterable case results",
                text: "Results filtered by practice area with a live result count, each clearly labelled as a fictional example.",
            },
            {
                title: "Lawyer profiles",
                text: "Education, bar admissions and languages for every lawyer, plus a team index.",
            },
            {
                title: "Disclaimers built in",
                text: "A legal disclaimer in the footer and on the forms, ready for your own wording.",
            },
        ],
        features: [
            "12 complete pages, responsive from 360 px to 1920 px",
            "Consultation request form with browser validation",
            "Contact form with browser validation",
            "Case results filtered by practice area, with a live result count",
            "Lawyer profiles with education, bar admissions and languages",
            "FAQ accordion, one open at a time and keyboard accessible",
            "Mobile menu behind a menu button on phones",
            "Legal disclaimer in the footer and on the forms",
            "WebP images sized for their slots and lazy-loaded",
            "AA contrast, keyboard usable, visible focus and reduced motion respected",
            "No jQuery, no libraries and no analytics, tracking or external scripts",
        ],
        pages: [
            "Home",
            "Practice areas",
            "Practice area detail",
            "Our lawyers",
            "Lawyer profile",
            "Case results",
            "About the firm",
            "Insights",
            "Article",
            "Book a consultation",
            "Contact",
            "404",
        ],
        card: image("mensah-hart-law-firm", "card.webp", 960, 3200),
        tour: [
            {
                id: "home",
                label: "Home",
                desktop: image("mensah-hart-law-firm", "index-desktop.webp", 1440, 7572),
                mobile: image("mensah-hart-law-firm", "index-mobile.webp", 390, 10269),
            },
            {
                id: "practice-areas",
                label: "Practice areas",
                desktop: image("mensah-hart-law-firm", "practice-areas-desktop.webp", 1440, 2551),
            },
            {
                id: "practice-area",
                label: "Practice area detail",
                desktop: image("mensah-hart-law-firm", "practice-area-desktop.webp", 1440, 7938),
                mobile: image("mensah-hart-law-firm", "practice-area-mobile.webp", 390, 10922),
            },
            {
                id: "lawyers",
                label: "Lawyers",
                desktop: image("mensah-hart-law-firm", "lawyers-desktop.webp", 1440, 3222),
                mobile: image("mensah-hart-law-firm", "lawyers-mobile.webp", 390, 6243),
            },
            {
                id: "case-results",
                label: "Case results",
                desktop: image("mensah-hart-law-firm", "case-results-desktop.webp", 1440, 3319),
                mobile: image("mensah-hart-law-firm", "case-results-mobile.webp", 390, 5283),
            },
            {
                id: "consultation",
                label: "Consultation",
                desktop: image("mensah-hart-law-firm", "consultation-desktop.webp", 1440, 2721),
                mobile: image("mensah-hart-law-firm", "consultation-mobile.webp", 390, 3805),
            },
        ],
        keywords: [
            "law firm website template",
            "lawyer website template",
            "legal consultancy website template",
            "law firm HTML template",
            "Tailwind law firm template",
        ],
    },
};

/** What ships in every template download, as stated in the listings. */
export const MARKETING_TEMPLATE_INCLUDES = [
    {
        title: "Every page, ready to upload",
        text: "Complete HTML pages with realistic sample content, no lorem ipsum. Open the files or upload them to any static host.",
    },
    {
        title: "Tailwind source and compiled CSS",
        text: "Edit with or without a build step. Change Tailwind classes and one command rebuilds the stylesheet.",
    },
    {
        title: "Plain, light JavaScript",
        text: "No jQuery, no runtime frameworks and no analytics, tracking or external scripts.",
    },
    {
        title: "Responsive and accessible",
        text: "Layouts from 360 px phones to 1920 px screens, keyboard-friendly, with visible focus and reduced-motion support.",
    },
    {
        title: "Forms that validate",
        text: "Booking and contact forms check input in the browser and show clear error and success states. Connect any form service.",
    },
    {
        title: "Full documentation",
        text: "An HTML guide to colours, fonts, images, forms, rebuilding the CSS and deploying, plus credits and a changelog.",
    },
];

function getPurchase(entry: MarketingTemplateCatalogEntry): MarketingTemplatePurchase {
    const price = formatTemplatePrice(entry.priceUsd);
    const checkoutUrl = toSafeTemplateUrl(entry.checkoutUrl);
    if (checkoutUrl) {
        return { kind: "checkout", href: checkoutUrl, label: `Buy now · ${price}`, external: true };
    }

    const marketplaceUrl = toSafeTemplateUrl(entry.marketplaceUrl);
    if (marketplaceUrl) {
        return { kind: "marketplace", href: marketplaceUrl, label: `Buy on Codester · ${price}`, external: true };
    }

    return {
        kind: "request",
        href: getTemplateContactHref(entry.slug),
        label: "Request this template",
        external: false,
    };
}

function buildTemplate(entry: MarketingTemplateCatalogEntry): MarketingTemplate | null {
    const content = TEMPLATE_CONTENT[entry.slug];
    if (!content) {
        return null;
    }

    return {
        ...entry,
        ...content,
        demoUrl: toSafeTemplateUrl(entry.demoUrl),
        path: `/templates/${entry.slug}`,
        priceLabel: formatTemplatePrice(entry.priceUsd),
        ogImage: `/templates/${entry.slug}/og.jpg`,
        purchase: getPurchase(entry),
        customiseHref: getTemplateContactHref(entry.slug, "customise"),
    };
}

const MARKETING_TEMPLATES = MARKETING_TEMPLATE_CATALOG.map(buildTemplate).filter(
    (template): template is MarketingTemplate => Boolean(template),
);

export function getMarketingTemplates() {
    return MARKETING_TEMPLATES;
}

export function getMarketingTemplate(slug: string | null | undefined) {
    return MARKETING_TEMPLATES.find((template) => template.slug === slug);
}

export function getMarketingTemplatePageTotal() {
    return MARKETING_TEMPLATES.reduce((total, template) => total + template.pageCount, 0);
}

export function getLowestMarketingTemplatePrice() {
    return Math.min(...MARKETING_TEMPLATES.map((template) => template.priceUsd));
}
