"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ExternalLink, Menu, X } from "lucide-react";

import { getMarketingContactHref } from "@/lib/marketing-contact";
import { MARKETING_PRODUCT_PATH_PREFIXES } from "@/lib/marketing-products";

function hasLoggedInCookie() {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("logged_in=1"));
}

function subscribeToCookieChanges() {
  return () => {};
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// A menu entry that opens a list of links below it (Services, Products).
function MobileSubmenu({ id, label, open, active, onToggle, children }) {
  return (
    <div>
      <button
        aria-controls={id}
        aria-expanded={open}
        className={`w-full text-left py-2 border-b border-white/10 flex items-center justify-between ${focusRing} ${
          active ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"
        }`}
        onClick={onToggle}
      >
        <span>{label}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={id}
        aria-hidden={!open}
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-[40rem]" : "max-h-0"}`}
      >
        <div className="pl-4 space-y-2 py-2">{children}</div>
      </div>
    </div>
  );
}

export default function MobileNavigation({ servicesList, productsList }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const pathname = usePathname();
  const mobileMenuId = "mobile-navigation-panel";
  const isLoggedIn = useSyncExternalStore(
    subscribeToCookieChanges,
    hasLoggedInCookie,
    () => false,
  );

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const isActive = (path) => pathname === path;
  const isInSection = (prefixes) =>
    prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const toggleSubmenu = (name) => setOpenSubmenu((current) => (current === name ? null : name));
  const closeMenu = () => setMobileOpen(false);

  const topLinkClass = (active) =>
    `block py-2 border-b border-white/10 ${focusRing} ${active ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"}`;
  const subLinkClass = (active) => `block py-2 text-lg ${focusRing} ${active ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"}`;

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        aria-label="Open mobile menu"
        aria-controls={mobileMenuId}
        aria-expanded={mobileOpen}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-7 h-7" aria-hidden="true" />
      </button>

      {/* Mobile Menu Overlay */}
      <div
        id={mobileMenuId}
        aria-hidden={!mobileOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed left-0 top-0 z-50 h-[100dvh] w-screen max-w-[100vw] overflow-hidden transition-opacity duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "block pointer-events-auto opacity-100" : "hidden pointer-events-none opacity-0"
        }`}
      >
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeMenu}></div>

        {/* Slide-in Panel */}
        <div
          className={`absolute right-0 top-0 flex h-full min-h-0 w-4/5 max-w-sm transform flex-col overflow-y-auto overscroll-contain bg-black p-6 shadow-[-5px_0_15px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out sm:p-8 ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Close Icon */}
          <button
            aria-label="Close menu"
            className="mb-6 inline-flex size-11 shrink-0 items-center justify-center self-end rounded-full text-white transition-colors hover:bg-white/10 hover:text-[#F5EE30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] sm:mb-10"
            onClick={closeMenu}
          >
            <X className="w-8 h-8" aria-hidden="true" />
          </button>

          {/* Links */}
          <nav className="space-y-3 text-xl font-semibold uppercase sm:space-y-5 sm:text-2xl">
            <Link href="/" prefetch={false} className={topLinkClass(isActive("/"))} onClick={closeMenu}>
              HOME
            </Link>

            <MobileSubmenu
              id="mobile-navigation-services"
              label="SERVICES"
              open={openSubmenu === "services"}
              active={pathname.startsWith("/services")}
              onToggle={() => toggleSubmenu("services")}
            >
              {servicesList.map((service) => (
                <Link
                  key={service.href}
                  href={service.href}
                  prefetch={false}
                  tabIndex={openSubmenu === "services" ? undefined : -1}
                  className={subLinkClass(isActive(service.href))}
                  onClick={closeMenu}
                >
                  {service.name}
                </Link>
              ))}
            </MobileSubmenu>

            <Link
              href="/portfolio"
              prefetch={false}
              className={topLinkClass(isInSection(["/portfolio"]))}
              onClick={closeMenu}
            >
              PORTFOLIO
            </Link>

            <MobileSubmenu
              id="mobile-navigation-products"
              label="PRODUCTS"
              open={openSubmenu === "products"}
              active={isInSection(MARKETING_PRODUCT_PATH_PREFIXES)}
              onToggle={() => toggleSubmenu("products")}
            >
              {productsList.map((product) => {
                const tabIndex = openSubmenu === "products" ? undefined : -1;
                const label = (
                  <>
                    <span className="flex items-center gap-2">
                      {product.name}
                      {product.external ? <ExternalLink className="h-4 w-4 opacity-70" aria-hidden="true" /> : null}
                    </span>
                    <span className="mt-0.5 block font-glacial text-sm font-normal normal-case leading-5 text-white/55">
                      {product.summary}
                    </span>
                    {product.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                  </>
                );

                return product.external ? (
                  <a
                    key={product.id}
                    href={product.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={tabIndex}
                    className={subLinkClass(false)}
                    onClick={closeMenu}
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    key={product.id}
                    href={product.href}
                    prefetch={false}
                    tabIndex={tabIndex}
                    className={subLinkClass(isInSection([product.href]))}
                    onClick={closeMenu}
                  >
                    {label}
                  </Link>
                );
              })}
            </MobileSubmenu>

            <Link href="/blog" prefetch={false} className={topLinkClass(isActive("/blog"))} onClick={closeMenu}>
              BLOG
            </Link>

            <Link href="/about" prefetch={false} className={topLinkClass(isActive("/about"))} onClick={closeMenu}>
              ABOUT US
            </Link>
            <Link
              href={getMarketingContactHref()}
              prefetch={false}
              className={`block py-2 hover:text-[#F5EE30] transition-colors font-etna border-b border-white/10 ${focusRing}`}
              onClick={closeMenu}
            >
              GET IN TOUCH
            </Link>
            {/* For clients and Agency OS users, so it sits below the main links */}
            <a
              href={isLoggedIn ? "/dashboard" : "/login"}
              className={`block pt-2 font-glacial-bold text-base tracking-wide text-white/70 hover:text-[#F5EE30] ${focusRing}`}
              onClick={closeMenu}
            >
              {isLoggedIn ? "DASHBOARD" : "LOGIN"}
            </a>
          </nav>
        </div>
      </div>
    </>
  );
}
