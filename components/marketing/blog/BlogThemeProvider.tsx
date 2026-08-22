"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BlogTheme = "light" | "dark";

export const BLOG_THEME_COOKIE_NAME = "dc-blog-theme";

const BLOG_THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface BlogThemeContextValue {
  theme: BlogTheme;
  setTheme: (theme: BlogTheme) => void;
  toggleTheme: () => void;
}

interface BlogThemeProviderProps {
  children: ReactNode;
  initialTheme: BlogTheme;
}

const BlogThemeContext = createContext<BlogThemeContextValue | null>(null);

function persistThemeCookie(theme: BlogTheme) {
  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${BLOG_THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${BLOG_THEME_COOKIE_MAX_AGE}; SameSite=Lax${secureAttribute}`;
}

export function BlogThemeProvider({
  children,
  initialTheme,
}: BlogThemeProviderProps) {
  const [theme, setThemeState] = useState<BlogTheme>(initialTheme);

  const setTheme = useCallback((nextTheme: BlogTheme) => {
    setThemeState(nextTheme);
    persistThemeCookie(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  const contextValue = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [setTheme, theme, toggleTheme],
  );

  return (
    <BlogThemeContext.Provider value={contextValue}>
      <div
        className="blog-theme-shell"
        data-blog-theme={theme}
        style={{ colorScheme: theme }}
      >
        {children}
      </div>
    </BlogThemeContext.Provider>
  );
}

export function useBlogTheme() {
  const context = useContext(BlogThemeContext);

  if (!context) {
    throw new Error("useBlogTheme must be used within a BlogThemeProvider");
  }

  return context;
}
