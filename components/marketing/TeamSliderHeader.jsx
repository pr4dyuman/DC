import Link from "next/link";

import { SectionIntro } from "@/components/marketing/ui/PageSection";

// The team section's heading, shared by the slider and its loading placeholder.
export function TeamSliderHeader() {
  return (
    <div className="mx-auto mb-10 max-w-[var(--site-frame)] px-[var(--site-gutter)] sm:mb-12">
      <SectionIntro id="team-heading" eyebrow="Meet Our Team" title="The Minds Behind" accent="Your Success" accentTone="yellow">
        Our diverse team of experts brings years of experience in digital marketing,{" "}
        <Link
          href="/services/web-development"
          prefetch={false}
          className="text-[#F5EE30] underline underline-offset-4 hover:text-white"
        >
          web development
        </Link>
        , and creative strategy to every project.
      </SectionIntro>
    </div>
  );
}
