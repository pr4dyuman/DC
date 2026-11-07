import Link from "next/link";

import TemplateScrollPreview from "./TemplateScrollPreview";

// Compact template card for a four-up row, used on the portfolio page.
export default function TemplateTile({ template }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] transition-colors hover:border-white/25 focus-within:border-white/25">
      <div className="border-b border-white/10 bg-[#080808] p-1.5">
        <div className="overflow-hidden rounded-[4px] border border-white/10 transition-colors group-hover:border-[#F5EE30]/45">
          <TemplateScrollPreview
            image={template.card}
            alt={`${template.name} ${template.niche.toLowerCase()} template home page`}
            sizes="(min-width: 1024px) 17rem, 50vw"
            className="relative aspect-[4/5]"
          />
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
