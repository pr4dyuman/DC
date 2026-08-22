import { BlogThemeProvider } from "@/components/marketing/blog/BlogThemeProvider";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

const BLOG_THEME_COOKIE_NAME = "dc-blog-theme";

type BlogTheme = "light" | "dark";

export default async function BlogLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get(BLOG_THEME_COOKIE_NAME)?.value;
  const initialTheme: BlogTheme = savedTheme === "dark" ? "dark" : "light";

  return (
    <BlogThemeProvider initialTheme={initialTheme}>
      {children}
    </BlogThemeProvider>
  );
}
