"use client";

import { useEffect } from "react";

export default function SingularityLayout({
    children
}: {
    children: React.ReactNode;
}) {
    // Force body bg to match on mount/unmount
    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        const originalBg = document.body.style.backgroundColor;
        document.body.style.backgroundColor = isDark ? '#000' : '#fff';

        return () => {
            document.body.style.backgroundColor = originalBg;
        };
    }, []);

    return (
        <div
            data-singularity
            className="fixed inset-0 z-[9999] bg-white dark:bg-black overflow-hidden"
        >
            {children}
        </div>
    );
}
