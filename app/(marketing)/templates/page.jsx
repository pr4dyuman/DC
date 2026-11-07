import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import TemplateCard from "@/components/marketing/templates/TemplateCard";
import TemplateCustomiseBand from "@/components/marketing/templates/TemplateCustomiseBand";
import { MARKETING_TEMPLATES_IN_DESIGN } from "@/lib/marketing-templates-catalog";
import {
  MARKETING_TEMPLATE_INCLUDES,
  getLowestMarketingTemplatePrice,
  getMarketingTemplatePageTotal,
  getMarketingTemplates,
} from "@/lib/marketing-templates";
import {
  buildMarketingMetadata,
  getMarketingBreadcrumbJsonLd,
  marketingAbsoluteUrl,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Website Templates | Digital Corvids",
  description:
    "HTML and Tailwind CSS website templates for academies, restaurants, estate agencies, clinics and law firms. Try the live demos, then buy one or have it customised.",
  path: "/templates",
  image: "/templates/og.jpg",
  keywords: [
    "website templates",
    "HTML website templates",
    "Tailwind CSS templates",
    "education website template",
    "restaurant website template",
    "real estate website template",
    "dental clinic website template",
    "law firm website template",
    "Digital Corvids templates",
  ],
});

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const storePrinciples = [
  "HTML + Tailwind CSS",
  "Responsive 360–1920 px",
  "No tracking scripts",
  "Documentation included",
];

function padCount(value) {
  return String(value).padStart(2, "0");
}

function getBuyingCopy(templates) {
  const requestOnly = templates.every((template) => template.purchase.kind === "request");
  const onlineOnly = templates.every((template) => template.purchase.kind !== "request");

  if (requestOnly) {
    return {
      step: "Press “Request this template” on the template page. We reply with a payment link, then send the download.",
      faq: "Open the template you want and press “Request this template”. The contact form opens with the template already named; send it and we reply with a payment link, then send the download.",
    };
  }

  if (onlineOnly) {
    return {
      step: "Press the Buy button on the template page and complete the checkout.",
      faq: "Open the template you want and press its Buy button to check out.",
    };
  }

  return {
    step: "Check out online where a Buy button is shown, or send a request and we reply with a payment link.",
    faq: "Open the template you want. If it has a Buy button, check out online. Otherwise press “Request this template” and we reply with a payment link, then send the download.",
  };
}

function getFaqs(buyingCopy) {
  return [
    {
      question: "What is in the download?",
      answer:
        "Every page of the template as HTML, the compiled CSS and its Tailwind source, plain JavaScript, self-hosted fonts and placeholder images, plus an HTML documentation file, credits and a changelog.",
    },
    {
      question: "Are the photos from the demo included?",
      answer:
        "No. The demos use photographs from Unsplash and Pexels, credited in each package. The download ships neutral placeholders at the same sizes, so you can drop in your own photos.",
    },
    {
      question: "Do I need coding skills or a build step?",
      answer:
        "No build step is needed to launch: the compiled CSS is included, so you can edit the HTML and upload the files to any static host. If you change Tailwind classes, one documented command rebuilds the stylesheet.",
    },
    {
      question: "Do the forms send emails?",
      answer:
        "The forms check every field in the browser and show clear error and success states. To receive submissions, connect a form service of your choice; the documentation explains how.",
    },
    {
      question: "Can you customise a template for me?",
      answer:
        "Yes. We can add your branding, copy and photos, connect the forms, set up your domain and hosting, and handle SEO basics and analytics, then hand over a finished website.",
    },
    {
      question: "How do I buy a template?",
      answer: buyingCopy.faq,
    },
  ];
}

