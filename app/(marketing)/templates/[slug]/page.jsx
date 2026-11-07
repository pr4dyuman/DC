import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import TemplateActionLink from "@/components/marketing/templates/TemplateActionLink";
import BrowserFrame from "@/components/marketing/BrowserFrame";
import TemplateCard from "@/components/marketing/templates/TemplateCard";
import TemplateCustomiseBand from "@/components/marketing/templates/TemplateCustomiseBand";
import TemplatePageTour from "@/components/marketing/templates/TemplatePageTour";
import TemplateScrollPreview from "@/components/marketing/templates/TemplateScrollPreview";
import {
  MARKETING_TEMPLATE_INCLUDES,
  getMarketingTemplate,
  getMarketingTemplates,
} from "@/lib/marketing-templates";
import {
  MARKETING_SITE_NAME,
  MARKETING_SITE_URL,
  buildMarketingMetadata,
  getMarketingBreadcrumbJsonLd,
  marketingAbsoluteUrl,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMarketingTemplates().map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const template = getMarketingTemplate(slug);
  if (!template) {
    return {};
  }

  return buildMarketingMetadata({
    title: `${template.metaTitle} | Digital Corvids`,
    description: `${template.summary} ${template.pageCount} pages, ${template.stack.slice(0, 2).join(" and ")}. ${template.priceLabel}.`,
    path: template.path,
    image: template.ogImage,
    keywords: template.keywords,
  });
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

function padCount(value) {
  return String(value).padStart(2, "0");
}

// Product markup only when the template can be bought online; a request-only
// template has no offer to describe.
function getProductJsonLd(template) {
  if (template.purchase.kind === "request") {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${template.name} ${template.title}`,
    description: template.summary,
    image: [marketingAbsoluteUrl(template.ogImage)],
    url: marketingAbsoluteUrl(template.path),
    category: "Website template",
    brand: {
      "@type": "Brand",
      name: MARKETING_SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      price: template.priceUsd,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: template.purchase.href,
      seller: {
        "@id": `${MARKETING_SITE_URL}/#organization`,
      },
    },
  };
}

