import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FilePenLine,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Keyword And Topic Research",
    description:
      "Turn rough ideas into focused blog angles, keyword clusters, and briefs before drafting begins.",
  },
  {
    icon: FilePenLine,
    title: "Structured Draft Creation",
    description:
      "Generate outlines, sections, FAQs, meta ideas, and polished first drafts in a repeatable editorial format.",
  },
  {
    icon: ShieldCheck,
    title: "SEO And Review Guardrails",
    description:
      "Check readability, intent coverage, and editorial approval status before anything reaches publishing.",
  },
  {
    icon: CalendarClock,
    title: "Scheduling And Publishing Flow",
    description:
      "Plan content calendars, prepare publishing queues, and connect blog output to a cleaner DC workflow.",
  },
];

const workflowSteps = [
  {
    id: "01",
    title: "Plan The Brief",
    description:
      "Choose the topic, audience, voice, and keywords so every blog starts with clear direction.",
  },
  {
    id: "02",
    title: "Generate The Draft",
    description:
      "Build a usable post draft with headings, core talking points, FAQs, and CTA-ready structure.",
  },
  {
    id: "03",
    title: "Review And Improve",
    description:
      "Refine messaging, check SEO gaps, and keep approval decisions inside one cleaner editorial flow.",
  },
  {
    id: "04",
    title: "Queue For Publishing",
    description:
      "Save as draft, schedule for later, or prepare the post for review and publishing from one workflow.",
  },
];

const useCases = [
  {
    title: "For Digital Corvids",
    description:
      "Use the same system to power DC's own blog pipeline, from topic planning to scheduled draft generation.",
  },
  {
    title: "For Agency Clients",
    description:
      "Offer faster, more organized blog production without juggling scattered prompts, docs, and manual handoffs.",
  },
];

export default function AIBloggerSection() {
  return (
    <section className="relative overflow-hidden bg-black py-16 text-white sm:py-20 lg:py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <div className="h-2.5 w-2.5 rounded-sm bg-[#F5EE30]"></div>
          <span className="font-glacial-bold text-sm uppercase tracking-[0.28em] text-white sm:text-base">
            Content Automation In DC
          </span>
        </div>

        <div className="mb-16 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F5EE30]/30 bg-[#F5EE30]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#F5EE30] sm:text-sm">
              <Sparkles className="h-4 w-4" />
              AI Blogger
            </div>

            <h1 className="text-4xl font-bold uppercase leading-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Build Smarter
              <br />
              <span className="text-[#F5EE30]">Blogs With AI</span>
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg lg:text-xl">
              AI Blogger is the Digital Corvids workflow for planning, generating,
              optimizing, reviewing, and scheduling SEO-focused blog content in
              one place. It supports the DC publishing system and client-ready
              agency content operations from the same foundation.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/get-started?mode=auth&source=ai-blogger#signup"
                className="group inline-flex items-center gap-2 rounded-full bg-[#F5EE30] px-6 py-3 text-sm font-bold uppercase text-black transition-all duration-300 hover:bg-yellow-300 hover:shadow-[0_0_30px_rgba(245,238,48,0.3)] sm:px-8 sm:py-4 sm:text-base"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-bold uppercase text-white transition-all duration-300 hover:border-[#F5EE30] hover:text-[#F5EE30] sm:px-8 sm:py-4 sm:text-base"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-[#F5EE30]/15 via-transparent to-[#F5EE30]/5 blur-2xl"></div>
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-[#F5EE30]/10 sm:p-7">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-200">
                  SEO Ready
                </span>
                <span className="rounded-full border border-[#F5EE30]/25 bg-[#F5EE30]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5EE30]">
                  Draft Workflow
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-200">
                  Agency Friendly
                </span>
              </div>

              <div className="relative rounded-[24px] border border-white/10 bg-black/50 p-4">
                <Image
                  src="/ai-blogger.svg"
                  alt="AI Blogger illustration"
                  width={640}
                  height={640}
                  className="mx-auto h-auto w-full max-w-md"
                  priority
                />

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5EE30]">
                      Research Layer
                    </p>
                    <p className="text-sm leading-relaxed text-gray-300">
                      Turn ideas into clearer briefs before drafting begins.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#F5EE30]">
                      Editorial Flow
                    </p>
                    <p className="text-sm leading-relaxed text-gray-300">
                      Keep draft, review, and publishing status in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-500 hover:border-[#F5EE30]/30 hover:bg-[#F5EE30]/[0.03]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5EE30]/10 transition-colors duration-300 group-hover:bg-[#F5EE30]/20">
                  <Icon className="h-6 w-6 text-[#F5EE30]" />
                </div>
                <h2 className="mb-3 text-lg font-bold uppercase tracking-wide transition-colors duration-300 group-hover:text-[#F5EE30] sm:text-xl">
                  {feature.title}
                </h2>
                <p className="text-sm leading-relaxed text-gray-400 transition-colors duration-300 group-hover:text-gray-300">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#F5EE30]">
                How It Works
              </p>
              <h2 className="text-3xl font-bold uppercase sm:text-4xl">
                A Cleaner Content Workflow
              </h2>
            </div>

            <div className="space-y-4">
              {workflowSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex gap-4 rounded-2xl border border-white/8 bg-black/40 p-4 sm:p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5EE30] text-sm font-bold text-black">
                    {step.id}
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-bold uppercase tracking-wide">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-300 sm:text-base">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent p-6 sm:p-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#F5EE30]">
                Why It Matters
              </p>
              <h2 className="mb-4 text-3xl font-bold uppercase sm:text-4xl">
                Built For Real Content Ops
              </h2>
              <p className="text-sm leading-relaxed text-gray-300 sm:text-base">
                The goal is not just to generate text. The goal is to give DC a
                production-ready blog workflow that is easier to review, easier
                to scale, and easier to deliver as a repeatable service.
              </p>
            </div>

            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="mb-3 text-xl font-bold uppercase tracking-wide text-[#F5EE30]">
                  {useCase.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-300 sm:text-base">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
