import Link from "next/link";
import { Play } from "lucide-react";

import TemplateScrollPreview from "./TemplateScrollPreview";

// Compact template card for the portfolio page's templates rail. The title
// link covers the tile; the live demo button sits above it.
export default function TemplateTile({ template }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] transition-colors hover:border-white/25 focus-within:border-white/25">
      <div className="border-b border-white/10 bg-[#080808] p-1.5">
        <div className="relative overflow-hidden rounded-[4px] border border-white/10 transition-colors group-hover:border-[#F5EE30]/45">
          <TemplateScrollPreview
            image={template.card}
            alt={`${template.name} ${template.niche.toLowerCase()} template home page`}
            sizes="(min-width: 1024px) 18rem, 70vw"
            className="relative aspect-[4/5]"
          />
          {template.demoUrl ? (
            <Link
              href={`${template.path}/demo`}
              prefetch={false}
              data-template-cta="demo"
              data-template-slug={template.slug}
              className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm transition-colors hover:border-[#F5EE30] hover:bg-[#F5EE30] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5EE30]"
            >
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              Live demo
              <span className="sr-only"> of {template.name}</span>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="flex items-start gap-2 text-[10px] font-bold uppercase leading-4 tracking-[0.2em] text-[#F5EE30]">
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full ring-1 ring-white/30"
            style={{ backgroundColor: template.accent }}
            aria-hidden="true"
          />
          {template.niche}
        </p>
        <h3 className="mt-3 text-xl font-bold uppercase leading-none sm:text-2xl">
          <Link
            href={template.path}
            prefetch={false}
            className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[#F5EE30]"
          >
            {template.name}
          </Link>
        </h3>
        <p className="mt-auto pt-4 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
          {template.pageCount} pages · {template.priceLabel}
        </p>
      </div>
    </article>
  );
}
