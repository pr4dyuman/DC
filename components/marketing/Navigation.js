"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Menu } from "lucide-react"; // clean icons

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const pathname = usePathname();

  const servicesList = [
    { name: "Web Development", href: "/services/web-development" },
    { name: "SEO", href: "/services/seo" },
    { name: "Social Media Marketing", href: "/services/social-media-marketing" },
    { name: "Video Production", href: "/services/video-production-ad" },
    { name: "PPC", href: "/services/ppc" },
    { name: "Influencer Marketing", href: "/services/influencer-marketing" },
    { name: "Manage Company", href: "/services/manage-company" },
  ];

  useEffect(() => {
    // Lock body scroll when mobile menu is open
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-black text-white shadow-md py-6 md:py-7 font-glacial relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
        {/* Logo Section */}
        <Link href="/" className="flex items-center space-x-3 group">
          <span className="text-[#F5EE30] text-5xl sm:text-6xl md:text-7xl font-suifak tracking-tight group-hover:drop-shadow-[0_0_10px_rgba(245,238,48,0.5)] transition-all">
            DC
          </span>
          <span className="text-xl sm:text-2xl font-suifak leading-tight text-white group-hover:text-gray-200 transition-colors">
            Digital <br /> Corvids
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex space-x-14 text-xl font-glacial-bold tracking-wide">
          <li>
            <Link
              href="/"
              className={`transition-all duration-200 ${isActive("/") ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"
                }`}
            >
              HOME
            </Link>
          </li>
          <li className="relative group">
            <Link
              href="/services"
              className={`transition-all duration-200 ${isActive("/services")
                  ? "text-[#F5EE30]"
                  : "hover:text-[#F5EE30]"
                }`}
            >
              SERVICES
            </Link>
            {/* Dropdown Menu */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 hidden group-hover:block w-56">
              <div className="bg-black/50 border border-white/10 shadow-xl rounded-sm overflow-hidden flex flex-col">
                {servicesList.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    className={`px-4 py-3 hover:bg-white/10 hover:text-[#F5EE30] transition-colors border-b border-white/5 last:border-0 text-white ${isActive(service.href) ? "text-[#F5EE30]" : ""
                      }`}
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>

          </li>
          <li>
            <Link
              href="/about"
              className={`transition-all duration-200 ${isActive("/about") ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"
                }`}
            >
              ABOUT US
            </Link>
          </li>
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Link
            href="/contact"
            className="text-4xl font-bold hover:text-[#F5EE30] transition-all duration-200 font-etna"
          >
            GET IN TOUCH
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          aria-label="Toggle menu"
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-7 h-7" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Background Overlay */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        ></div>

        {/* Slide-in Panel */}
        <div className="absolute top-0 right-0 w-4/5 max-w-sm h-full bg-black shadow-[-5px_0_15px_rgba(0,0,0,0.5)] p-8 flex flex-col">
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
              className={`block py-2 border-b border-white/10 ${isActive("/") ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"
                }`}
              onClick={() => setMobileOpen(false)}
            >
              HOME
            </Link>

            {/* Mobile Services with Dropdown */}
            <div>
              <button
                className={`w-full text-left py-2 border-b border-white/10 flex items-center justify-between ${pathname.startsWith("/services")
                    ? "text-[#F5EE30]"
                    : "hover:text-[#F5EE30]"
                  }`}
                onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              >
                <span>SERVICES</span>
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${mobileServicesOpen ? "rotate-180" : ""
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
                className={`overflow-hidden transition-all duration-300 ${mobileServicesOpen ? "max-h-96" : "max-h-0"
                  }`}
              >
                <div className="pl-4 space-y-2 py-2">
                  {servicesList.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className={`block py-2 text-lg ${isActive(service.href)
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
              className={`block py-2 border-b border-white/10 ${isActive("/about") ? "text-[#F5EE30]" : "hover:text-[#F5EE30]"
                }`}
              onClick={() => setMobileOpen(false)}
            >
              ABOUT US
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
    </nav>
  );
}
