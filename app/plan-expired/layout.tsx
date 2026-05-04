import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Plan Expired | Digital Corvids",
    description: "Digital Corvids account plan renewal page.",
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default function PlanExpiredLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
