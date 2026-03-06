import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/footer";

export const metadata = {
    title: "Digital Corvids — Strategic Birds of the Digital Sky",
    description:
        "Digital Corvids is a full-service digital marketing agency specializing in web development, SEO, social media marketing, PPC advertising, video production, and influencer marketing.",
};

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />
            {children}
            <Footer />
        </div>
    );
}
