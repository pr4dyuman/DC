import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

// The page header used across the marketing pages, in the Portfolio and
// Templates style: a yellow eyebrow, a large title, a short intro and the
// page's main buttons. With `image`, the text sits beside an illustration
// (service pages). `breadcrumbs` shows where the page sits in the site.
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const titleSizes = {
  lg: "text-[clamp(3.1rem,7.2vw,6.4rem)] leading-[0.86]",
  md: "text-[clamp(2.6rem,5.4vw,5rem)] leading-[0.9]",
};

function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.href || item.name} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-white/80">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.href} prefetch={false} className={`transition-colors hover:text-[#F5EE30] ${focusRing}`}>
                    {item.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Stats({ stats }) {
  return (
    <dl className="mt-7 grid grid-cols-3 border-y border-white/10">
      {stats.map((stat) => (
        <div key={stat.label} className="border-r border-white/10 py-4 pr-4 last:border-r-0 last:pr-0 [&:not(:first-child)]:pl-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">{stat.label}</dt>
          <dd className="m-0 mt-2 text-2xl font-bold tracking-[0.06em] text-white">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Checklist({ items }) {
  return (
    <ul className="m-0 mt-10 grid list-none border-y border-white/10 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <li
          key={item}
          className="flex min-h-14 items-center gap-3 border-b border-white/10 py-3 sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0"
        >
          <Check className="h-4 w-4 shrink-0 text-[#F5EE30]" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PageHero({
  eyebrow,
  title,
  titleSize = "lg",
  intro,
  actions,
  stats,
  checklist,
  breadcrumbs,
  image,
}) {
  const heading = (
    <>
      <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30]">{eyebrow}</p>
      <h1 className={`mt-5 max-w-4xl font-suifak uppercase ${titleSizes[titleSize] || titleSizes.lg}`}>{title}</h1>
    </>
  );
  const introBlock = intro ? <div className="text-base leading-7 text-gray-300 sm:text-lg">{intro}</div> : null;
  const actionsBlock = actions ? <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null;

  return (
    <section className="border-b border-white/10 px-[var(--site-gutter)] pb-10 pt-8 sm:pb-12 sm:pt-10 lg:pb-14 lg:pt-12">
      <div className="mx-auto max-w-[var(--site-content)]">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}

        {image ? (
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              {heading}
              <div className="mt-6 max-w-2xl">{introBlock}</div>
              {stats ? <Stats stats={stats} /> : null}
              {actionsBlock}
            </div>
            {/* Decorative, so phones skip it and reach the content sooner. */}
            <div className="hidden justify-center sm:flex lg:justify-end">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width || 420}
                height={image.height || 420}
                priority
                sizes="(min-width: 1024px) 420px, (min-width: 640px) 320px, 240px"
                className="h-auto w-60 sm:w-80 lg:w-[26rem]"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[0.98fr_0.62fr] lg:items-end">
            <div>{heading}</div>
            <div className="max-w-xl border-t border-white/15 pt-6 lg:justify-self-end">
              {introBlock}
              {stats ? <Stats stats={stats} /> : null}
              {actionsBlock}
            </div>
          </div>
        )}

        {checklist ? <Checklist items={checklist} /> : null}
      </div>
    </section>
  );
}
