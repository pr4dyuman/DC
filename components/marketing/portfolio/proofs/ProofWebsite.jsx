import Image from "next/image";

import BrowserFrame from "@/components/marketing/BrowserFrame";

import PortfolioVideo from "../PortfolioVideo";

// Websites and web apps: the live walkthrough video in a browser frame, or
// just its poster where a page already shows several cards (service pages).
export default function ProofWebsite({ study, proof, media = "video", size = "card", priority = false }) {
  return (
    <BrowserFrame label={proof.urlLabel} status={proof.status}>
      <div className="bg-black p-1.5 sm:p-2">
        {media === "video" ? (
          <PortfolioVideo
            src={proof.video}
            poster={proof.poster.src}
            label={`${study.client} walkthrough`}
            className="aspect-[16/10] w-full rounded-sm bg-black object-contain"
          />
        ) : (
          <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-black">
            <Image
              src={proof.poster.src}
              alt={proof.poster.alt}
              fill
              priority={priority}
              sizes={size === "large" ? "(min-width: 1280px) 76rem, 100vw" : "(min-width: 1024px) 34rem, 100vw"}
              className="object-cover object-top"
            />
          </div>
        )}
      </div>
    </BrowserFrame>
  );
}
