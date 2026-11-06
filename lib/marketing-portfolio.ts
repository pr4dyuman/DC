import {
    MARKETING_SAMPLE_CASE_STUDIES,
    MARKETING_SAMPLE_PREVIEW_ORDER,
} from "@/lib/marketing-portfolio-samples";

/**
 * Portfolio case studies for /portfolio, /portfolio/<slug> and the service pages.
 *
 * Only `status: "published"` entries appear on the public site. Sample case
 * studies (lib/marketing-portfolio-samples.ts) show the layout for each service
 * and appear only on the noindex preview at /portfolio/preview. Publish real
 * results only, with the client's permission. See doc/portfolio-case-studies.md.
 */

export type PortfolioServiceId = "web" | "app" | "seo" | "social" | "ads" | "video" | "influencer" | "branding";

export type PortfolioService = {
    id: PortfolioServiceId;
    label: string;
    href: string | null;
    description: string;
};

export const PORTFOLIO_SERVICES: PortfolioService[] = [
    {
        id: "web",
        label: "Websites",
        href: "/services/web-development",
        description: "Business sites, online stores and landing pages built to convert.",
    },
    {
        id: "app",
        label: "Web apps",
        href: "/services/web-development",
        description: "Products and internal tools that run in the browser.",
    },
    {
        id: "seo",
        label: "SEO",
        href: "/services/seo",
        description: "Rankings, organic traffic and enquiries from search.",
    },
    {
        id: "social",
        label: "Social media",
        href: "/services/social-media-marketing",
        description: "Content, community and steady growth on social platforms.",
    },
    {
        id: "ads",
        label: "Ads",
        href: "/services/ppc",
        description: "Google and Meta campaigns measured on leads and cost.",
    },
    {
        id: "video",
        label: "Video",
        href: "/services/video-production-ad",
        description: "Ad films, reels and launch videos made to be watched.",
    },
    {
        id: "influencer",
        label: "Influencer",
        href: "/services/influencer-marketing",
        description: "Creator campaigns tracked through to sales and sign-ups.",
    },
    {
        id: "branding",
        label: "Branding",
        href: null,
        description: "Logos, colours and brand systems that hold together.",
    },
];

export type PortfolioImage = { src: string; width: number; height: number; alt: string };

export type PortfolioKpi = { value: string; label: string };

export type WebsiteProof = {
    type: "website";
    projectType: string;
    status: string;
    urlLabel: string;
    video: string;
    poster: PortfolioImage;
};

export type SeoProof = {
    type: "seo";
    metric: string;
    points: Array<{ label: string; value: number }>;
    startIndex?: number;
    startLabel?: string;
    keywords?: Array<{ term: string; before: number | null; after: number }>;
    serp?: { siteName: string; url: string; title: string; description: string; position: number };
};

export type SocialProof = {
    type: "social";
    platform: string;
    handle: string;
    avatar: PortfolioImage;
    posts: PortfolioImage[];
    profileStats: Array<{ label: string; value: string }>;
    growth: { label: string; points: Array<{ label: string; value: number }> };
};

export type AdsProof = {
    type: "ads";
    platform: string;
    ad: { siteName: string; url: string; headline: string; description: string; sitelinks?: string[] };
    comparisons: Array<{
        label: string;
        before: number;
        after: number;
        format: "inr" | "number" | "percent" | "multiplier";
        lowerIsBetter?: boolean;
    }>;
};

export type VideoProof = {
    type: "video";
    title: string;
    duration: string;
    poster: PortfolioImage;
    video?: string;
    stills: PortfolioImage[];
    channels: string[];
};

export type InfluencerProof = {
    type: "influencer";
    creators: Array<{ name: string; handle: string; followers: string; initials: string }>;
    content: Array<PortfolioImage & { handle: string }>;
};

export type BrandingProof = {
    type: "branding";
    before?: PortfolioImage;
    after: PortfolioImage;
    palette: Array<{ name: string; hex: string }>;
    applications: PortfolioImage[];
};

export type PortfolioProof = WebsiteProof | SeoProof | SocialProof | AdsProof | VideoProof | InfluencerProof | BrandingProof;

export type PortfolioCaseStudy = {
    slug: string;
    status: "published" | "sample";
    client: string;
    industry: string;
    location?: string;
    /** The first service is the main one: it sets the card's filter, label and proof. */
    services: PortfolioServiceId[];
    period?: string;
    /** Featured case studies span the full width of the portfolio grid. */
    featured?: boolean;
    /** The one number that matters. Headline values use digits with + − % × k M; put currency in the label. */
    headline?: PortfolioKpi;
    summary: string;
    kpis?: PortfolioKpi[];
    scope?: string[];
    proof: PortfolioProof;
    live?: { url: string; label: string };
    /** Adding a story gives the case study its own page. */
    story?: {
        challenge: string;
        steps: Array<{ title: string; text: string }>;
        result: string;
        source?: string;
    };
    testimonial?: { quote: string; name: string; role: string };
};

/** Which proof each main service uses. */
export const PROOF_TYPE_FOR_SERVICE: Record<PortfolioServiceId, PortfolioProof["type"]> = {
    web: "website",
    app: "website",
    seo: "seo",
    social: "social",
    ads: "ads",
    video: "video",
    influencer: "influencer",
    branding: "branding",
};

