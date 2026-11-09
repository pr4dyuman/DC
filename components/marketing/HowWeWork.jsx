import Image from "next/image";

import { PageSection, SectionIntro } from "@/components/marketing/ui/PageSection";

// How working with us goes, in three steps (homepage and /services). Each
// service page has its own, more detailed process.
const steps = [
  {
    title: "Free plan",
    text: "Tell us about your business and goals. We reply within 24 hours and send a free plan for the channels that fit.",
  },
  {
    title: "Launch",
    text: "Once you approve the plan, we set up tracking, build or fix what is needed, and start the work.",
  },
  {
    title: "Report and improve",
    text: "Clear reports on traffic, leads and sales, and what we will improve next.",
  },
];

function padCount(value) {
  return String(value).padStart(2, "0");
}

// The yellow band (`tone="yellow"`), or dark with the steps joined by a dashed
// flight path that ends in the paper plane, like the homepage hero.
export default function HowWeWork({ tone = "yellow" }) {
  if (tone === "yellow") {
    return (
      <PageSection labelledBy="how-we-work" tone="yellow">
        <SectionIntro id="how-we-work" eyebrow="How We Work" title="Three Steps" accent="To Results" tone="yellow" />
        <ol className="m-0 mt-8 grid list-none gap-px overflow-hidden border border-black/15 bg-black/15 p-0 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-[#F5EE30] p-5 sm:p-8">
              {/* On phones the number sits beside the step name, to keep the list short. */}
              <div className="flex items-center gap-4 sm:block">
                <p className="m-0 font-suifak text-3xl leading-none sm:text-5xl">{padCount(index + 1)}</p>
                <h3 className="m-0 text-xl font-bold uppercase sm:mt-6 sm:text-2xl">{step.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-black/75 sm:text-base sm:leading-7">{step.text}</p>
            </li>
          ))}
        </ol>
      </PageSection>
    );
  }

  return (
    <PageSection labelledBy="how-we-work">
      <SectionIntro id="how-we-work" eyebrow="How We Work" title="Three Steps" accent="To Results" accentTone="yellow" />
      <ol className="relative m-0 mt-12 grid list-none gap-0 p-0 md:grid-cols-3 md:gap-8">
        {/* The flight path between the steps on wide screens */}
        <li aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-8 hidden md:block">
          <span className="block border-t-2 border-dashed border-[#F5EE30]/60" />
          <Image
            src="/airoplane.svg"
            alt=""
            width={20}
            height={20}
            className="absolute -right-8 -top-[11px] h-5 w-5"
          />
        </li>
        {steps.map((step, index) => (
          <li key={step.title} className="relative grid grid-cols-[4rem_1fr] gap-x-5 pb-10 last:pb-0 md:block md:pb-0">
            {/* On phones a dashed line runs down from each number to the next. */}
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-8 top-16 border-l-2 border-dashed border-[#F5EE30]/60 md:hidden"
              />
            ) : null}
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#F5EE30] bg-black font-suifak text-2xl leading-none text-[#F5EE30]">
              {padCount(index + 1)}
            </span>
            <div className="pt-3 md:pt-0">
              <h3 className="m-0 text-xl font-bold uppercase sm:text-2xl md:mt-7">{step.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </PageSection>
  );
}
