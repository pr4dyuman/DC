import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/Footer";
import {
    buildMarketingMetadata,
    getMarketingOrganizationJsonLd,
    getMarketingWebsiteJsonLd,
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
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <Navigation />
            {children}
            <Footer />
        </div>
    );
}
