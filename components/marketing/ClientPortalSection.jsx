import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { getMarketingContactHref } from "@/lib/marketing-contact";
import { ClientPortalPreview } from "./ManageCompany";

const portalPoints = ["Live progress on every task", "All your files in one place", "Invoices you can view and pay"];

// Homepage: what working with us looks like for a client. Every client gets a
// login to Agency OS (our own product) to follow their project. Agency OS for
// other agencies is pitched on /agency-os, under Products.
export default function ClientPortalSection() {
  return (
    <section
      aria-labelledby="client-portal-heading"
      className="bg-black px-[var(--site-gutter)] py-12 font-glacial sm:py-16 lg:py-20"
    >
      <div className="mx-auto grid max-w-[var(--site-content)] gap-10 bg-[#F5EE30] px-5 py-10 text-[#0b0b0b] sm:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:p-[72px]">
        <div className="flex flex-col gap-5">
          <span className="font-architects text-lg leading-snug sm:text-[22px]">for our clients</span>
          <h2
            id="client-portal-heading"
            className="m-0 font-glacial-bold text-[clamp(2.25rem,4.6vw,4.5rem)] uppercase leading-[0.95] tracking-[-0.01em] text-balance"
          >
            Always know where your project stands.
          </h2>
          <p className="m-0 max-w-xl text-base leading-relaxed text-pretty sm:text-lg">
            Every client gets a login to Agency OS, our project portal. Check progress, find your files and pay invoices
            whenever you like, without waiting for an update.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {portalPoints.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-base font-glacial-bold sm:text-lg">
                <Check aria-hidden="true" className="h-5 w-5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <Link
              href={getMarketingContactHref()}
              prefetch={false}
              className="group inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#0b0b0b] px-6 font-glacial-bold text-[15px] uppercase tracking-[0.04em] text-[#F5EE30] transition-colors hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b0b0b]"
            >
              Start a project
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="/login"
              className="inline-flex min-h-[44px] items-center font-glacial-bold text-base underline decoration-2 underline-offset-[6px] hover:decoration-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b0b0b]"
            >
              Already a client? Log in
            </a>
          </div>
        </div>

        <ClientPortalPreview />
      </div>
    </section>
  );
}