export default function TemplatesPage() {
  const templates = getMarketingTemplates();
  const pageTotal = getMarketingTemplatePageTotal();
  const lowestPrice = getLowestMarketingTemplatePrice();
  const samePrice = templates.every((template) => template.priceUsd === lowestPrice);
  const buyingCopy = getBuyingCopy(templates);
  // With an odd number of templates, the first (newest) spans the grid so the
  // two-column rows below it stay even.
  const hasFeatured = templates.length % 2 === 1;
  const faqs = getFaqs(buyingCopy);

  const stats = [
    { label: "Templates", value: padCount(templates.length) },
    { label: "Pages designed", value: padCount(pageTotal) },
    { label: samePrice ? "Per template" : "Starting at", value: `$${lowestPrice}` },
  ];

  const steps = [
    {
      title: "Explore",
      text: "Try the live demo and tour every page on desktop and mobile before you decide.",
    },
    { title: "Buy", text: buyingCopy.step },
    {
      title: "Launch",
      text: "Upload the files to any static host yourself, or let our team customise and launch it for you.",
    },
  ];

  const structuredData = [
    getMarketingBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Templates", path: "/templates" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Website Templates by Digital Corvids",
      url: marketingAbsoluteUrl("/templates"),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: templates.map((template, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${template.name} — ${template.title}`,
          url: marketingAbsoluteUrl(template.path),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <main className="bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(structuredData) }}
      />

      <section className="border-b border-white/10 px-[var(--site-gutter)] pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
        <div className="mx-auto max-w-[var(--site-content)]">
          <div className="grid gap-8 lg:grid-cols-[0.98fr_0.62fr] lg:items-end">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30]">
                Templates / Ready-Made Websites
              </p>
              <h1 className="mt-5 max-w-4xl font-suifak text-[clamp(3.1rem,7.2vw,6.4rem)] uppercase leading-[0.86]">
                Website
                <br />
                Templates
              </h1>
            </div>

            <div className="max-w-xl border-t border-white/15 pt-6 lg:justify-self-end">
              <p className="text-base leading-7 text-gray-300 sm:text-lg">
                Launch-ready websites for academies, restaurants, estate agencies, clinics and law firms, from the
                Digital Corvids team. Try each live demo, then buy a template or let us set it up for you.
              </p>
              <dl className="mt-7 grid grid-cols-3 border-y border-white/10">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-r border-white/10 py-4 pr-4 last:border-r-0 last:pr-0 [&:not(:first-child)]:pl-4"
                  >
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">{stat.label}</dt>
                    <dd className="mt-2 text-2xl font-bold tracking-[0.06em] text-white">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#templates"
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white ${focusRing}`}
                >
                  See Templates
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/contact?intent=customise#contact-form"
                  prefetch={false}
                  data-template-cta="customise"
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] ${focusRing}`}
                >
                  Custom Setup
                </Link>
              </div>
            </div>
          </div>

          <ul className="mt-10 grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {storePrinciples.map((principle) => (
              <li
                key={principle}
                className="flex min-h-14 items-center gap-3 border-b border-white/10 py-3 sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0"
              >
                <Check className="h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">{principle}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="templates" className="scroll-mt-6 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
                Catalogue
              </p>
              <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Pick A Starting Point</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-gray-400">
              Press “Try live demo” to click around the real site right in its box.
              <span className="hidden lg:inline"> Hover a preview to scroll its home page.</span> Open a template
              to tour every page on desktop and mobile.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {templates.map((template, index) => (
              <TemplateCard
                key={template.slug}
                template={template}
                featured={hasFeatured && index === 0}
                priority={hasFeatured ? index === 0 : index < 2}
              />
            ))}
          </div>

          {MARKETING_TEMPLATES_IN_DESIGN.map((upcoming) => (
            <div
              key={upcoming.name}
              className="mt-5 flex flex-col gap-2 rounded-lg border border-dashed border-white/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Next Up · In Design</p>
              <p className="text-lg font-bold uppercase tracking-[0.04em]">
                {upcoming.name}
                <span className="text-white/55"> · {upcoming.niche} template</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-[var(--site-content)] gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
              In Every Download
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-bold uppercase leading-[0.96] sm:text-5xl lg:text-6xl">
              More than a pretty home page.
            </h2>
          </div>

          <div className="grid border-t border-white/15 sm:grid-cols-2">
            {MARKETING_TEMPLATE_INCLUDES.map((item, index) => (
              <article
                key={item.title}
                className="border-b border-white/15 py-6 sm:min-h-48 sm:px-6 sm:odd:border-r sm:odd:pl-0"
              >
                <p className="text-xs font-bold tracking-[0.24em] text-white/45">{padCount(index + 1)}</p>
                <h3 className="mt-4 text-xl font-bold uppercase leading-tight">{item.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-gray-300">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-[var(--site-gutter)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[var(--site-content)]">
          <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">
            How It Works
          </p>
          <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Three Steps To Live</h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="bg-black p-6 sm:p-8">
                <p className="font-suifak text-5xl leading-none text-[#F5EE30]">{padCount(index + 1)}</p>
                <h3 className="mt-6 text-2xl font-bold uppercase">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <TemplateCustomiseBand />

      <section className="px-[var(--site-gutter)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[var(--site-content)]">
          <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">FAQ</p>
          <h2 className="mt-4 text-4xl font-bold uppercase leading-none sm:text-5xl">Before You Buy</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {faqs.map((item) => (
              <div key={item.question} className="border border-white/10 bg-white/[0.03] p-6">
                <h3 className="mb-3 text-lg font-bold uppercase text-white">{item.question}</h3>
                <p className="text-sm leading-relaxed text-gray-300 md:text-base">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
