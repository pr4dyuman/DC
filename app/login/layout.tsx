import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login | Digital Corvids",
    description: "Sign in to your Digital Corvids account.",
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