const PUBLISHED_CASE_STUDIES: PortfolioCaseStudy[] = [
    {
        slug: "ezyprep",
        status: "published",
        client: "EzyPrep",
        industry: "AI production SaaS",
        services: ["app"],
        featured: true,
        summary:
            "A production planning workspace for script breakdowns, scheduling, reports, shot lists, call sheets, and film-prep handoffs.",
        scope: ["SaaS Product", "AI Workflow", "Script Editor", "Production Planning"],
        proof: {
            type: "website",
            projectType: "SaaS Web App",
            status: "Live App",
            urlLabel: "ezyprep.onrender.com/editor/demo/script",
            video: "/portfolio/ezyprep-demo-script.webm?v=20260610-demo-tabs",
            poster: {
                src: "/portfolio/ezyprep-demo-script-poster.jpg",
                width: 1440,
                height: 900,
                alt: "EzyPrep script editor with a production schedule",
            },
        },
        live: { url: "https://ezyprep.onrender.com/", label: "Visit live app" },
    },
    {
        slug: "drifting-wood",
        status: "published",
        client: "Drifting Wood",
        industry: "Furniture e-commerce",
        services: ["web"],
        summary:
            "An online furniture storefront designed around visual discovery, clear collections, detailed product pages, and direct purchase journeys.",
        scope: ["E-commerce", "Web Design", "Development", "Product Catalogue"],
        proof: {
            type: "website",
            projectType: "E-commerce Website",
            status: "Live Website",
            urlLabel: "driftingwood.in",
            video: "/portfolio/drifting-wood-website.webm?v=20260610-shop-collection",
            poster: {
                src: "/portfolio/drifting-wood-website-poster.jpg",
                width: 1280,
                height: 800,
                alt: "Drifting Wood home page with a bed collection banner",
            },
        },
        live: { url: "https://driftingwood.in/", label: "Visit live website" },
    },
    {
        slug: "design-dwellers",
        status: "published",
        client: "Design Dwellers Studio",
        industry: "Interior design studio",
        services: ["web"],
        summary:
            "A live preview for an interior design studio website with portfolio storytelling, service detail, consultation paths, and polished project browsing.",
        scope: ["Interior Design", "Web Design", "Development", "Live Preview"],
        proof: {
            type: "website",
            projectType: "Interior Design Website",
            status: "Live Preview",
            urlLabel: "design-dwellers.vercel.app",
            video: "/portfolio/design-dwellers-website.webm?v=20260610-preview",
            poster: {
                src: "/portfolio/design-dwellers-website-poster.jpg",
                width: 1280,
                height: 800,
                alt: "Design Dwellers studio home page with a dark interior photograph",
            },
        },
        live: { url: "https://design-dwellers.vercel.app/", label: "Visit live preview" },
    },
];

const ALL_CASE_STUDIES: PortfolioCaseStudy[] = [...PUBLISHED_CASE_STUDIES, ...MARKETING_SAMPLE_CASE_STUDIES];

function orderForPreview(studies: PortfolioCaseStudy[]) {
    const rank = new Map(MARKETING_SAMPLE_PREVIEW_ORDER.map((slug, index) => [slug, index]));
    return [...studies].sort(
        (a, b) =>
            (rank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.slug) ?? Number.MAX_SAFE_INTEGER) ||
            studies.indexOf(a) - studies.indexOf(b),
    );
}

export function getPortfolioCaseStudies({ includeSamples = false } = {}) {
    return includeSamples
        ? orderForPreview(ALL_CASE_STUDIES)
        : ALL_CASE_STUDIES.filter((study) => study.status === "published");
}

export function getPortfolioCaseStudy(slug: string | null | undefined, { includeSamples = false } = {}) {
    return getPortfolioCaseStudies({ includeSamples }).find((study) => study.slug === slug);
}

export function getPortfolioService(id: PortfolioServiceId) {
    return PORTFOLIO_SERVICES.find((service) => service.id === id) as PortfolioService;
}

export function hasCaseStudyPage(study: PortfolioCaseStudy) {
    return Boolean(study.story);
}

export function getCaseStudyHref(study: PortfolioCaseStudy, { preview = false } = {}) {
    return preview ? `/portfolio/preview/${study.slug}` : `/portfolio/${study.slug}`;
}

/** Services with at least one case study, in menu order, with counts. */
export function getPortfolioServiceCounts(studies: PortfolioCaseStudy[]) {
    return PORTFOLIO_SERVICES.map((service) => ({
        service,
        count: studies.filter((study) => study.services.includes(service.id)).length,
    })).filter((entry) => entry.count > 0);
}

/** Published case studies for a service page. */
export function getServiceCaseStudies(serviceIds: PortfolioServiceId[]) {
    return getPortfolioCaseStudies().filter((study) => study.services.some((id) => serviceIds.includes(id)));
}

/** The next case study that has its own page, wrapping round. */
export function getNextCaseStudy(study: PortfolioCaseStudy, { includeSamples = false } = {}) {
    const withPages = getPortfolioCaseStudies({ includeSamples }).filter(hasCaseStudyPage);
    if (withPages.length < 2) {
        return null;
    }

    const index = withPages.findIndex((item) => item.slug === study.slug);
    return withPages[(index + 1) % withPages.length];
}
