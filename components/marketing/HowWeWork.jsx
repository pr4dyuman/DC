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

export default function HowWeWork() {
  return (
    <PageSection labelledBy="how-we-work" tone="yellow">
      <SectionIntro id="how-we-work" eyebrow="How We Work" title="Three Steps To Results" tone="yellow" />
      <ol className="m-0 mt-8 grid list-none gap-px overflow-hidden border border-black/15 bg-black/15 p-0 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="bg-[#F5EE30] p-5 sm:p-8">
            {/* On phones the number sits beside the step name, to keep the list short. */}
            <div className="flex items-center gap-4 sm:block">
              <p className="m-0 font-suifak text-3xl leading-none sm:text-5xl">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="m-0 text-xl font-bold uppercase sm:mt-6 sm:text-2xl">{step.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-black/75 sm:text-base sm:leading-7">{step.text}</p>
          </li>
        ))}
      </ol>
    </PageSection>
  );
}
