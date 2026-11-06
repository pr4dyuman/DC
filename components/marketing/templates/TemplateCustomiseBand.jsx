import { Check } from "lucide-react";

import TemplateActionLink from "./TemplateActionLink";

const setupItems = [
  "Your logo, colours, copy and photos",
  "Booking and contact forms connected",
  "Domain, hosting and launch checks",
  "SEO basics and analytics from day one",
];

// Yellow call to action that turns a template visitor into a service lead.
export default function TemplateCustomiseBand({ template }) {
  const href = template ? template.customiseHref : "/contact?intent=customise#contact-form";

  return (
    <section className="border-y border-white/10 bg-[#F5EE30] px-6 py-14 text-black sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div>
          <p className="font-glacial-bold text-xs uppercase tracking-[0.35em] text-black/60 sm:text-sm">
            Done For You
          </p>
          <h2 className="mt-4 max-w-2xl text-4xl font-bold uppercase leading-[0.96] sm:text-5xl lg:text-6xl">
            {template ? `Want ${template.name} live, with your brand?` : "Want a template live, with your brand?"}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-black/75">
            Our team can set {template ? "it" : "any template"} up for you and hand over a finished website, so you
            skip the editing and go straight to launch.
          </p>
        </div>

        <div>
          <ul className="grid border-t border-black/20 sm:grid-cols-2">
            {setupItems.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 border-b border-black/20 py-4 text-sm font-bold uppercase leading-6 tracking-[0.08em] sm:odd:border-r sm:odd:pr-4 sm:even:pl-4"
              >
                <Check className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <TemplateActionLink
            href={href}
            action="customise"
            templateSlug={template?.slug}
            variant="dark"
            className="mt-8 w-full sm:w-auto"
          >
            Get It Customised
          </TemplateActionLink>
        </div>
      </div>
    </section>
  );
}
