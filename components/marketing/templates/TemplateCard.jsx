import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import TemplateActionLink from "./TemplateActionLink";
import TemplateLivePreview from "./TemplateLivePreview";

// One template in a grid. The title link stretches over the whole card, so the
// card opens the template page; the live demo controls sit above it.
// `featured` turns the card into a wide row (preview beside the text) from lg.
export default function TemplateCard({
  template,
  headingLevel = "h3",
  priority = false,
  featured = false,
  sizes = "(min-width: 1024px) 34rem, (min-width: 640px) 90vw, 100vw",
}) {
  const Heading = headingLevel;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] transition-colors hover:border-white/25 focus-within:border-white/25 ${
        featured ? "lg:col-span-2 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]" : ""
      }`}
    >
      <div
        className={`border-b border-white/10 bg-[#080808] p-2 ${
          featured ? "lg:flex lg:flex-col lg:border-b-0 lg:border-r lg:p-3" : ""
        }`}
      >
        <TemplateLivePreview
          name={template.name}
          slug={template.slug}
          demoUrl={template.demoUrl}
          label={`${template.name} · ${template.niche}`}
          status={`${template.pageCount} pages`}
          image={template.card}
          alt={`${template.name} ${template.niche.toLowerCase()} template home page`}
          sizes={featured ? "(min-width: 1024px) 58vw, (min-width: 640px) 90vw, 100vw" : sizes}
          priority={priority}
          // The wide card's preview fills the height of the text beside it.
          className={featured ? "lg:flex lg:flex-1 lg:flex-col" : ""}
          aspectClass={featured ? "aspect-[16/10] lg:aspect-auto lg:min-h-[26rem] lg:flex-1" : undefined}
        />
      </div>

      <div className={`flex flex-1 flex-col p-5 sm:p-7 ${featured ? "lg:p-9 xl:p-10" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.22em] text-[#F5EE30]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/30"
              style={{ backgroundColor: template.accent }}
              aria-hidden="true"
            />
            {template.niche}
          </p>
          <p className="shrink-0 text-sm font-bold tracking-[0.12em] text-white">
            {template.priceLabel}
            <span className="sr-only"> US dollars</span>
          </p>
        </div>

        <Heading
          className={`mt-4 text-3xl font-bold uppercase leading-none sm:text-4xl ${featured ? "lg:mt-6 xl:text-5xl" : ""}`}
        >
          <Link
            href={template.path}
            prefetch={false}
            className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[#F5EE30]"
          >
            {template.name}
          </Link>
        </Heading>

        <p className="mt-4 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{template.summary}</p>

        <dl className="mt-6 grid grid-cols-2 border-y border-white/10">
          <div className="border-r border-white/10 py-4 pr-4">
            <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Pages</dt>
            <dd className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-white/80">
              {template.pageCount} complete pages
            </dd>
          </div>
          <div className="py-4 pl-4">
            <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Built with</dt>
            <dd className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-white/80">
              {template.stack.slice(0, 2).join(" + ")}
            </dd>
          </div>
        </dl>

        {featured ? (
          <ul className="mt-6 hidden space-y-2.5 lg:block" aria-label={`${template.name} highlights`}>
            {template.signature.map((item) => (
              <li key={item.title} className="flex items-start gap-3 text-sm font-bold uppercase leading-6 tracking-[0.1em] text-white/85">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                {item.title}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-7 gap-y-3 pt-7">
          <span
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors group-hover:text-white"
            aria-hidden="true"
          >
            View template
            <ArrowRight className="h-4 w-4" />
          </span>
          {template.demoUrl ? (
            <TemplateActionLink
              href={`${template.path}/demo`}
              action="demo"
              templateSlug={template.slug}
              variant="text"
              className="relative z-10 text-white/70"
            >
              Full-screen demo
              <span className="sr-only"> of {template.name}</span>
            </TemplateActionLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}
