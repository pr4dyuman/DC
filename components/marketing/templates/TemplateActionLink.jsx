import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const variants = {
  primary: `inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F5EE30] px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white ${focusRing}`,
  secondary: `inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#F5EE30] hover:text-[#F5EE30] ${focusRing}`,
  dark: `inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black`,
  text: `inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F5EE30] transition-colors hover:text-white ${focusRing}`,
};

// A template call to action. `action` and `templateSlug` become data
// attributes that MarketingConversionTracker reports as template_cta_click.
export default function TemplateActionLink({
  href,
  external = false,
  action,
  templateSlug,
  variant = "primary",
  className = "",
  children,
}) {
  const classes = `${variants[variant] || variants.primary} ${className}`;
  const trackingProps = {
    "data-template-cta": action,
    "data-template-slug": templateSlug || undefined,
  };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...trackingProps}>
        {children}
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} className={classes} {...trackingProps}>
      {children}
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
