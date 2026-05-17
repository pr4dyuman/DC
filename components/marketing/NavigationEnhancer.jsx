"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getCurrentUser } from "@/lib/actions";

const ACTIVE_CLASS = "text-[#F5EE30]";

function clearLoggedInCookie() {
  document.cookie = "logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

function setActiveClass(element, active) {
  element.classList.toggle(ACTIVE_CLASS, active);
}

export default function NavigationEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    document.querySelectorAll("[data-nav-path]").forEach((element) => {
      const path = element.getAttribute("data-nav-path");
      const group = element.getAttribute("data-nav-group");

      let active = pathname === path;
      if (group === "auth") {
        active = pathname === "/login" || pathname === "/dashboard";
      }

      setActiveClass(element, active);
    });
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const syncSessionState = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) return;

        document.querySelectorAll("[data-auth-nav-link]").forEach((element) => {
          if (currentUser) {
            element.setAttribute("href", "/dashboard");
            element.textContent = "DASHBOARD";
          } else {
            element.setAttribute("href", "/login");
            element.textContent = "LOGIN";
          }
        });

        if (!currentUser) {
          clearLoggedInCookie();
        }
      } catch {
        if (!cancelled) {
          clearLoggedInCookie();
          document.querySelectorAll("[data-auth-nav-link]").forEach((element) => {
            element.setAttribute("href", "/login");
            element.textContent = "LOGIN";
          });
        }
      }
    };

    void syncSessionState();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
