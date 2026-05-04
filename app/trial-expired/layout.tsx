import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Trial Expired | Digital Corvids",
    description: "Digital Corvids account trial renewal page.",
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default function TrialExpiredLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
