import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/Footer";
import MarketingConversionTracker from "@/components/marketing/MarketingConversionTracker";
import { GoogleAnalytics } from "@/components/providers/GoogleAnalytics";
import {
    buildMarketingMetadata,
    getMarketingOrganizationJsonLd,
    getMarketingWebsiteJsonLd,
    serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
    title: "Digital Corvids | Digital Marketing Agency in Jaipur",
    description:
        "Digital Corvids helps businesses grow with SEO, PPC, social media marketing, web development, video production, influencer marketing, and AI blogging.",
    path: "/",
    keywords: [
        "Digital Corvids",
        "digital marketing agency Jaipur",
        "SEO agency Jaipur",
        "PPC advertising agency",
        "social media marketing agency",
        "web development agency",
    ],
});

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const structuredData = [
        getMarketingOrganizationJsonLd(),
        getMarketingWebsiteJsonLd(),
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <link
                rel="preload"
                href="/fonts/etna.otf"
                as="font"
                type="font/otf"
                crossOrigin="anonymous"
            />
            <link
                rel="preload"
                href="/fonts/Glacial.otf"
                as="font"
                type="font/otf"
                crossOrigin="anonymous"
            />
            <link
                rel="preload"
                href="/fonts/Glacial-bold.otf"
                as="font"
                type="font/otf"
                crossOrigin="anonymous"
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
            />
            <MarketingConversionTracker />
            <GoogleAnalytics />
            <Navigation />
            {children}
            <Footer />
        </div>
    );
}
