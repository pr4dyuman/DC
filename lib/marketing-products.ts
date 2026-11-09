/**
 * The products Digital Corvids makes, shown under "Products" in the header,
 * on /products and in the homepage's products strip. Services (SEO, ads,
 * websites...) are not products: they stay under "Services".
 *
 * Agency OS and the templates are pages on this website; zSEO.ai is its own
 * website, so it opens in a new tab.
 */
export type MarketingProduct = {
    id: "agency-os" | "templates" | "zseo";
    name: string;
    href: string;
    external: boolean;
    /** One line for the header menu. */
    summary: string;
    /** A short paragraph for the product cards. */
    description: string;
    /** The card's call to action. */
    action: string;
};

export const MARKETING_PRODUCTS: MarketingProduct[] = [
    {
        id: "agency-os",
        name: "Agency OS",
        href: "/agency-os",
        external: false,
        summary: "Software to run your agency, with a portal for your clients",
        description:
            "Projects, tasks, invoices, payroll and a client portal in one place, with an AI assistant whose changes can be undone. Our own clients use it to follow their projects.",
        action: "Explore Agency OS",
    },
    {
        id: "templates",
        name: "Website Templates",
        href: "/templates",
        external: false,
        summary: "Ready-made websites you can try live, then buy",
        description:
            "Launch-ready websites for AI startups, academies, restaurants, estate agencies, clinics and law firms. Try each live demo, then buy one or have us set it up for you.",
        action: "Browse templates",
    },
    {
        id: "zseo",
        name: "zSEO.ai",
        href: "https://zseo.ai",
        external: true,
        summary: "SEO content planning, on its own website",
        description:
            "Plan SEO work, build a source-backed content strategy, and review every article before it publishes.",
        action: "Visit zSEO.ai",
    },
];

/** Paths that belong to the Products menu, so it shows as the current section there. */
export const MARKETING_PRODUCT_PATH_PREFIXES = ["/products", "/agency-os", "/templates", "/get-started"];
