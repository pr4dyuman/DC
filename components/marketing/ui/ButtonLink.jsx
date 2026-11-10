import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

// The pill buttons used across the marketing pages (the Portfolio and
// Templates style). `external` opens in a new tab and says so.
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] transition-colors";

const variants = {
  primary: `${base} bg-[#F5EE30] text-black hover:bg-white ${focusRing}`,
  secondary: `${base} border border-white/20 text-white hover:border-[#F5EE30] hover:text-[#F5EE30] ${focusRing}`,
  dark: `${base} bg-black text-[#F5EE30] hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black`,
  light: `${base} bg-white text-black hover:bg-[#F5EE30] ${focusRing}`,
  text: `inline-flex items-center gap-2 font-glacial-bold text-sm uppercase tracking-widest text-[#F5EE30] transition-colors hover:text-white ${focusRing}`,
};

export default function ButtonLink({ href, variant = "primary", external = false, arrow = false, className = "", children }) {
  const classes = `${variants[variant] || variants.primary} ${className}`;

  // Phone and email links open the phone or mail app, not a page.
  if (/^(tel|mailto):/.test(href)) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} className={classes}>
      {children}
      {arrow ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </Link>
  );
}
