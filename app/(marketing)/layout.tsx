import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/Footer";
import MarketingConversionTracker from "@/components/marketing/MarketingConversionTracker";
import WhatsAppButton from "@/components/marketing/WhatsAppButton";
import { GoogleAnalytics } from "@/components/providers/GoogleAnalytics";
import {
    buildMarketingMetadata,
    getMarketingOrganizationJsonLd,
    getMarketingWebsiteJsonLd,
    serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
    title: "Digital Marketing Agency in Jaipur | Digital Corvids",
    description:
        "Digital marketing agency in Jaipur for SEO, Google and Meta ads, social media, websites, video and influencer marketing. Ask for a free marketing plan.",
    path: "/",
    keywords: [
        "digital marketing agency in Jaipur",
        "digital marketing company in Jaipur",
        "Digital Corvids",
        "SEO company in Jaipur",
        "Google Ads agency Jaipur",
        "social media marketing agency Jaipur",
        "website development company Jaipur",
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
                href="/fonts/etna.woff2"
                as="font"
                type="font/woff2"
                crossOrigin="anonymous"
            />
            <link
                rel="preload"
                href="/fonts/Glacial.woff2"
                as="font"
                type="font/woff2"
                crossOrigin="anonymous"
            />
            <link
                rel="preload"
                href="/fonts/Glacial-bold.woff2"
                as="font"
                type="font/woff2"
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
            <WhatsAppButton />
        </div>
    );
}
