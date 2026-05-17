"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/actions";
import { Menu, X } from "lucide-react";

export default function MobileNavigation({ servicesList }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  const clearLoggedInCookie = () => {
    document.cookie = "logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  useEffect(() => {
    let cancelled = false;

    const syncSessionState = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) return;

        if (currentUser) {
          setIsLoggedIn(true);
          return;
        }

        clearLoggedInCookie();
        setIsLoggedIn(false);
      } catch {
        if (!cancelled) {
          clearLoggedInCookie();
          setIsLoggedIn(false);
        }
      }
    };

    void syncSessionState();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (path) => pathname === path;

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        aria-label="Toggle menu"
        className="md:hidden text-white focus:outline-none"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-7 h-7" />
      </button>

      {/* Mobile Menu Overlay */}
      <div
        aria-hidden={!mobileOpen}
        className={`fixed left-0 top-0 z-50 h-[100dvh] w-screen max-w-[100vw] overflow-hidden transition-opacity duration-300 ease-in-out md:hidden ${
          mobileOpen ? "block pointer-events-auto opacity-100" : "hidden pointer-events-none opacity-0"
        }`}
      >
        {/* Background Overlay */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        ></div>

        {/* Slide-in Panel */}
        <div
          className={`absolute top-0 right-0 w-4/5 max-w-sm h-full transform bg-black shadow-[-5px_0_15px_rgba(0,0,0,0.5)] p-8 flex flex-col transition-transform duration-300 ease-in-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Close Icon */}
          <button
            aria-label="Close menu"
            className="self-end text-white hover:text-[#F5EE30] mb-10 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>

          {/* Links */}
          <nav className="space-y-5 text-2xl font-semibold uppercase">
            <Link
              href="/"
              className={`block py-2 border-b border-white/10 ${
                isActive("/") ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              HOME
            </Link>

            {/* Mobile Services with Dropdown */}
            <div>
              <button
                className={`w-full text-left py-2 border-b border-white/10 flex items-center justify-between ${
                  pathname.startsWith("/services")
                    ? "text-[#F5EE30]"
                    : "hover:text-[#F5EE30]"
                }`}
                onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              >
                <span>SERVICES</span>
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${
                    mobileServicesOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  mobileServicesOpen ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="pl-4 space-y-2 py-2">
                  {servicesList.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className={`block py-2 text-lg ${
                        isActive(service.href)
                          ? "text-[#F5EE30]"
                          : "hover:text-[#F5EE30]"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/about"
              className={`block py-2 border-b border-white/10 ${
                isActive("/about") ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              ABOUT US
            </Link>
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="block py-2 text-[#F5EE30] border-b border-white/10"
              onClick={() => setMobileOpen(false)}
            >
              {isLoggedIn ? "DASHBOARD" : "LOGIN"}
            </Link>
            <Link
              href="/contact"
              className="block py-2 hover:text-[#F5EE30] transition-colors font-etna border-b border-white/10"
              onClick={() => setMobileOpen(false)}
            >
              GET IN TOUCH
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
