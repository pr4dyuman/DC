"use client";

import Image from "next/image";
import { Monitor, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import TemplateActionLink from "./TemplateActionLink";
import BrowserFrame from "@/components/marketing/BrowserFrame";

const PHONE_QUERY = "(max-width: 639px)";

function subscribeToPhoneQuery(callback) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

const getPhoneSnapshot = () => window.matchMedia(PHONE_QUERY).matches;
const getServerPhoneSnapshot = () => false;

const DEVICES = [
  { id: "desktop", label: "Desktop", Icon: Monitor },
  { id: "mobile", label: "Mobile", Icon: Smartphone },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// Page-by-page screenshots of a template, in a browser or phone frame. Works
// without a hosted demo; the live demo link appears once one is configured.
export default function TemplatePageTour({ templateName, templateSlug, pages, demoUrl }) {
  const [activeId, setActiveId] = useState(pages[0]?.id);
  const [chosenDevice, setChosenDevice] = useState(null);
  const isPhone = useSyncExternalStore(subscribeToPhoneQuery, getPhoneSnapshot, getServerPhoneSnapshot);

  const activePage = pages.find((page) => page.id === activeId) || pages[0];
  if (!activePage) return null;

  const device = chosenDevice || (isPhone ? "mobile" : "desktop");
  const showMobile = device === "mobile" && Boolean(activePage.mobile);
  const shot = showMobile ? activePage.mobile : activePage.desktop;
  const viewLabel = showMobile ? "mobile" : "desktop";
  const pageNumber = pages.indexOf(activePage) + 1;
  const mobileMissing = device === "mobile" && !activePage.mobile;
  const regionLabel = `${templateName} ${activePage.label} page, ${viewLabel} view. Scroll to see the whole page.`;
  const screenshotAlt = `${templateName} template, ${activePage.label} page, full-page ${viewLabel} screenshot`;

  return (
    <div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={`${templateName} pages`}>
          {pages.map((page) => {
            const isActive = page.id === activePage.id;

            return (
              <button
                key={page.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveId(page.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${focusRing} ${
                  isActive
                    ? "border-[#F5EE30] bg-[#F5EE30] text-black"
                    : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {page.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="inline-flex rounded-full border border-white/15 p-1" role="group" aria-label="Preview size">
            {DEVICES.map(({ id, label, Icon }) => {
              const unavailable = id === "mobile" && !activePage.mobile;
              const isActive = id === viewLabel;

              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  disabled={unavailable}
                  title={unavailable ? `No mobile capture of ${activePage.label}` : undefined}
                  onClick={() => setChosenDevice(id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${focusRing} ${
                    isActive ? "bg-white text-black" : "text-white/70 hover:text-white"
                  } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-white/70`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          {demoUrl ? (
            <TemplateActionLink href={demoUrl} external action="demo" templateSlug={templateSlug} variant="text">
              Open live demo
            </TemplateActionLink>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-white/50" aria-live="polite">
        Page {pageNumber} of {pages.length} · {activePage.label} · {viewLabel}
        {mobileMissing ? " (no mobile capture of this page)" : ""}
        <span className="hidden sm:inline"> · Scroll inside the preview</span>
      </p>

      <div className="mt-5">
        {showMobile ? (
          <div className="mx-auto w-full max-w-[22rem] rounded-[2.5rem] border border-white/15 bg-[#0d0d0d] p-3 shadow-[0_40px_90px_-50px_rgba(245,238,48,0.45)]">
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/15" aria-hidden="true" />
            <div
              key={`${activePage.id}-mobile`}
              tabIndex={0}
              role="region"
              aria-label={regionLabel}
              className={`h-[min(68vh,640px)] overflow-y-auto rounded-[1.75rem] bg-black [scrollbar-width:thin] ${focusRing}`}
            >
              <Image
                src={shot.src}
                width={shot.width}
                height={shot.height}
                alt={screenshotAlt}
                sizes="22rem"
                className="block h-auto w-full"
              />
            </div>
          </div>
        ) : (
          <BrowserFrame label={`${templateName} / ${activePage.label}`} status="Desktop · 1440 px">
            <div
              key={`${activePage.id}-desktop`}
              tabIndex={0}
              role="region"
              aria-label={regionLabel}
              className={`h-[min(72vh,760px)] overflow-y-auto bg-black [scrollbar-width:thin] ${focusRing} focus-visible:outline-offset-[-4px]`}
            >
              <Image
                src={shot.src}
                width={shot.width}
                height={shot.height}
                alt={screenshotAlt}
                sizes="(min-width: 1280px) 72rem, 100vw"
                className="block h-auto w-full"
              />
            </div>
          </BrowserFrame>
        )}
      </div>
    </div>
  );
}
