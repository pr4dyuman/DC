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
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === "undefined") {
            return "dark";
        }

        const stored = localStorage.getItem("agency-os-theme");
        return stored === "light" || stored === "dark" ? stored : "dark";
    });

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

    // Prevent flash of wrong theme
    if (!isHydrated) {
        return <>{children}</>;
    }

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
