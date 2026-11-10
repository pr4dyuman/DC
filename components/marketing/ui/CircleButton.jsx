import Link from "next/link";

// The site's round white button (as on the contact form and the original
// homepage): it fills with yellow on hover or keyboard focus.
export default function CircleButton({ href, className = "", children }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`group relative inline-flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-4 text-center font-glacial-bold text-sm uppercase leading-tight tracking-[0.06em] text-black transition-transform duration-500 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] sm:h-36 sm:w-36 ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 scale-0 rounded-full bg-[#F5EE30] transition-transform duration-500 group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:transition-none"
      />
      <span className="relative">{children}</span>
    </Link>
  );
}
