"use client";

import { Moon, Sun } from "lucide-react";
import { useBlogTheme } from "./BlogThemeProvider";
import { cn } from "@/lib/utils";

interface BlogThemeToggleProps {
  className?: string;
}

function BlogThemeToggle({ className }: BlogThemeToggleProps) {
  const { theme, toggleTheme } = useBlogTheme();
  const isDark = theme === "dark";
  const actionLabel = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      aria-label={actionLabel}
      aria-pressed={isDark}
      title={actionLabel}
      onClick={toggleTheme}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--blog-border)] bg-[var(--blog-surface)] text-[var(--blog-text)] shadow-sm transition-colors hover:bg-[var(--blog-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blog-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--blog-bg)]",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}

export { BlogThemeToggle };
export default BlogThemeToggle;
