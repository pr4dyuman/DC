"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ACTIVE_CLASS = "text-[#F5EE30]";

function setActiveClass(element, active) {
  element.classList.toggle(ACTIVE_CLASS, active);
}

function hasLoggedInCookie() {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("logged_in=1"));
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
    const isLoggedIn = hasLoggedInCookie();

    document.querySelectorAll("[data-auth-nav-link]").forEach((element) => {
      element.setAttribute("href", isLoggedIn ? "/dashboard" : "/login");
      element.textContent = isLoggedIn ? "DASHBOARD" : "LOGIN";
    });
  }, [pathname]);

  return null;
}
