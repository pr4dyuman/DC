"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "dark",
    setTheme: () => { },
});

const subscribe = () => () => { };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);
    const [storedTheme, setTheme] = useState<Theme>(() => {
        if (typeof window === "undefined") {
            return "dark";
        }

        const stored = localStorage.getItem("agency-os-theme");
        return stored === "light" || stored === "dark" ? stored : "dark";
    });

    // Until hydration finishes, report the theme the server rendered with, so
    // the first client render matches the HTML. The saved choice applies right
    // after.
    const theme: Theme = isHydrated ? storedTheme : "dark";

    useEffect(() => {
        if (!isHydrated) return;

        const root = document.documentElement;
        // Toggle dark class on <html> element
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        // Also update the body class for backward compat
        if (theme === "dark") {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }

        // Update sonner toaster theme
        const toaster = document.querySelector('[data-sonner-toaster]');
        if (toaster) {
            toaster.setAttribute('data-theme', theme);
        }

        localStorage.setItem("agency-os-theme", theme);
    }, [theme, isHydrated]);

    // Always render the provider. Rendering a bare fragment before hydration and
    // the provider after it changed the element type, so React threw away and
    // rebuilt every page's DOM right after it loaded.
    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
