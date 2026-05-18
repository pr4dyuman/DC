import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { PointerEventsRestorer } from "@/components/providers/PointerEventsRestorer";
import { VercelAnalytics } from "@/components/providers/VercelAnalytics";
import { VercelSpeedInsights } from "@/components/providers/VercelSpeedInsights";
import "./globals.css";

const geistSans = localFont({
  src: [
    { path: "./fonts/geist-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/geist-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [
    { path: "./fonts/geist-mono-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/geist-mono-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Agency OS",
  description: "The complete agency operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} dark bg-background text-foreground`}>
        <ThemeProvider>
          <PointerEventsRestorer />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <VercelAnalytics />
        <VercelSpeedInsights />
      </body>
    </html>
  );
}
