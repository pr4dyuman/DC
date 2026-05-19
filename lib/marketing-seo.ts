import type { Metadata } from "next";

export const MARKETING_SITE_NAME = "Digital Corvids";

export const MARKETING_DEFAULT_DESCRIPTION =
    "Digital Corvids is a Jaipur-based digital marketing agency for SEO, PPC, social media marketing, web development, video production, influencer marketing, and AI blogging.";

export const MARKETING_EMAIL = "flytheraven@digitalcorvids.com";
export const MARKETING_PHONE = "+91-8003177679";
export const MARKETING_PHONE_E164 = "+918003177679";
export const MARKETING_ADDRESS = {
    streetAddress: "Malviya Nagar",
    addressLocality: "Jaipur",
    addressRegion: "Rajasthan",
    addressCountry: "IN",
};
export const MARKETING_SOCIAL_PROFILES = [
    "https://www.facebook.com/profile.php?id=61571171168177",
    "https://www.instagram.com/digitalcorvids/",
    "https://www.linkedin.com/company/digital-corvids/",
    "https://www.linkedin.com/in/digital-corvids-681389306",
    "https://wa.me/918003177679",
];

export const MARKETING_SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://digitalcorvids.com"
).replace(/\/+$/, "");

const DEFAULT_SOCIAL_IMAGE_PATH = "/og-image";
const DEFAULT_TWITTER_IMAGE_PATH = "/og-image";

const marketingOfferCatalog = [
    {
        name: "SEO Services",
        url: "/services/seo",
        serviceType: "Search Engine Optimization",
    },
    {
        name: "PPC Advertising",
        url: "/services/ppc",
        serviceType: "Paid Search and Paid Media Advertising",
    },
    {
        name: "Social Media Marketing",
        url: "/services/social-media-marketing",
        serviceType: "Social Media Marketing",
    },
    {
        name: "Web Development",
        url: "/services/web-development",
        serviceType: "Website Design and Development",
    },
    {
        name: "Video Production and Ad Films",
        url: "/services/video-production-ad",
        serviceType: "Video Production",
    },
    {
        name: "Influencer Marketing",
        url: "/services/influencer-marketing",
        serviceType: "Influencer Marketing",
    },
    {
        name: "AI Blogger",
        url: "/services/ai-blogger",
        serviceType: "AI-assisted Blog Planning and Publishing",
    },
];

