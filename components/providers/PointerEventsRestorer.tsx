"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * A global utility component that forcibly removes `pointer-events: none` 
 * from the document body.
 * Radix UI (which powers Shadcn Dialogs/Selects/Dropdowns) sometimes fails 
 * to clean up this style when Dialogs are unmounted abruptly via Next.js router actions.
 */
export function PointerEventsRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    // 1. Cleanup on route change
    document.body.style.pointerEvents = "";

    // 2. Setup a MutationObserver to watch for style changes on the body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "style") {
          const style = document.body.getAttribute("style");
          if (style && style.includes("pointer-events: none")) {
            // When Radix adds pointer-events: none, we allow it temporarily.
            // But if it stays for more than 1 second, we assume a lock-up bug 
            // and forcefully remove it.
            setTimeout(() => {
              // Only remove if it's STILL locked
              if (document.body.style.pointerEvents === "none") {
                 console.warn("[PointerEventsRestorer] Forcibly removed stuck pointer-events from body.");
                 document.body.style.pointerEvents = "";
              }
            }, 1000);
          }
        }
      });
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