export default async function TemplatePage({ params }) {
  const { slug } = await params;
  const template = getMarketingTemplate(slug);
  if (!template) {
    notFound();
  }

  const otherTemplates = getMarketingTemplates().filter((item) => item.slug !== template.slug);
  const structuredData = [
    getMarketingBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Templates", path: "/templates" },
      { name: template.name, path: template.path },
    ]),
    getProductJsonLd(template),
  ].filter(Boolean);

  const specs = [
    ["Pages", `${template.pageCount} complete pages`],
    ["Built with", template.stack.join(" · ")],
    ["Fonts", template.fonts],
    ["Version", template.version],
  ];

  return (
    <main data-site-width="wide" className="bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />

      <section className="border-b border-white/10 px-[var(--site-gutter)] pb-12 pt-8 sm:pt-10 lg:pb-16">
        <div className="mx-auto max-w-[var(--site-content)]">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              <li>
                <Link href="/templates" prefetch={false} className={`transition-colors hover:text-[#F5EE30] ${focusRing}`}>
                  Templates
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[#F5EE30]">
                {template.name}
              </li>
            </ol>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.26em] text-[#F5EE30]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/30"
                  style={{ backgroundColor: template.accent }}
                  aria-hidden="true"
                />
                {template.niche}
              </p>
              <h1 className="mt-5 break-words font-suifak text-[clamp(3rem,7vw,6rem)] uppercase leading-[0.88]">
                {template.name}
              </h1>
              <p className="mt-4 text-sm font-bold uppercase leading-6 tracking-[0.18em] text-white/70">
                {template.title}
              </p>
              <p className="mt-6 max-w-xl text-base leading-7 text-gray-300 sm:text-lg">{template.summary}</p>

              <div className="mt-8 flex items-end gap-3">
                <p className="text-5xl font-bold leading-none tracking-[0.02em]">{template.priceLabel}</p>
                <p className="pb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/50">USD</p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <TemplateActionLink
                  href={template.purchase.href}
                  external={template.purchase.external}
                  action={template.purchase.kind === "request" ? "request" : "buy"}
                  templateSlug={template.slug}
                >
                  {template.purchase.label}
                </TemplateActionLink>
                {template.demoUrl ? (
                  <TemplateActionLink
                    href={template.demoUrl}
                    external
                    action="demo"
                    templateSlug={template.slug}
                    variant="secondary"
                  >
                    Live Demo
                  </TemplateActionLink>
                ) : (
                  <Link
                    href="#tour"
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] ${focusRing}`}
                  >
                    Tour Every Page
                  </Link>
                )}
              </div>

              <p className="mt-5 text-sm leading-6 text-gray-400">
                Prefer a finished site?{" "}
                <Link
                  href={template.customiseHref}
                  prefetch={false}
                  data-template-cta="customise"
                  data-template-slug={template.slug}
                  className={`font-bold text-white underline decoration-[#F5EE30] decoration-2 underline-offset-4 transition-colors hover:text-[#F5EE30] ${focusRing}`}
                >
                  We can customise it for you
                </Link>
                .
              </p>
            </div>

            <div className="group min-w-0">
              <BrowserFrame
                label={`${template.name} · home page`}
                status={template.demoUrl ? "Live demo" : "Preview"}
              >
                <TemplateScrollPreview
                  image={template.card}
                  alt={`${template.name} template home page`}
                  sizes="(min-width: 1024px) 40rem, 100vw"
                  priority
                  className="aspect-[16/11]"
                />
              </BrowserFrame>
            </div>
          </div>

          <dl className="mt-12 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {specs.map(([label, value]) => (
              <div key={label} className="bg-black p-5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">{label}</dt>
                <dd className="mt-2 text-sm font-bold uppercase leading-6 tracking-[0.08em] text-white/85">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="tour" className="scroll-mt-6 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                Page Tour
              </p>
              <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">See Every Page</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-gray-400">
              Full-page captures of the demo, on desktop and on a phone.
              {template.demoUrl ? " Or open the live demo and click through it yourself." : ""}
            </p>
          </div>

          <div className="mt-8">
            <TemplatePageTour
              templateName={template.name}
              templateSlug={template.slug}
              pages={template.tour}
              demoUrl={template.demoUrl}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
            Signature Features
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-bold uppercase leading-[0.96] sm:text-5xl">
            The details that do the selling
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-2">
            {template.signature.map((item, index) => (
              <article key={item.title} className="bg-black p-6 sm:p-8">
                <p className="text-xs font-bold tracking-[0.24em] text-[#F5EE30]">{padCount(index + 1)}</p>
                <h3 className="mt-5 text-2xl font-bold uppercase leading-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-[var(--site-content)] gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
              About {template.name}
            </p>
            <h2 className="mt-4 text-3xl font-bold uppercase leading-tight sm:text-4xl">{template.title}</h2>
            <div className="mt-6 space-y-5 text-base leading-7 text-gray-300">
              {template.description.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>

            <h3 className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-white/50">
              {template.pageCount} pages included
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {template.pages.map((page) => (
                <li
                  key={page}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/80"
                >
                  {page}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Everything in {template.name}</h3>
            <ul className="mt-4 border-t border-white/10">
              {template.features.map((feature) => (
                <li key={feature} className="flex gap-3 border-b border-white/10 py-3.5 text-sm leading-6 text-white/85">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                In The Download
              </p>
              <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Ready To Edit And Upload</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-gray-400">
              The demo photos are not included: the download ships neutral placeholders at the same sizes, ready
              for your own photography.
            </p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {MARKETING_TEMPLATE_INCLUDES.map((item) => (
              <article key={item.title} className="bg-black p-6">
                <h3 className="text-base font-bold uppercase leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TemplateCustomiseBand template={template} />

      {otherTemplates.length ? (
        <section className="px-[var(--site-gutter)] py-16 sm:py-20">
          <div className="mx-auto max-w-[var(--site-content)]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                  More Templates
                </p>
                <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Other Starting Points</h2>
              </div>
              <Link
                href="/templates"
                prefetch={false}
                className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`}
              >
                All Templates
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {otherTemplates.map((item) => (
                <TemplateCard
                  key={item.slug}
                  template={item}
                  sizes="(min-width: 1024px) 24rem, (min-width: 768px) 45vw, 100vw"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
