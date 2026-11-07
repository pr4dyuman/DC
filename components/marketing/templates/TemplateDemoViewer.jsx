"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";

import TemplateDemoFrame from "./TemplateDemoFrame";

const DEVICES = [
  { id: "desktop", label: "Desktop", Icon: Monitor, width: null },
  { id: "tablet", label: "Tablet", Icon: Tablet, width: 768 },
  { id: "phone", label: "Phone", Icon: Smartphone, width: 390 },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5EE30]";

function PurchaseLink({ purchase, slug }) {
  const className = `inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#F5EE30] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-white sm:px-5 ${focusRing}`;
  const tracking = {
    "data-template-cta": purchase.kind === "request" ? "request" : "buy",
    "data-template-slug": slug,
  };
  const label = (
    <>
      <span className="sm:hidden">{purchase.kind === "request" ? "Request" : "Buy"}</span>
      <span className="hidden sm:inline">{purchase.label}</span>
    </>
  );

  if (purchase.external) {
    return (
      <a href={purchase.href} target="_blank" rel="noopener noreferrer" className={className} {...tracking}>
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={purchase.href} prefetch={false} className={className} {...tracking}>
      {label}
    </Link>
  );
}

// Full-screen live demo of a template on our own domain: the demo fills the
// window under a slim bar with the template name, preview sizes and the buy
// button. Changing the size only resizes the frame, so the demo keeps its page.
export default function TemplateDemoViewer({ name, niche, slug, path, demoUrl, purchase }) {
  const [deviceId, setDeviceId] = useState("desktop");
  const device = DEVICES.find((item) => item.id === deviceId) || DEVICES[0];

  return (
    <main className="flex h-[100dvh] flex-col bg-[#101010] text-white">
      <h1 className="sr-only">{name} template live demo</h1>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-black px-2 sm:gap-3 sm:px-4">
        <Link
          href={path}
          prefetch={false}
          className={`flex h-11 min-w-0 items-center gap-2.5 rounded-full pl-2 pr-3 transition-colors hover:bg-white/10 ${focusRing}`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 leading-tight">
            <span className="sr-only">Back to the </span>
            <span className="block truncate text-sm font-bold uppercase tracking-[0.06em]">{name}</span>
            <span className="sr-only"> template page</span>
            <span className="hidden truncate text-[10px] font-bold uppercase tracking-[0.16em] text-white/50 sm:block" aria-hidden="true">
              Live demo · {niche}
            </span>
          </span>
        </Link>

        <div className="mx-auto hidden rounded-full border border-white/15 p-1 md:inline-flex" role="group" aria-label="Preview size">
          {DEVICES.map(({ id, label, Icon }) => {
            const isActive = id === device.id;

            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setDeviceId(id)}
                className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${focusRing} ${
                  isActive ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0">
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-template-cta="demo_new_tab"
            data-template-slug={slug}
            className={`hidden h-10 items-center gap-2 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex ${focusRing}`}
          >
            New tab
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(opens the demo in a new tab)</span>
          </a>
          <PurchaseLink purchase={purchase} slug={slug} />
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 justify-center ${device.width ? "md:p-4" : ""}`}>
        <div
          className={`relative h-full w-full bg-white ${device.width ? "md:overflow-hidden md:rounded-xl md:border md:border-white/15" : ""}`}
          style={device.width ? { maxWidth: device.width } : undefined}
        >
          <TemplateDemoFrame
            src={demoUrl}
            title={`${name} template live demo`}
            viewportWidth={null}
            className="absolute inset-0"
          />
        </div>
      </div>
    </main>
  );
}