export function marketingAbsoluteUrl(path = "/") {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return `${MARKETING_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function getOptionalEnvValue(...names: string[]) {
    for (const name of names) {
        const value = process.env[name]?.trim();
        if (value) {
            return value;
        }
    }

    return undefined;
}

export function getMarketingVerificationMetadata(): Metadata["verification"] | undefined {
    const google = getOptionalEnvValue(
        "GOOGLE_SITE_VERIFICATION",
        "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
    );
    const yandex = getOptionalEnvValue(
        "YANDEX_SITE_VERIFICATION",
        "NEXT_PUBLIC_YANDEX_SITE_VERIFICATION",
    );
    const bing = getOptionalEnvValue(
        "BING_SITE_VERIFICATION",
        "NEXT_PUBLIC_BING_SITE_VERIFICATION",
        "MSVALIDATE_SITE_VERIFICATION",
        "NEXT_PUBLIC_MSVALIDATE_SITE_VERIFICATION",
    );
    const pinterest = getOptionalEnvValue(
        "PINTEREST_SITE_VERIFICATION",
        "NEXT_PUBLIC_PINTEREST_SITE_VERIFICATION",
    );

    const other: Record<string, string> = {};
    if (bing) {
        other["msvalidate.01"] = bing;
    }
    if (pinterest) {
        other["p:domain_verify"] = pinterest;
    }

    if (!google && !yandex && Object.keys(other).length === 0) {
        return undefined;
    }

    return {
        google,
        yandex,
        other: Object.keys(other).length > 0 ? other : undefined,
    };
}

export function buildMarketingMetadata(input: {
    title: string;
    description?: string;
    path?: string;
    image?: string;
    keywords?: string[];
    noIndex?: boolean;
}): Metadata {
    const path = input.path || "/";
    const description = input.description || MARKETING_DEFAULT_DESCRIPTION;
    const canonicalUrl = marketingAbsoluteUrl(path);
    const imageUrl = marketingAbsoluteUrl(input.image || DEFAULT_SOCIAL_IMAGE_PATH);
    const twitterImageUrl = input.image
        ? imageUrl
        : marketingAbsoluteUrl(DEFAULT_TWITTER_IMAGE_PATH);

    return {
        metadataBase: new URL(MARKETING_SITE_URL),
        applicationName: MARKETING_SITE_NAME,
        title: input.title,
        description,
        keywords: input.keywords,
        verification: getMarketingVerificationMetadata(),
        alternates: {
            canonical: canonicalUrl,
        },
        robots: input.noIndex
            ? {
                index: false,
                follow: false,
                googleBot: {
                    index: false,
                    follow: false,
                },
            }
            : {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    "max-image-preview": "large",
                    "max-snippet": -1,
                    "max-video-preview": -1,
                },
            },
        openGraph: {
            type: "website",
            url: canonicalUrl,
            title: input.title,
            description,
            siteName: MARKETING_SITE_NAME,
            locale: "en_IN",
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: `${MARKETING_SITE_NAME} digital marketing services`,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: input.title,
            description,
            images: [twitterImageUrl],
        },
    };
}

export function getMarketingOrganizationJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": `${MARKETING_SITE_URL}/#organization`,
        name: MARKETING_SITE_NAME,
        alternateName: "DC Digital Corvids",
        url: MARKETING_SITE_URL,
        logo: marketingAbsoluteUrl("/favicon.ico"),
        image: marketingAbsoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH),
        description: MARKETING_DEFAULT_DESCRIPTION,
        email: MARKETING_EMAIL,
        telephone: MARKETING_PHONE,
        priceRange: "$$",
        address: {
            "@type": "PostalAddress",
            ...MARKETING_ADDRESS,
        },
        areaServed: [
            {
                "@type": "City",
                name: "Jaipur",
            },
            {
                "@type": "State",
                name: "Rajasthan",
            },
            {
                "@type": "Country",
                name: "India",
            },
        ],
        contactPoint: [
            {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: MARKETING_EMAIL,
                telephone: MARKETING_PHONE_E164,
                areaServed: "IN",
                availableLanguage: ["en", "hi"],
            },
        ],
        sameAs: MARKETING_SOCIAL_PROFILES,
        knowsAbout: [
            "Digital marketing strategy",
            "Search engine optimization",
            "Paid media advertising",
            "Social media marketing",
            "Website development",
            "Video advertising",
            "Influencer marketing",
            "AI-assisted content workflows",
        ],
        serviceType: [
            "Search Engine Optimization",
            "PPC Advertising",
            "Social Media Marketing",
            "Web Development",
            "Video Production",
            "Influencer Marketing",
            "AI Blogging",
        ],
        hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Digital Corvids digital marketing services",
            itemListElement: marketingOfferCatalog.map((service) => ({
                "@type": "Offer",
                itemOffered: {
                    "@type": "Service",
                    name: service.name,
                    serviceType: service.serviceType,
                    url: marketingAbsoluteUrl(service.url),
                },
            })),
        },
    };
}

export function getMarketingWebsiteJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${MARKETING_SITE_URL}/#website`,
        name: MARKETING_SITE_NAME,
        url: MARKETING_SITE_URL,
        description: MARKETING_DEFAULT_DESCRIPTION,
        inLanguage: "en-IN",
        publisher: {
            "@id": `${MARKETING_SITE_URL}/#organization`,
        },
    };
}

export function getMarketingContactPageJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "@id": `${marketingAbsoluteUrl("/contact")}#webpage`,
        name: "Contact Digital Corvids",
        url: marketingAbsoluteUrl("/contact"),
        description:
            "Contact Digital Corvids in Jaipur for SEO, PPC, social media marketing, web development, video production, influencer marketing, and AI blogging support.",
        inLanguage: "en-IN",
        isPartOf: {
            "@id": `${MARKETING_SITE_URL}/#website`,
        },
        about: {
            "@id": `${MARKETING_SITE_URL}/#organization`,
        },
        mainEntity: {
            "@id": `${MARKETING_SITE_URL}/#organization`,
        },
    };
}

export function serializeMarketingJsonLd(data: unknown) {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function getMarketingBreadcrumbJsonLd(
    items: Array<{
        name: string;
        path: string;
    }>,
) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: marketingAbsoluteUrl(item.path),
        })),
    };
}

export function getMarketingServiceJsonLd(input: {
    name: string;
    description: string;
    path: string;
    serviceType?: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "Service",
        name: input.name,
        serviceType: input.serviceType || input.name,
        description: input.description,
        url: marketingAbsoluteUrl(input.path),
        provider: {
            "@type": "ProfessionalService",
            "@id": `${MARKETING_SITE_URL}/#organization`,
            name: MARKETING_SITE_NAME,
            url: MARKETING_SITE_URL,
            email: MARKETING_EMAIL,
            telephone: MARKETING_PHONE,
            address: {
                "@type": "PostalAddress",
                ...MARKETING_ADDRESS,
            },
        },
        areaServed: [
            {
                "@type": "City",
                name: "Jaipur",
            },
            {
                "@type": "Country",
                name: "India",
            },
        ],
    };
}
