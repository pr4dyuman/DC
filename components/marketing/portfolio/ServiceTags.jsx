import Link from "next/link";

import { getPortfolioService } from "@/lib/marketing-portfolio";

// The services a case study covers; the first (main) one in yellow.
export default function ServiceTags({ services, linked = false, className = "" }) {
  return (
    <ul className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`} aria-label="Services">
      {services.map((id, index) => {
        const service = getPortfolioService(id);
        const tone = index === 0 ? "text-[#F5EE30]" : "text-white/55";
        const classes = `text-xs font-bold uppercase tracking-[0.22em] ${tone}`;

        return (
          <li key={id} className="flex items-center gap-3">
            {index > 0 ? <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden="true" /> : null}
            {linked && service.href ? (
              <Link
                href={service.href}
                prefetch={false}
                className={`${classes} underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]`}
              >
                {service.label}
              </Link>
            ) : (
              <span className={classes}>{service.label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
