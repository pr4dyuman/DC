import Image from "next/image";

// Case study images. Files in /public go through Next's image optimiser;
// images uploaded in Super Admin (Vercel Blob or Azure links) load directly
// from their storage, so no outside host has to be allowed for the optimiser.
export default function PortfolioImage({ src, alt, unoptimized, ...props }) {
  const remote = typeof src === "string" && /^https?:\/\//i.test(src);
  return <Image src={src} alt={alt} unoptimized={unoptimized || remote} {...props} />;
}
