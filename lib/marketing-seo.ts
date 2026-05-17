import type { Metadata } from "next";

export const MARKETING_SITE_NAME = "Digital Corvids";

export const MARKETING_DEFAULT_DESCRIPTION =
    "Digital Corvids is a Jaipur-based digital marketing agency for SEO, PPC, social media marketing, web development, video production, influencer marketing, and AI blogging.";

export const MARKETING_SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://digitalcorvids.com"
).replace(/\/+$/, "");

const DEFAULT_IMAGE_PATH = "/hero.webp";

export function marketingAbsoluteUrl(path = "/") {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return `${MARKETING_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
    const imageUrl = marketingAbsoluteUrl(input.image || DEFAULT_IMAGE_PATH);

    return {
        metadataBase: new URL(MARKETING_SITE_URL),
        applicationName: MARKETING_SITE_NAME,
        title: input.title,
        description,
        keywords: input.keywords,
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
            images: [imageUrl],
        },
    };
}

export function getMarketingOrganizationJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: MARKETING_SITE_NAME,
        url: MARKETING_SITE_URL,
        logo: marketingAbsoluteUrl("/favicon.ico"),
        image: marketingAbsoluteUrl(DEFAULT_IMAGE_PATH),
        description: MARKETING_DEFAULT_DESCRIPTION,
        email: "flytheraven@digitalcorvids.com",
        address: {
            "@type": "PostalAddress",
            addressLocality: "Jaipur",
            addressRegion: "Rajasthan",
            addressCountry: "IN",
        },
        areaServed: ["Jaipur", "India"],
        serviceType: [
            "Search Engine Optimization",
            "PPC Advertising",
            "Social Media Marketing",
            "Web Development",
            "Video Production",
            "Influencer Marketing",
            "AI Blogging",
        ],
    };
}

export function getMarketingWebsiteJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: MARKETING_SITE_NAME,
        url: MARKETING_SITE_URL,
        description: MARKETING_DEFAULT_DESCRIPTION,
        inLanguage: "en-IN",
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
            name: MARKETING_SITE_NAME,
            url: MARKETING_SITE_URL,
            email: "flytheraven@digitalcorvids.com",
            address: {
                "@type": "PostalAddress",
                addressLocality: "Jaipur",
                addressRegion: "Rajasthan",
                addressCountry: "IN",
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
