import Link from "next/link";

import HowWeWork from "@/components/marketing/HowWeWork";
import ServiceRows from "@/components/marketing/services/ServiceRows";
import ButtonLink from "@/components/marketing/ui/ButtonLink";
import CtaBand from "@/components/marketing/ui/CtaBand";
import PageHero from "@/components/marketing/ui/PageHero";
import { PageSection, SectionIntro } from "@/components/marketing/ui/PageSection";
import { getMarketingContactHref } from "@/lib/marketing-contact";
import { getMarketingBreadcrumbJsonLd, serializeMarketingJsonLd } from "@/lib/marketing-seo";

// Metadata is in ./layout.js. Each card's copy is in lib/marketing-service-pages.
const structuredData = [
  getMarketingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
  ]),
];

export default function Services() {
  return (
    <main className="bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />

      <PageHero
        eyebrow="What We Do"
        title="Services"
        intro={
          <p className="m-0">
            Marketing and websites for small and growing businesses: websites, search, social, ads, video and creator
            campaigns, planned together so each one makes the others work harder.
          </p>
        }
        actions={
          <>
            <ButtonLink href={getMarketingContactHref({ intent: "plan" })} arrow>
              Get a free marketing plan
            </ButtonLink>
            <ButtonLink href="/portfolio" variant="secondary">
              See our work
            </ButtonLink>
          </>
        }
        checklist={["Clear goals from day one", "One team for every channel", "Honest, measured reporting", "Reply within 24 hours"]}
      />

      <PageSection labelledBy="services-list" bordered={false}>
        <SectionIntro id="services-list" eyebrow="Our Services" title="Six Services," accent="One Team">
          Not sure which you need? Ask for a free plan and we will suggest the right mix.
        </SectionIntro>
        <ServiceRows />

        {/* Agency OS and the templates used to be listed here; they are products now. */}
        <p className="mx-auto mb-0 mt-12 max-w-2xl text-center text-base leading-relaxed text-gray-400">
          Looking for Agency OS, our website templates or zSEO.ai? They are under{" "}
          <Link
            href="/products"
            prefetch={false}
            className="font-glacial-bold text-[#F5EE30] underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]"
          >
            Products
          </Link>
          .
        </p>
      </PageSection>

      <HowWeWork />

      <CtaBand whatsappPath="/services" />
    </main>
  );
}
