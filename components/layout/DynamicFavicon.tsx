"use client";

import { useEffect } from "react";

export function DynamicFavicon({ faviconUrl }: { faviconUrl: string }) {
    useEffect(() => {
        if (!faviconUrl) return;

        // Remove existing favicon link tags
        const existing = document.querySelectorAll("link[rel*='icon']");
        existing.forEach(el => el.remove());

        // Insert new favicon
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = faviconUrl;
        document.head.appendChild(link);
    }, [faviconUrl]);

    return null;
}
