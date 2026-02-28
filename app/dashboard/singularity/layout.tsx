"use client";

import { useEffect } from "react";

export default function SingularityLayout({
    children
}: {
    children: React.ReactNode;
}) {
    // Hide topbar and remove padding when this layout mounts
    useEffect(() => {
        const main = document.querySelector('main');
        if (!main) return;

        // Hide the Topbar (first child of main is the Topbar div)
        const topbar = main.querySelector(':scope > div:first-child') as HTMLElement;
        if (topbar) topbar.style.display = 'none';

        // Remove padding from the content wrapper (second child: div.p-8)
        const contentWrapper = main.querySelector(':scope > div.p-8') as HTMLElement;
        if (contentWrapper) {
            contentWrapper.style.padding = '0';
            contentWrapper.style.height = '100vh';
            contentWrapper.style.overflow = 'hidden';
        }

        // Remove min-height/padding from main
        main.style.minHeight = '100vh';
        main.style.paddingBottom = '0';

        return () => {
            // Restore on unmount (when user navigates away)
            if (topbar) topbar.style.display = '';
            if (contentWrapper) {
                contentWrapper.style.padding = '';
                contentWrapper.style.height = '';
                contentWrapper.style.overflow = '';
            }
            main.style.minHeight = '';
            main.style.paddingBottom = '';
        };
    }, []);

    return (
        <div className="h-screen overflow-hidden">
            {children}
        </div>
    );
}
